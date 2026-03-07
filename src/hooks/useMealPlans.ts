import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserFamily } from './useFamilies';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export type MealType = 'morning' | 'noon' | 'evening';

export interface MealPlanRecipe {
  id: string;
  title: string;
  image_url: string | null;
  servings: number | null;
  ingredients: {
    id: string;
    name: string;
    quantity: number | null;
    unit_id: string | null;
    product_id: string | null;
    units: { id: string; name: string; abbreviation: string | null } | null;
    shopping_products: { 
      id: string; 
      name: string; 
      aisle_id: string | null;
      unit_id: string | null;
    } | null;
  }[];
}

export interface MealPlan {
  id: string;
  user_id: string;
  family_id: string | null;
  date: string;
  meal_type: MealType;
  recipe_id: string | null;
  custom_text: string | null;
  servings: number;
  created_at: string;
  updated_at: string;
  recipes?: MealPlanRecipe | null;
}

// Grouped meal plans by date and meal_type
export interface MealSlotData {
  date: string;
  meal_type: MealType;
  servings: number;
  mealPlans: MealPlan[];
}

export const useMealPlans = (weekStart: Date) => {
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useUserFamily();
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  
  return useQuery({
    queryKey: ['meal-plans', user?.id, family?.id ?? 'personal', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('meal_plans')
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
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

      if (family) {
        query = query.eq('family_id', family.id);
      } else {
        query = query.eq('user_id', user.id).is('family_id', null);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as MealPlan[];
    },
    enabled: !!user && !familyLoading,
  });
};

// Helper to group meal plans by slot (date + meal_type)
export const groupMealPlansBySlot = (mealPlans: MealPlan[]): Map<string, MealSlotData> => {
  const slots = new Map<string, MealSlotData>();
  
  for (const plan of mealPlans) {
    const key = `${plan.date}-${plan.meal_type}`;
    if (!slots.has(key)) {
      slots.set(key, {
        date: plan.date,
        meal_type: plan.meal_type as MealType,
        servings: plan.servings,
        mealPlans: [],
      });
    }
    slots.get(key)!.mealPlans.push(plan);
  }
  
  return slots;
};

export const useAddMealPlan = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family } = useUserFamily();

  return useMutation({
    mutationFn: async (mealPlan: { 
      date: string; 
      meal_type: MealType; 
      recipe_id?: string | null;
      custom_text?: string | null;
      servings: number;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('meal_plans')
        .insert({
          user_id: user.id,
          family_id: family?.id || null,
          date: mealPlan.date,
          meal_type: mealPlan.meal_type,
          recipe_id: mealPlan.recipe_id || null,
          custom_text: mealPlan.custom_text || null,
          servings: mealPlan.servings,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
    },
  });
};

// Update servings for all meal plans in a slot
export const useUpdateSlotServings = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useUserFamily();

  return useMutation({
    mutationFn: async ({ date, mealType, servings }: { date: string; mealType: MealType; servings: number }) => {
      if (!user) throw new Error('User not authenticated');
      if (familyLoading) throw new Error('Family loading');

      let query = supabase
        .from('meal_plans')
        .update({ servings })
        .eq('date', date)
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
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
    },
  });
};

export const useUpdateMealPlanServings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, servings }: { id: string; servings: number }) => {
      const { error } = await supabase
        .from('meal_plans')
        .update({ servings })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
    },
  });
};

export const useDeleteMealPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
    },
  });
};

export const useUpdateMealPlanCustomText = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, customText }: { id: string; customText: string }) => {
      const { error } = await supabase
        .from('meal_plans')
        .update({ custom_text: customText })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
    },
  });
};

// Delete all meal plans in a slot
export const useClearSlot = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useUserFamily();

  return useMutation({
    mutationFn: async ({ date, mealType }: { date: string; mealType: MealType }) => {
      if (!user) throw new Error('User not authenticated');
      if (familyLoading) throw new Error('Family loading');

      let query = supabase
        .from('meal_plans')
        .delete()
        .eq('date', date)
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
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
    },
  });
};

// Move all meal plans from one slot to another
export const useMoveSlot = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useUserFamily();

  return useMutation({
    mutationFn: async ({ 
      fromDate, 
      fromMealType, 
      toDate, 
      toMealType 
    }: { 
      fromDate: string; 
      fromMealType: MealType; 
      toDate: string; 
      toMealType: MealType;
    }) => {
      if (!user) throw new Error('User not authenticated');
      if (familyLoading) throw new Error('Family loading');

      // Build query to select meal plans from source slot
      let selectQuery = supabase
        .from('meal_plans')
        .select('id')
        .eq('date', fromDate)
        .eq('meal_type', fromMealType);

      if (family) {
        selectQuery = selectQuery.eq('family_id', family.id);
      } else {
        selectQuery = selectQuery.eq('user_id', user.id).is('family_id', null);
      }

      const { data: mealPlansToMove, error: selectError } = await selectQuery;
      if (selectError) throw selectError;
      if (!mealPlansToMove || mealPlansToMove.length === 0) return;

      // Update all meal plans to the new date and meal_type
      const ids = mealPlansToMove.map(mp => mp.id);
      const { error: updateError } = await supabase
        .from('meal_plans')
        .update({ date: toDate, meal_type: toMealType })
        .in('id', ids);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
    },
  });
};
