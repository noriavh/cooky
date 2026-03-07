import { useState } from 'react';
import { Plus, X, ChefHat } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TypicalWeekMeal, useDeleteTypicalWeekMeal } from '@/hooks/useTypicalWeek';
import RecipeSelectDialog from './RecipeSelectDialog';

interface TypicalWeekSlotRecipesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meals: TypicalWeekMeal[];
  onAddRecipe: (recipeId: string, servings: number) => void;
  mealTypeLabel: string;
}

const TypicalWeekSlotRecipesDialog = ({
  open,
  onOpenChange,
  meals,
  onAddRecipe,
  mealTypeLabel,
}: TypicalWeekSlotRecipesDialogProps) => {
  const [isSelectDialogOpen, setIsSelectDialogOpen] = useState(false);
  const deleteMeal = useDeleteTypicalWeekMeal();

  const handleRemoveRecipe = (id: string) => {
    deleteMeal.mutate(id);
  };

  const handleAddRecipe = (recipeId: string, servings: number) => {
    onAddRecipe(recipeId, servings);
    setIsSelectDialogOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recettes - {mealTypeLabel}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2">
              {meals.map((meal) => (
                <div
                  key={meal.id}
                  className="flex items-center gap-3 p-2 rounded-lg border bg-card"
                >
                  {meal.recipes?.image_url ? (
                    <img
                      src={meal.recipes.image_url}
                      alt={meal.recipes.title}
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <ChefHat className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <span className="flex-1 font-medium text-sm line-clamp-2">
                    {meal.recipes?.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => handleRemoveRecipe(meal.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>

          <Button onClick={() => setIsSelectDialogOpen(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une recette
          </Button>
        </DialogContent>
      </Dialog>

      <RecipeSelectDialog
        open={isSelectDialogOpen}
        onOpenChange={setIsSelectDialogOpen}
        onSelect={handleAddRecipe}
      />
    </>
  );
};

export default TypicalWeekSlotRecipesDialog;
