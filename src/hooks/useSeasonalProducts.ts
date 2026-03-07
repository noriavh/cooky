import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SeasonalProduct {
  id: string;
  name: string;
  aisle: { id: string; name: string; icon: string | null } | null;
  product_seasons: { month: number }[];
}

export const useSeasonalProducts = () => {
  return useQuery({
    queryKey: ['seasonal-products'],
    queryFn: async (): Promise<SeasonalProduct[]> => {
      // First get the "Fruits et légumes" aisle
      const { data: aisleData, error: aisleError } = await supabase
        .from('aisles')
        .select('id')
        .ilike('name', '%fruits et légumes%')
        .single();

      if (aisleError || !aisleData) {
        console.error('Could not find Fruits et légumes aisle:', aisleError);
        return [];
      }

      // Get all global products in that aisle with their seasons
      const { data, error } = await supabase
        .from('shopping_products')
        .select(`
          id,
          name,
          aisle:aisles(id, name, icon),
          product_seasons(month)
        `)
        .eq('aisle_id', aisleData.id)
        .is('user_id', null)
        .is('family_id', null)
        .order('name');

      if (error) {
        console.error('Error fetching seasonal products:', error);
        throw error;
      }

      return (data || []) as SeasonalProduct[];
    },
  });
};

export const useCurrentSeasonProducts = () => {
  const currentMonth = new Date().getMonth() + 1;
  const { data: products } = useSeasonalProducts();

  return useQuery({
    queryKey: ['current-season-products', currentMonth],
    queryFn: async () => {
      if (!products) return [];
      return products
        .filter(p => p.product_seasons?.some(s => s.month === currentMonth))
        .map(p => p.id);
    },
    enabled: !!products,
  });
};
