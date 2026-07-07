import { useMemo } from 'react';
import {
  format,
  parse,
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameMonth,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { useJournalRange, JournalMeal } from '@/hooks/useFoodJournal';
import { SCORE_COLORS, compareSlots, slotLabel } from '@/lib/journal';
import { cn } from '@/lib/utils';

interface MonthViewProps {
  date: Date;
  onSelectDay: (date: Date) => void;
}

const WEEK_DAY_HEADERS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const MonthView = ({ date, onSelectDay }: MonthViewProps) => {
  const gridStartStr = format(startOfWeek(startOfMonth(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const gridEndStr = format(endOfWeek(endOfMonth(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const { data: meals = [], isLoading } = useJournalRange(
    parse(gridStartStr, 'yyyy-MM-dd', new Date()),
    parse(gridEndStr, 'yyyy-MM-dd', new Date())
  );

  const days = useMemo(() => {
    const gridEnd = parse(gridEndStr, 'yyyy-MM-dd', new Date());
    const result: { date: Date; dayMeals: JournalMeal[] }[] = [];
    for (let day = parse(gridStartStr, 'yyyy-MM-dd', new Date()); day <= gridEnd; day = addDays(day, 1)) {
      const dayStr = format(day, 'yyyy-MM-dd');
      result.push({
        date: day,
        dayMeals: meals.filter((meal) => meal.date === dayStr).sort(compareSlots),
      });
    }
    return result;
  }, [gridStartStr, gridEndStr, meals]);

  if (isLoading) {
    return <div className="text-muted-foreground py-8 text-center">Chargement...</div>;
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <Card className="p-2 md:p-4">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEK_DAY_HEADERS.map((header) => (
          <p key={header} className="text-center text-xs font-medium text-muted-foreground py-1">
            {header}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(({ date: day, dayMeals }) => {
          const isToday = format(day, 'yyyy-MM-dd') === todayStr;
          const inMonth = isSameMonth(day, date);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                'min-h-[3.5rem] md:min-h-[4.5rem] rounded-md border p-1 md:p-1.5 text-left transition-colors hover:bg-muted/50',
                !inMonth && 'opacity-40',
                isToday && 'border-primary'
              )}
            >
              <p className={cn('text-xs mb-1', isToday ? 'text-primary font-bold' : 'text-muted-foreground')}>
                {format(day, 'd', { locale: fr })}
              </p>
              <div className="flex flex-wrap gap-1">
                {dayMeals.map((meal) => (
                  <span
                    key={meal.id}
                    title={slotLabel(meal.slot_type, meal.slot_name)}
                    className={cn(
                      'w-2 h-2 md:w-2.5 md:h-2.5 rounded-full',
                      meal.score
                        ? SCORE_COLORS[meal.score]
                        : 'bg-muted border border-muted-foreground/30'
                    )}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};

export default MonthView;
