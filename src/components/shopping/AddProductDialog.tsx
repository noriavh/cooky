import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useCreateShoppingProduct, useUpdateShoppingProduct, useShoppingProducts } from '@/hooks/useShoppingProducts';
import { useAisles } from '@/hooks/useShoppingList';
import { useUnits } from '@/hooks/useRecipes';
import { supabase } from '@/integrations/supabase/client';

const formSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  unit_id: z.string().optional(),
  aisle_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string;
  isGlobal?: boolean;
  initialName?: string;
  onProductCreated?: (product: { id: string; name: string; aisle_id: string | null; unit_id: string | null }) => void;
}

const AddProductDialog = ({ open, onOpenChange, productId, isGlobal = false, initialName = '', onProductCreated }: AddProductDialogProps) => {
  const { data: aisles } = useAisles();
  const { data: units } = useUnits();
  const { data: products } = useShoppingProducts();
  const createProduct = useCreateShoppingProduct();
  const updateProduct = useUpdateShoppingProduct();

  const isEditing = !!productId;
  const existingProduct = products?.find(p => p.id === productId);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialName,
      unit_id: '',
      aisle_id: '',
    },
  });

  useEffect(() => {
    if (existingProduct && open) {
      form.reset({
        name: existingProduct.name,
        unit_id: existingProduct.unit_id || '',
        aisle_id: existingProduct.aisle_id || '',
      });
    } else if (!productId && open) {
      form.reset({
        name: initialName,
        unit_id: '',
        aisle_id: '',
      });
    }
  }, [existingProduct, productId, open, form, initialName]);

  const onSubmit = async (formData: FormData) => {
    try {
      if (isEditing && productId) {
        await updateProduct.mutateAsync({
          id: productId,
          name: formData.name,
          unit_id: formData.unit_id && formData.unit_id !== 'none' ? formData.unit_id : null,
          aisle_id: formData.aisle_id && formData.aisle_id !== 'none' ? formData.aisle_id : null,
        });
        toast.success('Produit mis à jour');
      } else if (isGlobal) {
        // Create global product directly (admin only)
        const { data: createdProduct, error } = await supabase
          .from('shopping_products')
          .insert({
            name: formData.name,
            unit_id: formData.unit_id && formData.unit_id !== 'none' ? formData.unit_id : null,
            aisle_id: formData.aisle_id && formData.aisle_id !== 'none' ? formData.aisle_id : null,
            user_id: null,
            family_id: null,
          })
          .select()
          .single();
        if (error) throw error;
        toast.success('Produit global créé');
        if (onProductCreated && createdProduct) {
          onProductCreated({
            id: createdProduct.id,
            name: createdProduct.name,
            aisle_id: createdProduct.aisle_id,
            unit_id: createdProduct.unit_id,
          });
        }
      } else {
        const product = await createProduct.mutateAsync({
          name: formData.name,
          unit_id: formData.unit_id && formData.unit_id !== 'none' ? formData.unit_id : null,
          aisle_id: formData.aisle_id && formData.aisle_id !== 'none' ? formData.aisle_id : null,
        });
        toast.success('Produit créé');
        if (onProductCreated && product) {
          onProductCreated({
            id: product.id,
            name: product.name,
            aisle_id: product.aisle_id,
            unit_id: product.unit_id,
          });
        }
      }
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Un produit avec ce nom existe déjà');
      } else {
        toast.error('Erreur lors de la sauvegarde');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier le produit' : isGlobal ? 'Nouveau produit global' : 'Nouveau produit'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Tomates cerises" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="aisle_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rayon</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un rayon" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {aisles?.map((aisle) => (
                        <SelectItem key={aisle.id} value={aisle.id}>
                          {aisle.icon} {aisle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unit_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unité par défaut</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une unité" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {units?.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.abbreviation || unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                {isEditing ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductDialog;
