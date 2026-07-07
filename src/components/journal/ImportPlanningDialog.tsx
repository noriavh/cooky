import { useState } from 'react';
import { startOfWeek } from 'date-fns';
import { Loader2, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMealPlans, MealPlan, MealType } from '@/hooks/useMealPlans';
import { useGetOrCreateJournalMeal, useAddJournalItems } from '@/hooks/useFoodJournal';
import { useGetOrCreateProduct } from '@/hooks/useShoppingProducts';
import { slotLabel, DEFAULT_SLOTS } from '@/lib/journal';
import { toast } from 'sonner';

interface ImportPlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
}

const ingredientKey = (planId: string, ingredientId: string) => `${planId}:${ingredientId}`;

const ImportPlanningDialog = ({ open, onOpenChange, date }: ImportPlanningDialogProps) => {
  const [uncheckedKeys, setUncheckedKeys] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  const weekStart = startOfWeek(new Date(`${date}T00:00:00`), { weekStartsOn: 1 });
  const { data: weekPlans = [], isLoading } = useMealPlans(weekStart);

  const getOrCreateMeal = useGetOrCreateJournalMeal();
  const addItems = useAddJournalItems();
  const getOrCreateProduct = useGetOrCreateProduct();

  const dayPlans = weekPlans.filter((plan) => plan.date === date);
  const recipePlans = dayPlans.filter((plan) => plan.recipe_id && plan.recipes);
  const customTextPlans = dayPlans.filter((plan) => !plan.recipe_id && plan.custom_text);

  const plansBySlot = new Map<MealType, MealPlan[]>();
  for (const slot of DEFAULT_SLOTS) {
    const plans = recipePlans.filter((plan) => plan.meal_type === slot);
    if (plans.length > 0) plansBySlot.set(slot, plans);
  }

  const checkedIngredientsCount = recipePlans.reduce(
    (count, plan) =>
      count +
      (plan.recipes?.ingredients ?? []).filter(
        (ing) => !uncheckedKeys.has(ingredientKey(plan.id, ing.id))
      ).length,
    0
  );

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) setUncheckedKeys(new Set());
    onOpenChange(newOpen);
  };

  const toggleIngredient = (key: string) => {
    setUncheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      let importedCount = 0;

      for (const [slot, plans] of plansBySlot) {
        const items: { productId: string; sourceRecipeId: string }[] = [];

        for (const plan of plans) {
          const checkedIngredients = (plan.recipes?.ingredients ?? []).filter(
            (ing) => !uncheckedKeys.has(ingredientKey(plan.id, ing.id))
          );

          for (const ing of checkedIngredients) {
            let productId = ing.product_id;
            if (!productId) {
              const product = await getOrCreateProduct.mutateAsync({ name: ing.name });
              productId = product.id;
            }
            items.push({ productId, sourceRecipeId: plan.recipe_id! });
          }
        }

        if (items.length === 0) continue;

        const meal = await getOrCreateMeal.mutateAsync({ date, slotType: slot });
        await addItems.mutateAsync({ mealId: meal.id, items });
        importedCount += items.length;
      }

      if (importedCount > 0) {
        toast.success(`${importedCount} ingrédient${importedCount > 1 ? 's' : ''} importé${importedCount > 1 ? 's' : ''}`);
      }
      handleOpenChange(false);
    } catch {
      toast.error("Erreur lors de l'import du planning");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Importer le planning du jour</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-4">Chargement...</p>
        ) : recipePlans.length === 0 && customTextPlans.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Aucun repas planifié pour ce jour
          </p>
        ) : (
          <>
            <ScrollArea className="max-h-[350px] pr-4">
              <div className="space-y-4">
                {[...plansBySlot.entries()].map(([slot, plans]) => (
                  <div key={slot}>
                    <p className="text-sm font-semibold mb-1">{slotLabel(slot)}</p>
                    <div className="space-y-2">
                      {plans.map((plan) => (
                        <div key={plan.id}>
                          <p className="text-sm text-muted-foreground mb-1">
                            {plan.recipes?.title}
                          </p>
                          <div className="space-y-1">
                            {(plan.recipes?.ingredients ?? []).map((ing) => {
                              const key = ingredientKey(plan.id, ing.id);
                              return (
                                <label
                                  key={key}
                                  className="flex items-center gap-2 pl-2 py-1 rounded-md hover:bg-muted cursor-pointer"
                                >
                                  <Checkbox
                                    checked={!uncheckedKeys.has(key)}
                                    onCheckedChange={() => toggleIngredient(key)}
                                  />
                                  <span className="text-sm flex-1">
                                    {ing.shopping_products?.name ?? ing.name}
                                  </span>
                                  {!ing.product_id && (
                                    <Badge variant="outline" className="text-xs">
                                      sera créé
                                    </Badge>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {customTextPlans.length > 0 && (
                  <div className="space-y-1 opacity-50">
                    {customTextPlans.map((plan) => (
                      <p key={plan.id} className="text-sm flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        {slotLabel(plan.meal_type)} : {plan.custom_text} (texte libre, non importable)
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            <Button
              onClick={handleImport}
              disabled={checkedIngredientsCount === 0 || isImporting}
            >
              {isImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Importer ({checkedIngredientsCount})
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImportPlanningDialog;
