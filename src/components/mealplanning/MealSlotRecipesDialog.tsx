import { useState } from 'react';
import { X, ChefHat, Plus, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MealPlan, useDeleteMealPlan } from '@/hooks/useMealPlans';
import RecipeSelectDialog from './RecipeSelectDialog';

interface MealSlotRecipesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealPlans: MealPlan[];
  onAddRecipe: (recipeId: string | null, servings: number, customText?: string) => void;
  mealTypeLabel: string;
}

const MealSlotRecipesDialog = ({
  open,
  onOpenChange,
  mealPlans,
  onAddRecipe,
  mealTypeLabel,
}: MealSlotRecipesDialogProps) => {
  const [isSelectDialogOpen, setIsSelectDialogOpen] = useState(false);
  const deleteMealPlan = useDeleteMealPlan();

  const handleRemoveRecipe = (id: string) => {
    deleteMealPlan.mutate(id);
  };

  const handleAddRecipe = (recipeId: string | null, servings: number, customText?: string) => {
    onAddRecipe(recipeId, servings, customText);
    setIsSelectDialogOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Repas du {mealTypeLabel.toLowerCase()}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[300px] pr-4">
            <div className="space-y-2">
              {mealPlans.map((plan) => {
                const isCustomText = !plan.recipe_id && plan.custom_text;
                return (
                  <div
                    key={plan.id}
                    className="flex items-center gap-3 p-2 rounded-lg border bg-card"
                  >
                    {isCustomText ? (
                      <div className="w-12 h-12 rounded bg-muted/50 border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      </div>
                    ) : plan.recipes?.image_url ? (
                      <img
                        src={plan.recipes.image_url}
                        alt={plan.recipes.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <ChefHat className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {isCustomText ? plan.custom_text : plan.recipes?.title}
                      </p>
                      {isCustomText && (
                        <p className="text-xs text-muted-foreground">Texte manuel</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => handleRemoveRecipe(plan.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => setIsSelectDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un repas
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

export default MealSlotRecipesDialog;
