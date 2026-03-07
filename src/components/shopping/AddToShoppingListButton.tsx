import { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useAddMultipleShoppingListItems, useAisles } from '@/hooks/useShoppingList';
import { useShoppingProducts } from '@/hooks/useShoppingProducts';
import type { Ingredient } from '@/hooks/useRecipes';

interface AddToShoppingListButtonProps {
  ingredients: Ingredient[];
  servings?: number;
  originalServings?: number;
}

const AddToShoppingListButton = ({
  ingredients,
  servings = 4,
  originalServings = 4,
}: AddToShoppingListButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  
  const addItems = useAddMultipleShoppingListItems();
  const { data: aisles } = useAisles();
  const { data: products } = useShoppingProducts();

  const scaleFactor = servings / originalServings;

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

    const autresAisleId = getAutresAisleId();

    const items = selectedList.map((ingredient) => {
      // If ingredient has a linked product, use it directly
      if (ingredient.product_id) {
        const linkedProduct = products?.find(p => p.id === ingredient.product_id);
        return {
          name: ingredient.shopping_products?.name || ingredient.name,
          quantity: ingredient.quantity
            ? Math.round(ingredient.quantity * scaleFactor * 100) / 100
            : null,
          unit_id: linkedProduct?.unit_id || ingredient.unit_id,
          aisle_id: linkedProduct?.aisle_id || autresAisleId,
          product_id: ingredient.product_id,
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
            {ingredients.map((ingredient) => (
              <div key={ingredient.id} className="flex items-center gap-3 py-1">
                <Checkbox
                  id={ingredient.id}
                  checked={selectedIngredients.has(ingredient.id)}
                  onCheckedChange={() => toggleIngredient(ingredient.id)}
                />
                <label htmlFor={ingredient.id} className="text-sm cursor-pointer flex-1">
                  {formatQuantity(ingredient)}
                </label>
              </div>
            ))}
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
  );
};

export default AddToShoppingListButton;
