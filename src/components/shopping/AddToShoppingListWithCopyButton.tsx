import { useState, useMemo } from 'react';
import { ShoppingCart, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useAddMultipleShoppingListItems, useAisles } from '@/hooks/useShoppingList';
import { useShoppingProducts } from '@/hooks/useShoppingProducts';
import { useAuth } from '@/contexts/AuthContext';
import { useUserFamily } from '@/hooks/useFamilies';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { Ingredient } from '@/hooks/useRecipes';

interface AddToShoppingListWithCopyButtonProps {
  ingredients: Ingredient[];
  servings?: number;
  originalServings?: number;
}

interface LocalProduct {
  ingredientId: string;
  productId: string;
  productName: string;
  aisle_id: string | null;
  unit_id: string | null;
}

const AddToShoppingListWithCopyButton = ({
  ingredients,
  servings = 4,
  originalServings = 4,
}: AddToShoppingListWithCopyButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCopyWarning, setShowCopyWarning] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [localProductsToCopy, setLocalProductsToCopy] = useState<LocalProduct[]>([]);
  const [isCopying, setIsCopying] = useState(false);
  
  const { user } = useAuth();
  const { data: family } = useUserFamily();
  const queryClient = useQueryClient();
  const addItems = useAddMultipleShoppingListItems();
  const { data: aisles } = useAisles();
  const { data: myProducts } = useShoppingProducts();

  const scaleFactor = servings / originalServings;

  // Detect local products from the recipe owner that user doesn't have
  const detectLocalProducts = useMemo(() => {
    if (!ingredients || !myProducts) return [];
    
    const localProducts: LocalProduct[] = [];
    
    for (const ingredient of ingredients) {
      if (!ingredient.product_id || !ingredient.shopping_products) continue;
      
      const product = ingredient.shopping_products;
      
      // Check if this is a local product (has user_id or family_id set)
      // and doesn't belong to current user or their family
      const isOthersLocalProduct = 
        (product.user_id !== null || product.family_id !== null) &&
        product.user_id !== user?.id &&
        (family?.id ? product.family_id !== family.id : true);
      
      if (isOthersLocalProduct) {
        // Check if user already has this product (by name)
        const userHasProduct = myProducts.some(
          p => p.name.toLowerCase() === product.name.toLowerCase()
        );
        
        if (!userHasProduct) {
          localProducts.push({
            ingredientId: ingredient.id,
            productId: product.id,
            productName: product.name,
            aisle_id: product.aisle_id,
            unit_id: product.unit_id,
          });
        }
      }
    }
    
    return localProducts;
  }, [ingredients, myProducts, user?.id, family?.id]);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSelectedIngredients(new Set(ingredients.map((i) => i.id)));
    }
    setIsOpen(open);
  };

  const toggleIngredient = (ingredientId: string) => {
    setSelectedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(ingredientId)) {
        next.delete(ingredientId);
      } else {
        next.add(ingredientId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIngredients(new Set(ingredients.map((i) => i.id)));
  };

  const deselectAll = () => {
    setSelectedIngredients(new Set());
  };

  const getAutresAisleId = (): string | null => {
    return aisles?.find((a) => a.name === 'Autres')?.id ?? null;
  };

  const handleConfirm = async () => {
    const selectedList = ingredients.filter((i) => selectedIngredients.has(i.id));

    if (selectedList.length === 0) {
      toast.error('Aucun ingrédient sélectionné');
      return;
    }

    // Check if any selected ingredients have local products that need to be copied
    const selectedLocalProducts = detectLocalProducts.filter(
      lp => selectedIngredients.has(lp.ingredientId)
    );

    if (selectedLocalProducts.length > 0) {
      setLocalProductsToCopy(selectedLocalProducts);
      setShowCopyWarning(true);
      return;
    }

    // No local products to copy, proceed directly
    await addToShoppingList(selectedList, {});
  };

  const handleAcceptCopy = async () => {
    if (!user) return;
    
    setIsCopying(true);
    
    try {
      // Copy local products to user's database
      const productMapping: Record<string, string> = {};
      
      for (const localProduct of localProductsToCopy) {
        const { data: newProduct, error } = await supabase
          .from('shopping_products')
          .insert({
            name: localProduct.productName,
            aisle_id: localProduct.aisle_id,
            unit_id: localProduct.unit_id,
            user_id: user.id,
            family_id: family?.id || null,
          })
          .select('id')
          .single();
        
        if (error) throw error;
        
        // Map old product_id to new product_id
        productMapping[localProduct.productId] = newProduct.id;
      }
      
      // Invalidate products cache to get the new products
      await queryClient.invalidateQueries({ queryKey: ['shopping-products'] });
      
      const selectedList = ingredients.filter((i) => selectedIngredients.has(i.id));
      await addToShoppingList(selectedList, productMapping);
      
      toast.success(`${localProductsToCopy.length} produit${localProductsToCopy.length > 1 ? 's' : ''} copié${localProductsToCopy.length > 1 ? 's' : ''} dans votre base`);
    } catch (error) {
      console.error('Error copying products:', error);
      toast.error('Erreur lors de la copie des produits');
    } finally {
      setIsCopying(false);
      setShowCopyWarning(false);
    }
  };

  const addToShoppingList = async (
    selectedList: Ingredient[],
    productMapping: Record<string, string>
  ) => {
    const autresAisleId = getAutresAisleId();

    const items = selectedList.map((ingredient) => {
      // Check if this ingredient's product was copied (use new ID)
      const mappedProductId = ingredient.product_id 
        ? productMapping[ingredient.product_id] || ingredient.product_id
        : null;

      if (mappedProductId) {
        return {
          name: ingredient.shopping_products?.name || ingredient.name,
          quantity: ingredient.quantity
            ? Math.round(ingredient.quantity * scaleFactor * 100) / 100
            : null,
          unit_id: ingredient.shopping_products?.unit_id || ingredient.unit_id,
          aisle_id: ingredient.shopping_products?.aisle_id || autresAisleId,
          product_id: mappedProductId,
        };
      }
      
      // Fallback for unlinked ingredients - put in "Autres"
      return {
        name: ingredient.name,
        quantity: ingredient.quantity
          ? Math.round(ingredient.quantity * scaleFactor * 100) / 100
          : null,
        unit_id: ingredient.unit_id ?? null,
        aisle_id: autresAisleId,
        product_id: null,
      };
    });

    try {
      await addItems.mutateAsync(items);

      const linkedCount = items.filter((i) => i.product_id).length;
      const unlinkedCount = items.length - linkedCount;

      let message = `${items.length} ingrédient${items.length > 1 ? 's' : ''} ajouté${items.length > 1 ? 's' : ''}`;
      if (unlinkedCount > 0 && linkedCount > 0) {
        message += ` (${linkedCount} lié${linkedCount > 1 ? 's' : ''}, ${unlinkedCount} dans "Autres")`;
      } else if (unlinkedCount > 0) {
        message += ` dans "Autres"`;
      }

      toast.success(message);
      setIsOpen(false);
    } catch (error) {
      toast.error("Erreur lors de l'ajout à la liste");
    }
  };

  const formatQuantity = (ingredient: Ingredient) => {
    const qty = ingredient.quantity
      ? Math.round(ingredient.quantity * scaleFactor * 100) / 100
      : null;

    const displayName = ingredient.shopping_products?.name || ingredient.name;
    if (!qty) return displayName;

    const unit = ingredient.units?.abbreviation || ingredient.units?.name || '';
    return `${qty}${unit ? ' ' + unit : ''} ${displayName}`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={ingredients.length === 0}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Liste de courses
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter à la liste de courses</DialogTitle>
            <DialogDescription>
              Sélectionnez les ingrédients à ajouter à votre liste de courses.
            </DialogDescription>
          </DialogHeader>

          {detectLocalProducts.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Cette recette contient {detectLocalProducts.length} produit{detectLocalProducts.length > 1 ? 's' : ''} local{detectLocalProducts.length > 1 ? 'ux' : ''} du cookier. 
                Ils seront copiés dans votre base si vous les sélectionnez.
              </p>
            </div>
          )}

          <div className="flex gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Tout sélectionner
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              Tout désélectionner
            </Button>
          </div>

          <ScrollArea className="max-h-[300px] pr-4">
            <div className="space-y-3">
              {ingredients.map((ingredient) => {
                const isLocal = detectLocalProducts.some(lp => lp.ingredientId === ingredient.id);
                return (
                  <div key={ingredient.id} className="flex items-center gap-3 py-1">
                    <Checkbox
                      id={ingredient.id}
                      checked={selectedIngredients.has(ingredient.id)}
                      onCheckedChange={() => toggleIngredient(ingredient.id)}
                    />
                    <label htmlFor={ingredient.id} className="text-sm cursor-pointer flex-1 flex items-center gap-2">
                      {formatQuantity(ingredient)}
                      {isLocal && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                          local
                        </span>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={addItems.isPending || selectedIngredients.size === 0}
            >
              <Check className="h-4 w-4 mr-2" />
              Ajouter ({selectedIngredients.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCopyWarning} onOpenChange={setShowCopyWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Copie de produits locaux
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Les produits suivants sont des produits locaux du cookier et seront copiés dans votre propre base de données :
                </p>
                <ul className="list-disc list-inside space-y-1 text-foreground">
                  {localProductsToCopy.map(lp => (
                    <li key={lp.productId} className="font-medium">
                      {lp.productName}
                    </li>
                  ))}
                </ul>
                <p>
                  Voulez-vous continuer ?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCopying}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptCopy} disabled={isCopying}>
              {isCopying ? 'Copie en cours...' : 'Copier et ajouter'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AddToShoppingListWithCopyButton;
