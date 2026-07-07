import { useMemo } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { useJournalRange, JournalMeal } from '@/hooks/useFoodJournal';
import { slotLabel, SCORE_COLORS, compareSlots } from '@/lib/journal';
import { cn } from '@/lib/utils';

interface WeekViewProps {
  date: Date;
  onSelectDay: (date: Date) => void;
}

const ScoreDot = ({ meal }: { meal: JournalMeal }) => (
  <span
    className={cn(
      'w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1',
      meal.score ? SCORE_COLORS[meal.score] : 'bg-muted border border-muted-foreground/30'
    )}
  />
);

const DayMeals = ({ meals }: { meals: JournalMeal[] }) => {
  if (meals.length === 0) {
    return <p className="text-xs text-muted-foreground">—</p>;
  }

  return (
    <div className="space-y-2">
      {meals.map((meal) => (
        <div key={meal.id} className="flex items-start gap-1.5">
          <ScoreDot meal={meal} />
          <div className="min-w-0">
            <p className="text-xs font-medium">{slotLabel(meal.slot_type, meal.slot_name)}</p>
            {meal.journal_meal_items.length > 0 && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {meal.journal_meal_items
                  .map((item) => item.shopping_products?.name ?? '?')
                  .join(', ')}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const WeekView = ({ date, onSelectDay }: WeekViewProps) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const { data: meals = [], isLoading } = useJournalRange(weekStart, weekEnd);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const day = addDays(weekStart, i);
        const dayStr = format(day, 'yyyy-MM-dd');
        return {
          date: day,
          dayMeals: meals.filter((meal) => meal.date === dayStr).sort(compareSlots),
        };
      }),
    [weekStart, meals]
  );

  if (isLoading) {
    return <div className="text-muted-foreground py-8 text-center">Chargement...</div>;
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
      {weekDays.map(({ date: day, dayMeals }) => {
        const isToday = format(day, 'yyyy-MM-dd') === todayStr;
        return (
          <Card
            key={day.toISOString()}
            className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onSelectDay(day)}
          >
            <div className="flex md:flex-col md:items-center items-baseline gap-2 md:gap-0 mb-2">
              <p className={cn('text-sm font-medium capitalize', isToday && 'text-primary')}>
                {format(day, 'EEE', { locale: fr })}
              </p>
              <p className={cn('text-xs', isToday ? 'text-primary font-bold' : 'text-muted-foreground')}>
                {format(day, 'd MMM', { locale: fr })}
              </p>
            </div>
            <DayMeals meals={dayMeals} />
          </Card>
        );
      })}
    </div>
  );
};

export default WeekView;
