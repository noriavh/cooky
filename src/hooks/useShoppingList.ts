import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserFamily } from './useFamilies';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Aisle = Tables<'aisles'>;

export type ShoppingListItem = Tables<'shopping_list_items'> & {
  aisles?: Aisle | null;
  units?: Tables<'units'> | null;
};

export const useAisles = () => {
  return useQuery({
    queryKey: ['aisles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aisles')
        .select('*')
        .order('position');

      if (error) throw error;
      return data as Aisle[];
    },
  });
};

export const useShoppingList = () => {
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useUserFamily();

  return useQuery({
    queryKey: ['shopping-list', user?.id, family?.id ?? 'personal'],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('shopping_list_items')
        .select(`
          *,
          aisles (*),
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
      return data as ShoppingListItem[];
    },
    enabled: !!user && !familyLoading,
  });
};

export const useAddShoppingListItem = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family } = useUserFamily();

  return useMutation({
    mutationFn: async (item: Omit<TablesInsert<'shopping_list_items'>, 'user_id' | 'family_id'>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('shopping_list_items')
        .insert({ 
          ...item, 
          user_id: user.id,
          family_id: family?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    },
  });
};

export const useAddMultipleShoppingListItems = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family } = useUserFamily();

  return useMutation({
    mutationFn: async (items: Omit<TablesInsert<'shopping_list_items'>, 'user_id' | 'family_id'>[]) => {
      if (!user) throw new Error('User not authenticated');

      const itemsWithUserAndFamily = items.map(item => ({ 
        ...item, 
        user_id: user.id,
        family_id: family?.id || null,
      }));

      const { data, error } = await supabase
        .from('shopping_list_items')
        .insert(itemsWithUserAndFamily)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    },
  });
};

export const useUpdateShoppingListItem = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family } = useUserFamily();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesInsert<'shopping_list_items'>>) => {
      const { data, error } = await supabase
        .from('shopping_list_items')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          aisles (*),
          units (*)
        `)
        .single();

      if (error) throw error;
      return data as ShoppingListItem;
    },
    // Optimistic update for instant UI feedback
    onMutate: async (newItem) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['shopping-list'] });

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData<ShoppingListItem[]>(['shopping-list', user?.id, family?.id ?? 'personal']);

      // Optimistically update to the new value
      if (previousItems) {
        queryClient.setQueryData<ShoppingListItem[]>(
          ['shopping-list', user?.id, family?.id ?? 'personal'],
          previousItems.map(item =>
            item.id === newItem.id ? { ...item, ...newItem } : item
          )
        );
      }

      // Return a context object with the snapshotted value
      return { previousItems };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (_err, _newItem, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(
          ['shopping-list', user?.id, family?.id ?? 'personal'],
          context.previousItems
        );
      }
    },
    // Always refetch after error or success to ensure we have the correct data
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    },
  });
};

export const useDeleteShoppingListItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    },
  });
};

export const useClearCheckedItems = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useUserFamily();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      if (familyLoading) throw new Error('Family loading');

      let query = supabase
        .from('shopping_list_items')
        .delete()
        .eq('checked', true);

      if (family) {
        query = query.eq('family_id', family.id);
      } else {
        query = query.eq('user_id', user.id).is('family_id', null);
      }

      const { error } = await query;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    },
  });
};

export const useClearAllItems = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useUserFamily();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      if (familyLoading) throw new Error('Family loading');

      let query = supabase
        .from('shopping_list_items')
        .delete();

      if (family) {
        query = query.eq('family_id', family.id);
      } else {
        query = query.eq('user_id', user.id).is('family_id', null);
      }

      const { error } = await query;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    },
  });
};
