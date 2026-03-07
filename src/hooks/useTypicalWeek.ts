import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserFamily } from './useFamilies';
import { MealType, MealPlanRecipe } from './useMealPlans';

export interface TypicalWeekMeal {
  id: string;
  user_id: string;
  family_id: string | null;
  day_of_week: number; // 0 = Monday, 6 = Sunday
  meal_type: MealType;
  recipe_id: string;
  servings: number;
  created_at: string;
  updated_at: string;
  recipes?: MealPlanRecipe;
}

export interface TypicalWeekSlotData {
  day_of_week: number;
  meal_type: MealType;
  servings: number;
  meals: TypicalWeekMeal[];
}

export const useTypicalWeekMeals = () => {
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useUserFamily();

  return useQuery({
    queryKey: ['typical-week-meals', user?.id, family?.id ?? 'personal'],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('typical_week_meals')
        .select(`
          *,
          recipes (
            id,
            title,
            image_url,
            servings,
            ingredients (
              id,
              name,
              quantity,
              unit_id,
              product_id,
              units (*),
              shopping_products (*)
            )
          )
        `)
        .order('day_of_week', { ascending: true })
        .order('created_at', { ascending: true });

      if (family) {
        query = query.eq('family_id', family.id);
      } else {
        query = query.eq('user_id', user.id).is('family_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TypicalWeekMeal[];
    },
    enabled: !!user && !familyLoading,
  });
};

// Helper to group typical week meals by slot (day_of_week + meal_type)
export const groupTypicalWeekBySlot = (meals: TypicalWeekMeal[]): Map<string, TypicalWeekSlotData> => {
  const slots = new Map<string, TypicalWeekSlotData>();

  for (const meal of meals) {
    const key = `${meal.day_of_week}-${meal.meal_type}`;
    if (!slots.has(key)) {
      slots.set(key, {
        day_of_week: meal.day_of_week,
        meal_type: meal.meal_type as MealType,
        servings: meal.servings,
        meals: [],
      });
    }
    slots.get(key)!.meals.push(meal);
  }

  return slots;
};

export const useAddTypicalWeekMeal = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family } = useUserFamily();

  return useMutation({
    mutationFn: async (meal: {
      day_of_week: number;
      meal_type: MealType;
      recipe_id: string;
      servings: number;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('typical_week_meals')
        .insert({
          user_id: user.id,
          family_id: family?.id || null,
          day_of_week: meal.day_of_week,
          meal_type: meal.meal_type,
          recipe_id: meal.recipe_id,
          servings: meal.servings,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['typical-week-meals'] });
    },
  });
};

export const useUpdateTypicalWeekSlotServings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useUserFamily();

  return useMutation({
    mutationFn: async ({ dayOfWeek, mealType, servings }: { dayOfWeek: number; mealType: MealType; servings: number }) => {
      if (!user) throw new Error('User not authenticated');
      if (familyLoading) throw new Error('Family loading');

      let query = supabase
        .from('typical_week_meals')
        .update({ servings })
        .eq('day_of_week', dayOfWeek)
        .eq('meal_type', mealType);

      if (family) {
        query = query.eq('family_id', family.id);
      } else {
        query = query.eq('user_id', user.id).is('family_id', null);
      }

      const { error } = await query;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['typical-week-meals'] });
    },
  });
};

export const useDeleteTypicalWeekMeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('typical_week_meals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['typical-week-meals'] });
    },
  });
};

export const useClearTypicalWeekSlot = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useUserFamily();

  return useMutation({
    mutationFn: async ({ dayOfWeek, mealType }: { dayOfWeek: number; mealType: MealType }) => {
      if (!user) throw new Error('User not authenticated');
      if (familyLoading) throw new Error('Family loading');

      let query = supabase
        .from('typical_week_meals')
        .delete()
        .eq('day_of_week', dayOfWeek)
        .eq('meal_type', mealType);

      if (family) {
        query = query.eq('family_id', family.id);
      } else {
        query = query.eq('user_id', user.id).is('family_id', null);
      }

      const { error } = await query;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['typical-week-meals'] });
    },
  });
};
