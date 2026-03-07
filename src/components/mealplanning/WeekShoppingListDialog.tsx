import { useState, useMemo } from 'react';
import { ShoppingCart } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MealPlan } from '@/hooks/useMealPlans';
import { useAddMultipleShoppingListItems } from '@/hooks/useShoppingList';
import { useAisles } from '@/hooks/useShoppingList';
import { toast } from 'sonner';

interface GroupedIngredient {
  key: string;
  name: string;
  displayName: string;
  quantity: number;
  unit_id: string | null;
  unitName: string | null;
  aisle_id: string | null;
  product_id: string | null;
}

interface WeekShoppingListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealPlans: MealPlan[];
}

const WeekShoppingListDialog = ({ open, onOpenChange, mealPlans }: WeekShoppingListDialogProps) => {
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const addMultipleItems = useAddMultipleShoppingListItems();
  const { data: aisles = [] } = useAisles();

  // Group ingredients by name + unit, summing quantities
  const groupedIngredients = useMemo(() => {
    const groups = new Map<string, GroupedIngredient>();

    mealPlans.forEach((mealPlan) => {
      if (!mealPlan.recipes) return;

      const originalServings = mealPlan.recipes.servings || 4;
      const scaleFactor = mealPlan.servings / originalServings;

      mealPlan.recipes.ingredients.forEach((ingredient) => {
        const productName = ingredient.shopping_products?.name || ingredient.name;
        const unitId = ingredient.shopping_products?.unit_id || ingredient.unit_id;
        const unitName = ingredient.units?.abbreviation || ingredient.units?.name || null;
        const key = `${productName.toLowerCase()}_${unitId || 'null'}`;

        const scaledQuantity = ingredient.quantity 
          ? ingredient.quantity * scaleFactor 
          : 0;

        if (groups.has(key)) {
          const existing = groups.get(key)!;
          existing.quantity += scaledQuantity;
        } else {
          groups.set(key, {
            key,
            name: ingredient.name,
            displayName: productName,
            quantity: scaledQuantity,
            unit_id: unitId,
            unitName,
            aisle_id: ingredient.shopping_products?.aisle_id || null,
            product_id: ingredient.product_id,
          });
        }
      });
    });

    return Array.from(groups.values()).sort((a, b) => 
      a.displayName.localeCompare(b.displayName)
    );
  }, [mealPlans]);

  // Initialize selection when dialog opens
  useMemo(() => {
    if (open) {
      setSelectedIngredients(new Set(groupedIngredients.map(i => i.key)));
    }
  }, [open, groupedIngredients]);

  const toggleIngredient = (key: string) => {
    setSelectedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIngredients(new Set(groupedIngredients.map(i => i.key)));
  };

  const deselectAll = () => {
    setSelectedIngredients(new Set());
  };

  const getAutresAisleId = () => {
    const autresAisle = aisles.find(a => a.name.toLowerCase() === 'autres');
    return autresAisle?.id || null;
  };

  const handleConfirm = async () => {
    const selectedItems = groupedIngredients.filter(i => selectedIngredients.has(i.key));
    
    if (selectedItems.length === 0) {
      toast.error('Sélectionnez au moins un ingrédient');
      return;
    }

    const autresAisleId = getAutresAisleId();

    const itemsToAdd = selectedItems.map(item => ({
      name: item.displayName,
      quantity: item.quantity || null,
      unit_id: item.unit_id,
      aisle_id: item.aisle_id || autresAisleId,
      product_id: item.product_id,
    }));

    try {
      await addMultipleItems.mutateAsync(itemsToAdd);
      toast.success(`${selectedItems.length} ingrédient(s) ajouté(s) à la liste de courses`);
      onOpenChange(false);
    } catch (error) {
      toast.error('Erreur lors de l\'ajout des ingrédients');
    }
  };

  const formatQuantity = (quantity: number, unitName: string | null) => {
    if (!quantity) return '';
    const roundedQty = Math.round(quantity * 100) / 100;
    return unitName ? `${roundedQty} ${unitName}` : `${roundedQty}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Ajouter à la liste de courses
          </DialogTitle>
          <DialogDescription>
            Sélectionnez les ingrédients à ajouter à votre liste de courses
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Tout sélectionner
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            Tout désélectionner
          </Button>
        </div>

        <ScrollArea className="h-[300px] pr-4">
          {groupedIngredients.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Aucun ingrédient dans les repas planifiés
            </p>
          ) : (
            <div className="space-y-2">
              {groupedIngredients.map((ingredient) => (
                <label
                  key={ingredient.key}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={selectedIngredients.has(ingredient.key)}
                    onCheckedChange={() => toggleIngredient(ingredient.key)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ingredient.displayName}</p>
                    {ingredient.quantity > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {formatQuantity(ingredient.quantity, ingredient.unitName)}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={selectedIngredients.size === 0 || addMultipleItems.isPending}
          >
            Ajouter ({selectedIngredients.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WeekShoppingListDialog;
