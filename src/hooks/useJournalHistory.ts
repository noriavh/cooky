import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { JournalSlotType, JournalScore } from '@/lib/journal';

export interface ProductStats {
  productId: string;
  productName: string;
  total: number;
  green: number;
  orange: number;
  red: number;
  unscored: number;
  greenPct: number;
  orangePct: number;
  redPct: number;
  firstDate: string;
  lastDate: string;
}

interface StatsRow {
  product_id: string;
  shopping_products: { id: string; name: string } | null;
  journal_meals: { date: string; score: JournalScore | null; user_id: string };
}

export const useJournalProductStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['journal-product-stats', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('journal_meal_items')
        .select('product_id, shopping_products (id, name), journal_meals!inner (date, score, user_id)')
        .eq('journal_meals.user_id', user.id);

      if (error) throw error;

      const byProduct = new Map<string, ProductStats>();
      for (const row of data as unknown as StatsRow[]) {
        const { date, score } = row.journal_meals;
        let stats = byProduct.get(row.product_id);
        if (!stats) {
          stats = {
            productId: row.product_id,
            productName: row.shopping_products?.name ?? 'Produit inconnu',
            total: 0,
            green: 0,
            orange: 0,
            red: 0,
            unscored: 0,
            greenPct: 0,
            orangePct: 0,
            redPct: 0,
            firstDate: date,
            lastDate: date,
          };
          byProduct.set(row.product_id, stats);
        }
        stats.total += 1;
        if (score) {
          stats[score] += 1;
        } else {
          stats.unscored += 1;
        }
        if (date < stats.firstDate) stats.firstDate = date;
        if (date > stats.lastDate) stats.lastDate = date;
      }

      for (const stats of byProduct.values()) {
        const scored = stats.green + stats.orange + stats.red;
        if (scored > 0) {
          stats.greenPct = (stats.green / scored) * 100;
          stats.orangePct = (stats.orange / scored) * 100;
          stats.redPct = (stats.red / scored) * 100;
        }
      }

      return [...byProduct.values()];
    },
    enabled: !!user,
  });
};

export interface ProductHistoryEntry {
  itemId: string;
  date: string;
  slotType: JournalSlotType;
  slotName: string | null;
  score: JournalScore | null;
  note: string | null;
  sourceRecipeTitle: string | null;
}

interface HistoryRow {
  id: string;
  source_recipe_id: string | null;
  recipes: { title: string } | null;
  journal_meals: {
    date: string;
    slot_type: JournalSlotType;
    slot_name: string | null;
    score: JournalScore | null;
    note: string | null;
    user_id: string;
  };
}

export const useJournalProductHistory = (productId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['journal-product-history', user?.id, productId],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('journal_meal_items')
        .select('id, source_recipe_id, recipes (title), journal_meals!inner (date, slot_type, slot_name, score, note, user_id)')
        .eq('product_id', productId)
        .eq('journal_meals.user_id', user.id);

      if (error) throw error;

      const entries: ProductHistoryEntry[] = (data as unknown as HistoryRow[]).map((row) => ({
        itemId: row.id,
        date: row.journal_meals.date,
        slotType: row.journal_meals.slot_type,
        slotName: row.journal_meals.slot_name,
        score: row.journal_meals.score,
        note: row.journal_meals.note,
        sourceRecipeTitle: row.recipes?.title ?? null,
      }));

      return entries.sort((a, b) => b.date.localeCompare(a.date));
    },
    enabled: !!user && !!productId,
  });
};

export interface JournalExportEntry {
  date: string;
  slotType: JournalSlotType;
  slotName: string | null;
  productName: string;
  score: JournalScore | null;
  note: string | null;
  sourceRecipeTitle: string | null;
}

interface ExportRow extends Omit<HistoryRow, 'id' | 'source_recipe_id'> {
  shopping_products: { name: string } | null;
}

export const fetchJournalExportEntries = async (
  userId: string,
  from?: string,
  to?: string,
): Promise<JournalExportEntry[]> => {
  let query = supabase
    .from('journal_meal_items')
    .select('shopping_products (name), recipes (title), journal_meals!inner (date, slot_type, slot_name, score, note, user_id)')
    .eq('journal_meals.user_id', userId);

  if (from) query = query.gte('journal_meals.date', from);
  if (to) query = query.lte('journal_meals.date', to);

  const { data, error } = await query;
  if (error) throw error;

  return (data as unknown as ExportRow[]).map((row) => ({
    date: row.journal_meals.date,
    slotType: row.journal_meals.slot_type,
    slotName: row.journal_meals.slot_name,
    productName: row.shopping_products?.name ?? 'Produit inconnu',
    score: row.journal_meals.score,
    note: row.journal_meals.note,
    sourceRecipeTitle: row.recipes?.title ?? null,
  }));
};
