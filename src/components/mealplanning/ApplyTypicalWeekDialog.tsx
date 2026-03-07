import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Copy, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useTypicalWeekMeals } from '@/hooks/useTypicalWeek';
import { useAddMealPlan, MealPlan } from '@/hooks/useMealPlans';
import { toast } from 'sonner';

interface ApplyTypicalWeekDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStart: Date;
  existingMealPlans: MealPlan[];
}

const ApplyTypicalWeekDialog = ({
  open,
  onOpenChange,
  weekStart,
  existingMealPlans,
}: ApplyTypicalWeekDialogProps) => {
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const { data: typicalWeekMeals = [] } = useTypicalWeekMeals();
  const addMealPlan = useAddMealPlan();

  const weekLabel = `${format(weekStart, 'd MMM', { locale: fr })} - ${format(addDays(weekStart, 6), 'd MMM yyyy', { locale: fr })}`;

  const handleApply = async () => {
    if (typicalWeekMeals.length === 0) {
      toast.error('Aucune recette dans la semaine type');
      return;
    }

    setIsApplying(true);

    try {
      for (const meal of typicalWeekMeals) {
        const targetDate = addDays(weekStart, meal.day_of_week);
        const dateStr = format(targetDate, 'yyyy-MM-dd');

        // Check if a meal already exists at this slot
        const existingAtSlot = existingMealPlans.filter(
          (mp) => mp.date === dateStr && mp.meal_type === meal.meal_type
        );

        // Skip if slot is already filled and we're not replacing
        if (existingAtSlot.length > 0 && !replaceExisting) {
          continue;
        }

        await addMealPlan.mutateAsync({
          date: dateStr,
          meal_type: meal.meal_type,
          recipe_id: meal.recipe_id,
          servings: meal.servings,
        });
      }

      toast.success('Semaine type appliquée !');
      onOpenChange(false);
    } catch (error) {
      console.error('Error applying typical week:', error);
      toast.error("Erreur lors de l'application de la semaine type");
    } finally {
      setIsApplying(false);
    }
  };

  const hasExistingMeals = existingMealPlans.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Appliquer la semaine type
          </DialogTitle>
          <DialogDescription>
            Copier les recettes de votre semaine type vers la semaine du {weekLabel}.
          </DialogDescription>
        </DialogHeader>

        {typicalWeekMeals.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
            <AlertTriangle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Votre semaine type est vide. Ajoutez des recettes dans la semaine type avant de l'appliquer.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {typicalWeekMeals.length} recette{typicalWeekMeals.length > 1 ? 's' : ''} sera{typicalWeekMeals.length > 1 ? 'ont' : ''} ajoutée{typicalWeekMeals.length > 1 ? 's' : ''}.
              </p>

              {hasExistingMeals && (
                <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50">
                  <Checkbox
                    id="replace-existing"
                    checked={replaceExisting}
                    onCheckedChange={(checked) => setReplaceExisting(checked === true)}
                  />
                  <div>
                    <Label htmlFor="replace-existing" className="font-medium cursor-pointer">
                      Ajouter même si des repas existent
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Par défaut, les créneaux déjà remplis sont ignorés.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button onClick={handleApply} disabled={isApplying}>
                {isApplying ? 'Application...' : 'Appliquer'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ApplyTypicalWeekDialog;
