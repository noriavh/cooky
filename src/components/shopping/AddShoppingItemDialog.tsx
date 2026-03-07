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
import { useAddShoppingListItem, useAisles } from '@/hooks/useShoppingList';
import { useGetOrCreateProduct } from '@/hooks/useShoppingProducts';
import { useUnits } from '@/hooks/useRecipes';

const formSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  quantity: z.string().optional(),
  unit_id: z.string().optional(),
  aisle_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddShoppingItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName?: string;
}

const AddShoppingItemDialog = ({ open, onOpenChange, defaultName = '' }: AddShoppingItemDialogProps) => {
  const { data: aisles } = useAisles();
  const { data: units } = useUnits();
  const addItem = useAddShoppingListItem();
  const getOrCreateProduct = useGetOrCreateProduct();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultName,
      quantity: '',
      unit_id: '',
      aisle_id: '',
    },
  });

  // Reset form when dialog opens with default name
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && defaultName) {
      form.setValue('name', defaultName);
    }
    if (!isOpen) {
      form.reset();
    }
    onOpenChange(isOpen);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const unitId = data.unit_id && data.unit_id !== 'none' ? data.unit_id : null;
      const aisleId = data.aisle_id && data.aisle_id !== 'none' ? data.aisle_id : null;

      // Create or get the product from database
      const product = await getOrCreateProduct.mutateAsync({
        name: data.name,
        unit_id: unitId,
        aisle_id: aisleId,
      });

      // Add item to shopping list with product reference
      await addItem.mutateAsync({
        name: data.name,
        quantity: data.quantity ? parseFloat(data.quantity) : null,
        unit_id: unitId,
        aisle_id: aisleId,
        product_id: product.id,
      });

      toast.success('Élément ajouté');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erreur lors de l'ajout");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un élément</DialogTitle>
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
                    <Input placeholder="Ex: Tomates" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantité</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Ex: 500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unité</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
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
            </div>

            <FormField
              control={form.control}
              name="aisle_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rayon</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
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

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={addItem.isPending}>
                Ajouter
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddShoppingItemDialog;
