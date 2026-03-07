import { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ShoppingCart, CalendarDays, Copy, Settings } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useMealPlans, useAddMealPlan, useMoveSlot, MealType, groupMealPlansBySlot, MealSlotData } from '@/hooks/useMealPlans';
import { useProfile } from '@/hooks/useProfile';
import DraggableMealSlot from '@/components/mealplanning/DraggableMealSlot';
import MealSlot from '@/components/mealplanning/MealSlot';
import WeekShoppingListDialog from '@/components/mealplanning/WeekShoppingListDialog';
import ApplyTypicalWeekDialog from '@/components/mealplanning/ApplyTypicalWeekDialog';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAYS_OF_WEEK_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const ALL_MEAL_TYPES: MealType[] = ['morning', 'noon', 'evening'];
const MEAL_TYPE_LABELS: Record<MealType, string> = {
  morning: 'Matin',
  noon: 'Midi',
  evening: 'Soir',
};

const MealPlanning = () => {
  const { user, loading } = useAuth();
  const { data: profile } = useProfile();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [isShoppingDialogOpen, setIsShoppingDialogOpen] = useState(false);
  const [isApplyTypicalWeekOpen, setIsApplyTypicalWeekOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeDragData, setActiveDragData] = useState<MealSlotData | null>(null);

  const { data: mealPlans = [], isLoading } = useMealPlans(currentWeekStart);
  const addMealPlan = useAddMealPlan();
  const moveSlot = useMoveSlot();

  // Filter meal types based on user preferences
  const visibleMealTypes = useMemo(() => {
    if (!profile) return ALL_MEAL_TYPES; // Default to all while loading
    const types: MealType[] = [];
    if (profile.show_morning_meals) types.push('morning');
    if (profile.show_noon_meals) types.push('noon');
    if (profile.show_evening_meals) types.push('evening');
    // Fallback if somehow all are false
    return types.length > 0 ? types : ALL_MEAL_TYPES;
  }, [profile]);

  // Configure drag sensor with activation constraint
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activation
      },
    })
  );

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // Group meal plans by slot
  const mealSlots = useMemo(() => groupMealPlansBySlot(mealPlans), [mealPlans]);

  const getSlotData = (date: Date, mealType: MealType): MealSlotData | undefined => {
    const key = `${format(date, 'yyyy-MM-dd')}-${mealType}`;
    return mealSlots.get(key);
  };

  const handleAddMeal = (date: string, mealType: MealType, recipeId: string | null, servings: number, customText?: string) => {
    addMealPlan.mutate({ date, meal_type: mealType, recipe_id: recipeId, custom_text: customText, servings });
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    if (active?.data?.current?.slotData) {
      setActiveDragData(active.data.current.slotData);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragData(null);
    
    if (!over || active.id === over.id) return;

    const fromData = active.data.current as { date: string; mealType: MealType };
    const toData = over.data.current as { date: string; mealType: MealType };

    if (fromData && toData) {
      moveSlot.mutate({
        fromDate: fromData.date,
        fromMealType: fromData.mealType,
        toDate: toData.date,
        toMealType: toData.mealType,
      }, {
        onSuccess: () => {
          toast.success('Repas déplacé');
        },
        onError: () => {
          toast.error('Erreur lors du déplacement');
        },
      });
    }
  };

  const goToPreviousWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
      setIsCalendarOpen(false);
    }
  };

  const weekLabel = useMemo(() => {
    const start = format(currentWeekStart, 'd MMM', { locale: fr });
    const end = format(addDays(currentWeekStart, 6), 'd MMM yyyy', { locale: fr });
    return `${start} - ${end}`;
  }, [currentWeekStart]);

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] pb-20 md:pb-0">
        {/* Header with Week Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold">Ma semaine</h1>
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="font-medium text-xs md:text-sm">
                    <CalendarDays className="w-4 h-4 mr-1 md:mr-2" />
                    {weekLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={currentWeekStart}
                    onSelect={handleCalendarSelect}
                    locale={fr}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              
              <Button variant="ghost" size="icon" onClick={goToNextWeek}>
                <ChevronRight className="w-5 h-5" />
              </Button>
              
              <Button variant="ghost" size="sm" onClick={goToToday} className="hidden sm:flex">
                Aujourd'hui
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsApplyTypicalWeekOpen(true)}
              className="hidden sm:flex"
            >
              <Copy className="w-4 h-4 mr-2" />
              Appliquer semaine type
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsApplyTypicalWeekOpen(true)}
              className="sm:hidden"
            >
              <Copy className="w-4 h-4" />
            </Button>
            
            <Link to="/typical-week">
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="sm:hidden">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>

            <Button 
              onClick={() => setIsShoppingDialogOpen(true)}
              disabled={mealPlans.length === 0}
              size="sm"
              className="md:size-default"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Ajouter à la liste de courses</span>
              <span className="sm:hidden">Courses</span>
            </Button>
          </div>
        </div>

        {/* Desktop: Week Grid */}
        <Card className="hidden md:flex flex-1 flex-col min-h-0">
          <CardContent className="flex-1 pt-4 pb-2 overflow-auto">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">Chargement...</div>
            ) : (
              <div className="grid grid-cols-7 gap-2 h-full">
                {weekDates.map((date, dayIndex) => {
                  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  return (
                    <div key={dayIndex} className="flex flex-col h-full min-h-0">
                      {/* Day header */}
                      <div className="text-center pb-2 flex-shrink-0">
                        <p className={cn(
                          "text-sm font-medium",
                          isToday && "text-primary"
                        )}>
                          {DAYS_OF_WEEK[dayIndex]}
                        </p>
                        <p className={cn(
                          "text-xs",
                          isToday ? "text-primary font-bold" : "text-muted-foreground"
                        )}>
                          {format(date, 'd')}
                        </p>
                      </div>
                      
                      {/* Meal slots - fill remaining height */}
                      <div className="flex-1 flex flex-col gap-2 min-h-0">
                        {visibleMealTypes.map((mealType) => (
                          <div key={`${dayIndex}-${mealType}`} className="flex-1 min-h-0">
                            <DraggableMealSlot
                              date={format(date, 'yyyy-MM-dd')}
                              mealType={mealType}
                              slotData={getSlotData(date, mealType)}
                              onAddMeal={handleAddMeal}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mobile: Vertical day cards */}
        <div className="md:hidden flex-1 overflow-auto space-y-4 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center text-muted-foreground py-8">Chargement...</div>
          ) : (
            weekDates.map((date, dayIndex) => {
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              return (
                <Card key={dayIndex} className={cn(isToday && "ring-2 ring-primary")}>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className={cn(
                      "text-base font-semibold flex items-center justify-between",
                      isToday && "text-primary"
                    )}>
                      <span>{DAYS_OF_WEEK_FULL[dayIndex]}</span>
                      <span className={cn(
                        "text-sm font-normal",
                        isToday ? "text-primary" : "text-muted-foreground"
                      )}>
                        {format(date, 'd MMMM', { locale: fr })}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0 space-y-3">
                    {visibleMealTypes.map((mealType) => (
                      <div key={mealType}>
                        <DraggableMealSlot
                          date={format(date, 'yyyy-MM-dd')}
                          mealType={mealType}
                          slotData={getSlotData(date, mealType)}
                          onAddMeal={handleAddMeal}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Drag Overlay - shows what's being dragged */}
        <DragOverlay>
          {activeDragData ? (
            <div className="opacity-80 scale-105 shadow-xl pointer-events-none">
              <MealSlot
                date={activeDragData.date}
                mealType={activeDragData.meal_type}
                slotData={activeDragData}
                onAddMeal={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>

        {/* Shopping List Dialog */}
        <WeekShoppingListDialog
          open={isShoppingDialogOpen}
          onOpenChange={setIsShoppingDialogOpen}
          mealPlans={mealPlans}
        />

        {/* Apply Typical Week Dialog */}
        <ApplyTypicalWeekDialog
          open={isApplyTypicalWeekOpen}
          onOpenChange={setIsApplyTypicalWeekOpen}
          weekStart={currentWeekStart}
          existingMealPlans={mealPlans}
        />
      </div>
    </DndContext>
  );
};

export default MealPlanning;
