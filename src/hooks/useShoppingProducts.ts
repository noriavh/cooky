import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserFamily } from './useFamilies';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { includesNormalized } from '@/lib/stringUtils';

export type ShoppingProduct = Tables<'shopping_products'> & {
  aisles?: Tables<'aisles'> | null;
  units?: Tables<'units'> | null;
};

export const useShoppingProducts = () => {
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useUserFamily();

  return useQuery({
    queryKey: ['shopping-products', user?.id, family?.id ?? 'personal'],
    queryFn: async () => {
      if (!user) return [];

      // RLS handles the filtering - get global products plus user's or family's products
      const { data, error } = await supabase
        .from('shopping_products')
        .select(`
          *,
          aisles (*),
          units (*)
        `)
        .order('name');

      if (error) throw error;
      return data as ShoppingProduct[];
    },
    enabled: !!user && !familyLoading,
  });
};

export const useSearchShoppingProducts = (searchTerm: string) => {
  const { user } = useAuth();
  const { data: allProducts } = useShoppingProducts();

  return useQuery({
    queryKey: ['shopping-products-search', user?.id, searchTerm, allProducts?.length],
    queryFn: async () => {
      if (!user || !searchTerm.trim() || !allProducts) return [];

      // Client-side filtering with accent-insensitive search
      return allProducts
        .filter(product => includesNormalized(product.name, searchTerm))
        .slice(0, 10);
    },
    enabled: !!user && searchTerm.trim().length > 0 && !!allProducts,
  });
};

export const useCreateShoppingProduct = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family } = useUserFamily();

  return useMutation({
    mutationFn: async (product: Omit<TablesInsert<'shopping_products'>, 'user_id' | 'family_id'>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('shopping_products')
        .insert({ 
          ...product, 
          user_id: user.id,
          family_id: family?.id || null,
        })
        .select(`
          *,
          aisles (*),
          units (*)
        `)
        .single();

      if (error) throw error;
      return data as ShoppingProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-products'] });
    },
  });
};

export const useUpdateShoppingProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesInsert<'shopping_products'>>) => {
      const { data, error } = await supabase
        .from('shopping_products')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          aisles (*),
          units (*)
        `)
        .single();

      if (error) throw error;
      return data as ShoppingProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-products'] });
    },
  });
};

export const useDeleteShoppingProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shopping_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-products'] });
    },
  });
};

export const useGetOrCreateProduct = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family } = useUserFamily();

  return useMutation({
    mutationFn: async (product: { name: string; unit_id?: string | null; aisle_id?: string | null }) => {
      if (!user) throw new Error('User not authenticated');

      // First try to find existing global product (user_id IS NULL)
      const { data: globalProduct } = await supabase
        .from('shopping_products')
        .select(`*, aisles (*), units (*)`)
        .is('user_id', null)
        .is('family_id', null)
        .ilike('name', product.name)
        .single();

      if (globalProduct) {
        return globalProduct as ShoppingProduct;
      }

      // Then try to find family or user product
      if (family) {
        const { data: familyProduct } = await supabase
          .from('shopping_products')
          .select(`*, aisles (*), units (*)`)
          .eq('family_id', family.id)
          .ilike('name', product.name)
          .single();

        if (familyProduct) {
          return familyProduct as ShoppingProduct;
        }
      } else {
        const { data: userProduct } = await supabase
          .from('shopping_products')
          .select(`*, aisles (*), units (*)`)
          .eq('user_id', user.id)
          .is('family_id', null)
          .ilike('name', product.name)
          .single();

        if (userProduct) {
          return userProduct as ShoppingProduct;
        }
      }

      // Create new product
      const { data, error } = await supabase
        .from('shopping_products')
        .insert({
          user_id: user.id,
          family_id: family?.id || null,
          name: product.name,
          unit_id: product.unit_id || null,
          aisle_id: product.aisle_id || null,
        })
        .select(`*, aisles (*), units (*)`)
        .single();

      if (error) throw error;
      return data as ShoppingProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-products'] });
    },
  });
};
