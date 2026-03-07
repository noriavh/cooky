import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserFamily } from './useFamilies';
import { Tables } from '@/integrations/supabase/types';

export type EssentialProduct = Tables<'essential_products'> & {
  shopping_products?: Tables<'shopping_products'> & {
    aisles?: Tables<'aisles'> | null;
    units?: Tables<'units'> | null;
  };
  units?: Tables<'units'> | null;
};

export const useEssentialProducts = () => {
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useUserFamily();

  return useQuery({
    queryKey: ['essential-products', user?.id, family?.id ?? 'personal'],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('essential_products')
        .select(`
          *,
          shopping_products (
            *,
            aisles (*),
            units (*)
          ),
          units (*)
        `)
        .order('created_at', { ascending: true });

      if (family) {
        query = query.eq('family_id', family.id);
      } else {
        query = query.eq('user_id', user.id).is('family_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as EssentialProduct[];
    },
    enabled: !!user && !familyLoading,
  });
};

export const useAddEssentialProduct = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family } = useUserFamily();

  return useMutation({
    mutationFn: async (product: {
      product_id: string;
      quantity?: number;
      unit_id?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('essential_products')
        .insert({
          user_id: user.id,
          family_id: family?.id || null,
          product_id: product.product_id,
          quantity: product.quantity || null,
          unit_id: product.unit_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['essential-products'] });
    },
  });
};

export const useUpdateEssentialProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quantity, unit_id }: { id: string; quantity?: number; unit_id?: string }) => {
      const { error } = await supabase
        .from('essential_products')
        .update({ quantity, unit_id })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['essential-products'] });
    },
  });
};

export const useDeleteEssentialProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('essential_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['essential-products'] });
    },
  });
};

export const useAddEssentialsToShoppingList = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family } = useUserFamily();

  return useMutation({
    mutationFn: async (essentials: EssentialProduct[]) => {
      if (!user) throw new Error('User not authenticated');

      const items = essentials.map((essential) => ({
        user_id: user.id,
        family_id: family?.id || null,
        name: essential.shopping_products?.name || 'Produit',
        product_id: essential.product_id,
        quantity: essential.quantity || null,
        unit_id: essential.unit_id || null,
        aisle_id: essential.shopping_products?.aisle_id || null,
        checked: false,
      }));

      const { error } = await supabase
        .from('shopping_list_items')
        .insert(items);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    },
  });
};
