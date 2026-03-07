import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserFamily } from './useFamilies';
import type { Tables } from '@/integrations/supabase/types';

export type Aisle = Tables<'aisles'>;

export interface AisleWithOrder extends Aisle {
  customPosition: number;
}

export const useAislesWithOrder = () => {
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useUserFamily();

  return useQuery({
    queryKey: ['aisles-with-order', user?.id, family?.id ?? 'personal'],
    queryFn: async () => {
      if (!user) return [];

      // Fetch all aisles
      const { data: aisles, error: aislesError } = await supabase
        .from('aisles')
        .select('*')
        .order('position');

      if (aislesError) throw aislesError;

      // Fetch custom orders for user/family
      let orderQuery = supabase
        .from('user_aisle_orders')
        .select('*');

      if (family) {
        orderQuery = orderQuery.eq('family_id', family.id);
      } else {
        orderQuery = orderQuery.eq('user_id', user.id).is('family_id', null);
      }

      const { data: customOrders, error: ordersError } = await orderQuery;

      if (ordersError) throw ordersError;

      // Map custom positions to aisles
      const orderMap = new Map<string, number>();
      customOrders?.forEach(order => {
        orderMap.set(order.aisle_id, order.position);
      });

      // Create aisles with custom positions (fallback to default position)
      const aislesWithOrder: AisleWithOrder[] = aisles.map(aisle => ({
        ...aisle,
        customPosition: orderMap.has(aisle.id) ? orderMap.get(aisle.id)! : aisle.position,
      }));

      // Sort by custom position
      return aislesWithOrder.sort((a, b) => a.customPosition - b.customPosition);
    },
    enabled: !!user && !familyLoading,
  });
};

export const useSaveAisleOrders = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family } = useUserFamily();

  return useMutation({
    mutationFn: async (aisleOrders: { aisleId: string; position: number }[]) => {
      if (!user) throw new Error('User not authenticated');

      // Delete existing orders first
      let deleteQuery = supabase
        .from('user_aisle_orders')
        .delete();

      if (family) {
        deleteQuery = deleteQuery.eq('family_id', family.id);
      } else {
        deleteQuery = deleteQuery.eq('user_id', user.id).is('family_id', null);
      }

      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;

      // Insert new orders
      const newOrders = aisleOrders.map(order => ({
        aisle_id: order.aisleId,
        user_id: user.id,
        family_id: family?.id || null,
        position: order.position,
      }));

      const { error: insertError } = await supabase
        .from('user_aisle_orders')
        .insert(newOrders);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aisles-with-order'] });
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    },
  });
};
