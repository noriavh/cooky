import { useMemo, useState } from 'react';
import { format, addDays, addMonths, isValid, parse, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays, CalendarCheck, History, Download } from 'lucide-react';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/contexts/AuthContext';
import { useJournalDay } from '@/hooks/useFoodJournal';
import { DEFAULT_SLOTS } from '@/lib/journal';
import MealSlotCard from '@/components/journal/MealSlotCard';
import AddCustomSlotPopover from '@/components/journal/AddCustomSlotPopover';
import ImportPlanningDialog from '@/components/journal/ImportPlanningDialog';
import ExportJournalDialog from '@/components/journal/ExportJournalDialog';
import WeekView from '@/components/journal/WeekView';
import MonthView from '@/components/journal/MonthView';
import { cn } from '@/lib/utils';

type JournalView = 'day' | 'week' | 'month';

const FoodJournal = () => {
  const { user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const view: JournalView = useMemo(() => {
    const param = searchParams.get('view');
    return param === 'week' || param === 'month' ? param : 'day';
  }, [searchParams]);

  const currentDate = useMemo(() => {
    const param = searchParams.get('date');
    if (param) {
      const parsed = parse(param, 'yyyy-MM-dd', new Date());
      if (isValid(parsed)) return parsed;
    }
    return new Date();
  }, [searchParams]);

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const { data: meals = [], isLoading } = useJournalDay(currentDate);

  const setParams = (date: Date, nextView: JournalView) => {
    const params: { date: string; view?: JournalView } = { date: format(date, 'yyyy-MM-dd') };
    if (nextView !== 'day') params.view = nextView;
    setSearchParams(params);
  };

  const setDate = (date: Date) => setParams(date, view);

  const navigate = (direction: 1 | -1) => {
    if (view === 'day') setDate(addDays(currentDate, direction));
    else if (view === 'week') setDate(addDays(currentDate, direction * 7));
    else setDate(addMonths(currentDate, direction));
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setDate(date);
      setIsCalendarOpen(false);
    }
  };

  const handleSelectDay = (date: Date) => setParams(date, 'day');

  const customMeals = useMemo(
    () =>
      meals
        .filter((meal) => meal.slot_type === 'custom')
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [meals]
  );

  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

  const dateLabel = useMemo(() => {
    if (view === 'day') return format(currentDate, 'EEEE d MMMM yyyy', { locale: fr });
    if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, 'd MMM', { locale: fr })} - ${format(weekEnd, 'd MMM yyyy', { locale: fr })}`;
    }
    return format(currentDate, 'MMMM yyyy', { locale: fr });
  }, [view, currentDate]);

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="pb-20 md:pb-6">
      {/* Header with navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          <h1 className="text-xl md:text-2xl font-bold">Mon journal</h1>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn('font-medium text-xs md:text-sm capitalize', view === 'day' && isToday && 'text-primary')}>
                  <CalendarDays className="w-4 h-4 mr-1 md:mr-2" />
                  {dateLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  onSelect={handleCalendarSelect}
                  locale={fr}
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" onClick={() => navigate(1)}>
              <ChevronRight className="w-5 h-5" />
            </Button>

            {!isToday && (
              <Button variant="ghost" size="sm" onClick={() => setDate(new Date())} className="hidden sm:flex">
                Aujourd'hui
              </Button>
            )}
          </div>

          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(value) => {
              if (value) setParams(currentDate, value as JournalView);
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="day">Jour</ToggleGroupItem>
            <ToggleGroupItem value="week">Semaine</ToggleGroupItem>
            <ToggleGroupItem value="month">Mois</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {view === 'day' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
                <CalendarCheck className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Importer le planning du jour</span>
                <span className="sm:hidden">Planning</span>
              </Button>

              <AddCustomSlotPopover
                date={dateStr}
                existingSlotNames={customMeals.map((meal) => meal.slot_name ?? '')}
              />
            </>
          )}

          <Link to="/journal/history">
            <Button variant="outline" size="sm">
              <History className="w-4 h-4 mr-1" />
              Historique
            </Button>
          </Link>

          <Button variant="outline" size="sm" onClick={() => setIsExportOpen(true)}>
            <Download className="w-4 h-4 mr-1" />
            Exporter
          </Button>
        </div>
      </div>

      {view === 'week' ? (
        <WeekView date={currentDate} onSelectDay={handleSelectDay} />
      ) : view === 'month' ? (
        <MonthView date={currentDate} onSelectDay={handleSelectDay} />
      ) : isLoading ? (
        <div className="text-muted-foreground py-8 text-center">Chargement...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEFAULT_SLOTS.map((slotType) => (
            <MealSlotCard
              key={`${dateStr}-${slotType}`}
              date={dateStr}
              slotType={slotType}
              meal={meals.find((meal) => meal.slot_type === slotType) ?? null}
            />
          ))}
          {customMeals.map((meal) => (
            <MealSlotCard
              key={meal.id}
              date={dateStr}
              slotType="custom"
              slotName={meal.slot_name}
              meal={meal}
            />
          ))}
        </div>
      )}

      <ImportPlanningDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        date={dateStr}
      />

      <ExportJournalDialog open={isExportOpen} onOpenChange={setIsExportOpen} />
    </div>
  );
};

export default FoodJournal;
