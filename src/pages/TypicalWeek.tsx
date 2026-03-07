import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTypicalWeekMeals, useAddTypicalWeekMeal, groupTypicalWeekBySlot, TypicalWeekSlotData } from '@/hooks/useTypicalWeek';
import TypicalWeekSlot from '@/components/mealplanning/TypicalWeekSlot';
import { useAuth } from '@/contexts/AuthContext';
import { MealType } from '@/hooks/useMealPlans';
const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAYS_OF_WEEK_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MEAL_TYPES: MealType[] = ['morning', 'noon', 'evening'];

const TypicalWeek = () => {
  const { user, loading } = useAuth();
  const { data: meals = [], isLoading } = useTypicalWeekMeals();
  const addMeal = useAddTypicalWeekMeal();

  const mealSlots = useMemo(() => groupTypicalWeekBySlot(meals), [meals]);

  const getSlotData = (dayOfWeek: number, mealType: MealType): TypicalWeekSlotData | undefined => {
    const key = `${dayOfWeek}-${mealType}`;
    return mealSlots.get(key);
  };

  const handleAddMeal = (dayOfWeek: number, mealType: MealType, recipeId: string, servings: number) => {
    addMeal.mutate({ day_of_week: dayOfWeek, meal_type: mealType, recipe_id: recipeId, servings });
  };

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Link to="/meal-planning">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl md:text-2xl font-bold">Semaine type</h1>
      </div>

      {/* Desktop: Week Grid */}
      <Card className="hidden md:flex flex-1 flex-col min-h-0">
        <CardContent className="flex-1 pt-4 pb-2 overflow-auto">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">Chargement...</div>
          ) : (
            <div className="grid grid-cols-7 gap-2 h-full">
              {DAYS_OF_WEEK.map((day, dayIndex) => (
                <div key={dayIndex} className="flex flex-col h-full min-h-0">
                  {/* Day header */}
                  <div className="text-center pb-2 flex-shrink-0">
                    <p className="text-sm font-medium">{day}</p>
                  </div>

                  {/* Meal slots */}
                  <div className="flex-1 flex flex-col gap-2 min-h-0">
                    {MEAL_TYPES.map((mealType) => (
                      <div key={`${dayIndex}-${mealType}`} className="flex-1 min-h-0">
                        <TypicalWeekSlot
                          dayOfWeek={dayIndex}
                          mealType={mealType}
                          slotData={getSlotData(dayIndex, mealType)}
                          onAddMeal={handleAddMeal}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile: Vertical day cards */}
      <div className="md:hidden flex-1 overflow-auto space-y-4 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center text-muted-foreground py-8">Chargement...</div>
        ) : (
          DAYS_OF_WEEK_FULL.map((day, dayIndex) => (
            <Card key={dayIndex}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-base font-semibold">{day}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                {MEAL_TYPES.map((mealType) => (
                  <div key={mealType}>
                    <TypicalWeekSlot
                      dayOfWeek={dayIndex}
                      mealType={mealType}
                      slotData={getSlotData(dayIndex, mealType)}
                      onAddMeal={handleAddMeal}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default TypicalWeek;
