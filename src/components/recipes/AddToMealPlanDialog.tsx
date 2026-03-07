import { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAddMealPlan, MealType } from '@/hooks/useMealPlans';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AddToMealPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId: string;
  recipeTitle: string;
  recipeServings?: number | null;
}

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
  { value: 'morning', label: 'Matin', emoji: '🌅' },
  { value: 'noon', label: 'Midi', emoji: '☀️' },
  { value: 'evening', label: 'Soir', emoji: '🌙' },
];

const AddToMealPlanDialog = ({
  open,
  onOpenChange,
  recipeId,
  recipeTitle,
  recipeServings = 4,
}: AddToMealPlanDialogProps) => {
  // If today is Sunday (getDay() === 0), default to next week
  const getDefaultWeekStart = () => {
    const today = new Date();
    const dayOfWeek = getDay(today);
    const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    // If Sunday, go to next week
    return dayOfWeek === 0 ? addWeeks(thisWeekStart, 1) : thisWeekStart;
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(getDefaultWeekStart);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; mealType: MealType } | null>(null);
  
  const addMealPlan = useAddMealPlan();

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const weekLabel = useMemo(() => {
    const start = format(currentWeekStart, 'd MMM', { locale: fr });
    const end = format(addDays(currentWeekStart, 6), 'd MMM', { locale: fr });
    return `${start} - ${end}`;
  }, [currentWeekStart]);

  const goToPreviousWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));

  const handleSlotClick = (date: Date, mealType: MealType) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isSelected = selectedSlot?.date === dateStr && selectedSlot?.mealType === mealType;
    
    if (isSelected) {
      setSelectedSlot(null);
    } else {
      setSelectedSlot({ date: dateStr, mealType });
    }
  };

  const handleAdd = () => {
    if (!selectedSlot) return;

    addMealPlan.mutate(
      {
        date: selectedSlot.date,
        meal_type: selectedSlot.mealType,
        recipe_id: recipeId,
        servings: recipeServings || 4,
      },
      {
        onSuccess: () => {
          toast.success('Recette ajoutée au planning');
          onOpenChange(false);
          setSelectedSlot(null);
        },
        onError: () => {
          toast.error("Erreur lors de l'ajout au planning");
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedSlot(null);
      setCurrentWeekStart(getDefaultWeekStart());
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Ajouter au planning
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choisissez quand préparer <span className="font-medium text-foreground">{recipeTitle}</span>
          </p>

          {/* Week Navigation */}
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {weekLabel}
            </span>
            <Button variant="ghost" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Week Grid */}
          <div className="space-y-2">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1">
              {weekDates.map((date, index) => {
                const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                return (
                  <div key={index} className="text-center">
                    <p className={cn(
                      "text-xs font-medium",
                      isToday && "text-primary"
                    )}>
                      {DAYS_OF_WEEK[index]}
                    </p>
                    <p className={cn(
                      "text-xs",
                      isToday ? "text-primary font-bold" : "text-muted-foreground"
                    )}>
                      {format(date, 'd')}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Meal Type Rows */}
            {MEAL_TYPES.map((mealType) => (
              <div key={mealType.value} className="grid grid-cols-7 gap-1">
                {weekDates.map((date, dayIndex) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const isSelected = selectedSlot?.date === dateStr && selectedSlot?.mealType === mealType.value;
                  const isPast = date < new Date() && format(date, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd');
                  
                  return (
                    <button
                      key={`${dayIndex}-${mealType.value}`}
                      onClick={() => handleSlotClick(date, mealType.value)}
                      disabled={isPast}
                      className={cn(
                        "h-10 rounded-md text-xs flex items-center justify-center transition-all",
                        isPast && "opacity-40 cursor-not-allowed",
                        !isPast && "hover:bg-muted cursor-pointer",
                        isSelected 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted/50"
                      )}
                    >
                      {isSelected ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <span>{mealType.emoji}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex justify-center gap-4 pt-2 text-xs text-muted-foreground">
              {MEAL_TYPES.map((mealType) => (
                <span key={mealType.value} className="flex items-center gap-1">
                  {mealType.emoji} {mealType.label}
                </span>
              ))}
            </div>
          </div>

          {/* Add Button */}
          <Button
            onClick={handleAdd}
            disabled={!selectedSlot || addMealPlan.isPending}
            className="w-full"
          >
            {addMealPlan.isPending ? 'Ajout...' : 'Ajouter au planning'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddToMealPlanDialog;
