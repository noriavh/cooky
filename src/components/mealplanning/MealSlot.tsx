import { useState } from 'react';
import { Plus, Minus, X, ChefHat, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MealPlan, MealType, MealSlotData, useUpdateSlotServings, useDeleteMealPlan, useClearSlot, useUpdateMealPlanCustomText } from '@/hooks/useMealPlans';
import RecipeSelectDialog from './RecipeSelectDialog';
import MealSlotRecipesDialog from './MealSlotRecipesDialog';
import { cn } from '@/lib/utils';

interface MealSlotProps {
  date: string;
  mealType: MealType;
  slotData?: MealSlotData;
  onAddMeal: (date: string, mealType: MealType, recipeId: string | null, servings: number, customText?: string) => void;
}

const mealTypeLabels: Record<MealType, string> = {
  morning: 'Matin',
  noon: 'Midi',
  evening: 'Soir',
};

const MealSlot = ({ date, mealType, slotData, onAddMeal }: MealSlotProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRecipesDialogOpen, setIsRecipesDialogOpen] = useState(false);
  const [editingCustomText, setEditingCustomText] = useState<{ id: string; text: string } | null>(null);
  const updateSlotServings = useUpdateSlotServings();
  const deleteMealPlan = useDeleteMealPlan();
  const clearSlot = useClearSlot();
  const updateCustomText = useUpdateMealPlanCustomText();

  const mealPlans = slotData?.mealPlans || [];
  const recipeCount = mealPlans.length;
  const servings = slotData?.servings || 4;

  const handleSelectRecipe = (recipeId: string | null, recipeServings: number, customText?: string) => {
    onAddMeal(date, mealType, recipeId, recipeServings, customText);
    setIsDialogOpen(false);
    setEditingCustomText(null);
  };

  const handleEditCustomText = (mealPlan: MealPlan) => {
    if (mealPlan.custom_text) {
      setEditingCustomText({ id: mealPlan.id, text: mealPlan.custom_text });
      setIsDialogOpen(true);
    }
  };

  const handleUpdateCustomText = (id: string, text: string) => {
    updateCustomText.mutate({ id, customText: text });
    setIsDialogOpen(false);
    setEditingCustomText(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingCustomText(null);
    }
  };

  const handleServingsChange = (delta: number) => {
    if (!slotData) return;
    const newServings = Math.max(1, servings + delta);
    updateSlotServings.mutate({ date, mealType, servings: newServings });
  };

  const handleRemoveSingle = () => {
    if (mealPlans.length === 1) {
      deleteMealPlan.mutate(mealPlans[0].id);
    }
  };

  const handleClearAll = () => {
    clearSlot.mutate({ date, mealType });
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
          onOpenChange={handleDialogOpenChange}
          onSelect={handleSelectRecipe}
          editingCustomText={editingCustomText}
          onUpdateCustomText={handleUpdateCustomText}
        />
      </>
    );
  }

  const singleMeal = recipeCount === 1 ? mealPlans[0] : null;
  const isCustomText = singleMeal && !singleMeal.recipe_id && singleMeal.custom_text;

  // Single meal (recipe or custom text) - show full visual with add button
  if (singleMeal) {
    return (
      <>
        <div className="w-full h-full p-2 rounded-lg bg-card border shadow-sm flex flex-col min-h-[100px]">
          {/* Header with title, add and delete */}
          <div className="flex items-start justify-between gap-1 mb-1">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{mealTypeLabels[mealType]}</p>
              {!isCustomText && (
                <p className="font-medium text-xs leading-tight line-clamp-2">
                  {singleMeal.recipes?.title}
                </p>
              )}
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
          
          {/* Image for recipes, full text area for custom text */}
          <div className="flex-1 min-h-0 mb-1">
            {isCustomText ? (
              <button
                onClick={() => handleEditCustomText(singleMeal)}
                className="w-full h-full rounded bg-muted/30 flex items-center justify-center p-2 hover:bg-muted/50 transition-colors cursor-pointer text-center"
                title="Cliquer pour modifier"
              >
                <span className="text-sm font-medium line-clamp-3">{singleMeal.custom_text}</span>
              </button>
            ) : singleMeal.recipes?.image_url ? (
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
          
          {/* Servings - only show for recipes */}
          {!isCustomText && (
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
          )}
        </div>

        <RecipeSelectDialog
          open={isDialogOpen}
          onOpenChange={handleDialogOpenChange}
          onSelect={handleSelectRecipe}
          editingCustomText={editingCustomText}
          onUpdateCustomText={handleUpdateCustomText}
        />
      </>
    );
  }

  // Two or more recipes - show names with add button
  return (
    <>
      <div className="w-full h-full p-2 rounded-lg bg-card border shadow-sm flex flex-col min-h-[100px]">
        {/* Header */}
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
        
        {/* Recipe/meal names - clickable to open dialog */}
        <button
          onClick={() => setIsRecipesDialogOpen(true)}
          className="flex-1 space-y-0.5 text-left hover:bg-muted/50 rounded p-1 -mx-1 transition-colors"
        >
          {mealPlans.slice(0, 3).map((plan) => (
            <p key={plan.id} className="text-xs font-medium line-clamp-1 flex items-center gap-1">
              {plan.custom_text ? (
                <><FileText className="w-3 h-3 inline-block flex-shrink-0" /> {plan.custom_text}</>
              ) : (
                <>• {plan.recipes?.title}</>
              )}
            </p>
          ))}
          {recipeCount > 3 && (
            <p className="text-xs text-muted-foreground">+{recipeCount - 3} autres</p>
          )}
        </button>
        
        {/* Servings */}
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
        onOpenChange={handleDialogOpenChange}
        onSelect={handleSelectRecipe}
        editingCustomText={editingCustomText}
        onUpdateCustomText={handleUpdateCustomText}
      />

      <MealSlotRecipesDialog
        open={isRecipesDialogOpen}
        onOpenChange={setIsRecipesDialogOpen}
        mealPlans={mealPlans}
        onAddRecipe={handleSelectRecipe}
        mealTypeLabel={mealTypeLabels[mealType]}
      />
    </>
  );
};

export default MealSlot;
