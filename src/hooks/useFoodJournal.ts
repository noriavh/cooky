import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { JournalSlotType, JournalScore } from '@/lib/journal';

export interface JournalMealItem {
  id: string;
  meal_id: string;
  product_id: string;
  source_recipe_id: string | null;
  created_at: string;
  shopping_products: { id: string; name: string } | null;
  recipes: { id: string; title: string } | null;
}

export interface JournalMeal {
  id: string;
  user_id: string;
  date: string;
  slot_type: JournalSlotType;
  slot_name: string | null;
  score: JournalScore | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  journal_meal_items: JournalMealItem[];
}

const JOURNAL_QUERY_KEYS = [
  ['journal-meals'],
  ['journal-slot-names'],
  ['journal-product-stats'],
  ['journal-product-history'],
] as const;

const invalidateJournal = (queryClient: ReturnType<typeof useQueryClient>) => {
  for (const key of JOURNAL_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: [...key] });
  }
};

const MEAL_SELECT = `
  *,
  journal_meal_items (
    *,
    shopping_products (id, name),
    recipes (id, title)
  )
`;

export const useJournalDay = (date: Date) => {
  const { user } = useAuth();
  const dateStr = format(date, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['journal-meals', user?.id, dateStr],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('journal_meals')
        .select(MEAL_SELECT)
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as JournalMeal[];
    },
    enabled: !!user,
  });
};

export const useJournalRange = (from: Date, to: Date) => {
  const { user } = useAuth();
  const fromStr = format(from, 'yyyy-MM-dd');
  const toStr = format(to, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['journal-meals', user?.id, 'range', fromStr, toStr],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('journal_meals')
        .select(MEAL_SELECT)
        .eq('user_id', user.id)
        .gte('date', fromStr)
        .lte('date', toStr)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as unknown as JournalMeal[];
    },
    enabled: !!user,
  });
};

export const useJournalSlotNames = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['journal-slot-names', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('journal_meals')
        .select('slot_name')
        .eq('user_id', user.id)
        .eq('slot_type', 'custom');

      if (error) throw error;

      const seen = new Set<string>();
      const names: string[] = [];
      for (const row of data) {
        if (!row.slot_name) continue;
        const key = row.slot_name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        names.push(row.slot_name);
      }
      return names.sort((a, b) => a.localeCompare(b, 'fr'));
    },
    enabled: !!user,
  });
};

export const useGetOrCreateJournalMeal = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ date, slotType, slotName }: {
      date: string;
      slotType: JournalSlotType;
      slotName?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const findExisting = async () => {
        let query = supabase
          .from('journal_meals')
          .select(MEAL_SELECT)
          .eq('user_id', user.id)
          .eq('date', date)
          .eq('slot_type', slotType);

        if (slotType === 'custom') {
          query = query.ilike('slot_name', slotName ?? '');
        }

        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        return data as unknown as JournalMeal | null;
      };

      const existing = await findExisting();
      if (existing) return existing;

      const { data, error } = await supabase
        .from('journal_meals')
        .insert({
          user_id: user.id,
          date,
          slot_type: slotType,
          slot_name: slotType === 'custom' ? slotName?.trim() : null,
        })
        .select(MEAL_SELECT)
        .single();

      if (error) {
        if (error.code === '23505') {
          const raced = await findExisting();
          if (raced) return raced;
        }
        throw error;
      }
      return data as unknown as JournalMeal;
    },
    onSuccess: () => {
      invalidateJournal(queryClient);
    },
  });
};

export const useAddJournalItems = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mealId, items }: {
      mealId: string;
      items: { productId: string; sourceRecipeId?: string | null }[];
    }) => {
      const uniqueByProduct = new Map<string, { productId: string; sourceRecipeId?: string | null }>();
      for (const item of items) {
        if (!uniqueByProduct.has(item.productId)) {
          uniqueByProduct.set(item.productId, item);
        }
      }

      const rows = [...uniqueByProduct.values()].map((item) => ({
        meal_id: mealId,
        product_id: item.productId,
        source_recipe_id: item.sourceRecipeId ?? null,
      }));

      if (rows.length === 0) return;

      const { error } = await supabase
        .from('journal_meal_items')
        .upsert(rows, { onConflict: 'meal_id,product_id', ignoreDuplicates: true });

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateJournal(queryClient);
    },
  });
};

export const useRemoveJournalItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('journal_meal_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateJournal(queryClient);
    },
  });
};

export const useUpdateJournalMeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, score, note }: {
      id: string;
      score?: JournalScore | null;
      note?: string | null;
    }) => {
      const patch: { score?: JournalScore | null; note?: string | null } = {};
      if (score !== undefined) patch.score = score;
      if (note !== undefined) patch.note = note;

      const { error } = await supabase
        .from('journal_meals')
        .update(patch)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateJournal(queryClient);
    },
  });
};

export const useDeleteJournalMeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('journal_meals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateJournal(queryClient);
    },
  });
};
