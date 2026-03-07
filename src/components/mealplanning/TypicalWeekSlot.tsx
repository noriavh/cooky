import { useState } from 'react';
import { Plus, Minus, X, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MealType } from '@/hooks/useMealPlans';
import {
  TypicalWeekMeal,
  TypicalWeekSlotData,
  useUpdateTypicalWeekSlotServings,
  useDeleteTypicalWeekMeal,
  useClearTypicalWeekSlot,
} from '@/hooks/useTypicalWeek';
import RecipeSelectDialog from './RecipeSelectDialog';
import TypicalWeekSlotRecipesDialog from './TypicalWeekSlotRecipesDialog';
import { cn } from '@/lib/utils';

interface TypicalWeekSlotProps {
  dayOfWeek: number;
  mealType: MealType;
  slotData?: TypicalWeekSlotData;
  onAddMeal: (dayOfWeek: number, mealType: MealType, recipeId: string, servings: number) => void;
}

const mealTypeLabels: Record<MealType, string> = {
  morning: 'Matin',
  noon: 'Midi',
  evening: 'Soir',
};

const TypicalWeekSlot = ({ dayOfWeek, mealType, slotData, onAddMeal }: TypicalWeekSlotProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRecipesDialogOpen, setIsRecipesDialogOpen] = useState(false);
  const updateSlotServings = useUpdateTypicalWeekSlotServings();
  const deleteMeal = useDeleteTypicalWeekMeal();
  const clearSlot = useClearTypicalWeekSlot();

  const meals = slotData?.meals || [];
  const recipeCount = meals.length;
  const servings = slotData?.servings || 4;

  const handleSelectRecipe = (recipeId: string, recipeServings: number) => {
    onAddMeal(dayOfWeek, mealType, recipeId, recipeServings);
    setIsDialogOpen(false);
  };

  const handleServingsChange = (delta: number) => {
    if (!slotData) return;
    const newServings = Math.max(1, servings + delta);
    updateSlotServings.mutate({ dayOfWeek, mealType, servings: newServings });
  };

  const handleRemoveSingle = () => {
    if (meals.length === 1) {
      deleteMeal.mutate(meals[0].id);
    }
  };

  const handleClearAll = () => {
    clearSlot.mutate({ dayOfWeek, mealType });
  };

  // Empty slot
  if (recipeCount === 0) {
    return (
      <>
        <button
          onClick={() => setIsDialogOpen(true)}
          className={cn(
            "w-full h-full p-2 rounded-lg border-2 border-dashed border-muted-foreground/30",
            "hover:border-primary/50 hover:bg-primary/5 transition-colors",
            "flex flex-col items-center justify-center gap-1 min-h-[100px]"
          )}
        >
          <Plus className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{mealTypeLabels[mealType]}</span>
        </button>
        <RecipeSelectDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSelect={handleSelectRecipe}
        />
      </>
    );
  }

  const singleMeal = recipeCount === 1 ? meals[0] : null;

  // Single recipe
  if (singleMeal) {
    return (
      <>
        <div className="w-full h-full p-2 rounded-lg bg-card border shadow-sm flex flex-col min-h-[100px]">
          <div className="flex items-start justify-between gap-1 mb-1">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{mealTypeLabels[mealType]}</p>
              <p className="font-medium text-xs leading-tight line-clamp-2">{singleMeal.recipes?.title}</p>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0 -mt-1 -mr-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={handleRemoveSingle}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0 mb-1">
            {singleMeal.recipes?.image_url ? (
              <img
                src={singleMeal.recipes.image_url}
                alt={singleMeal.recipes.title}
                className="w-full h-full rounded object-cover"
              />
            ) : (
              <div className="w-full h-full rounded bg-muted flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-5 w-5"
              onClick={() => handleServingsChange(-1)}
              disabled={servings <= 1}
            >
              <Minus className="w-2.5 h-2.5" />
            </Button>
            <span className="text-xs font-medium w-6 text-center">{servings}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-5 w-5"
              onClick={() => handleServingsChange(1)}
            >
              <Plus className="w-2.5 h-2.5" />
            </Button>
            <span className="text-[10px] text-muted-foreground">pers.</span>
          </div>
        </div>

        <RecipeSelectDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSelect={handleSelectRecipe}
        />
      </>
    );
  }

  // Multiple recipes
  return (
    <>
      <div className="w-full h-full p-2 rounded-lg bg-card border shadow-sm flex flex-col min-h-[100px]">
        <div className="flex items-start justify-between gap-1 mb-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{mealTypeLabels[mealType]}</p>
          <div className="flex items-center gap-0.5 flex-shrink-0 -mt-1 -mr-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={handleClearAll}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <button
          onClick={() => setIsRecipesDialogOpen(true)}
          className="flex-1 space-y-0.5 text-left hover:bg-muted/50 rounded p-1 -mx-1 transition-colors"
        >
          {meals.slice(0, 3).map((meal) => (
            <p key={meal.id} className="text-xs font-medium line-clamp-1">
              • {meal.recipes?.title}
            </p>
          ))}
          {recipeCount > 3 && (
            <p className="text-xs text-muted-foreground">+{recipeCount - 3} autres</p>
          )}
        </button>

        <div className="flex items-center justify-center gap-1 mt-auto pt-1">
          <Button
            variant="outline"
            size="icon"
            className="h-5 w-5"
            onClick={() => handleServingsChange(-1)}
            disabled={servings <= 1}
          >
            <Minus className="w-2.5 h-2.5" />
          </Button>
          <span className="text-xs font-medium w-6 text-center">{servings}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-5 w-5"
            onClick={() => handleServingsChange(1)}
          >
            <Plus className="w-2.5 h-2.5" />
          </Button>
          <span className="text-[10px] text-muted-foreground">pers.</span>
        </div>
      </div>

      <RecipeSelectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSelect={handleSelectRecipe}
      />

      <TypicalWeekSlotRecipesDialog
        open={isRecipesDialogOpen}
        onOpenChange={setIsRecipesDialogOpen}
        meals={meals}
        onAddRecipe={handleSelectRecipe}
        mealTypeLabel={mealTypeLabels[mealType]}
      />
    </>
  );
};

export default TypicalWeekSlot;
