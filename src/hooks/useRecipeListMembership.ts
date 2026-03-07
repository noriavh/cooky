import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useRecipeListMembership = (recipeId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recipe-list-membership', recipeId],
    queryFn: async () => {
      if (!recipeId || !user) return [];
      
      const { data, error } = await supabase
        .from('recipe_list_items')
        .select(`
          list_id,
          recipe_lists (
            id,
            name,
            owner_id
          )
        `)
        .eq('recipe_id', recipeId);

      if (error) throw error;
      
      return data?.map(item => item.recipe_lists).filter(Boolean) || [];
    },
    enabled: !!recipeId && !!user,
  });
};

export const useAvailableLists = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['available-lists', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('recipe_lists')
        .select('id, name, owner_id')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const useAddRecipeToListMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, recipeId }: { listId: string; recipeId: string }) => {
      const { error } = await supabase
        .from('recipe_list_items')
        .insert({ list_id: listId, recipe_id: recipeId });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipe-list-membership', variables.recipeId] });
      queryClient.invalidateQueries({ queryKey: ['recipe-lists'] });
    },
  });
};

export const useRemoveRecipeFromListMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, recipeId }: { listId: string; recipeId: string }) => {
      const { error } = await supabase
        .from('recipe_list_items')
        .delete()
        .eq('list_id', listId)
        .eq('recipe_id', recipeId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipe-list-membership', variables.recipeId] });
      queryClient.invalidateQueries({ queryKey: ['recipe-lists'] });
    },
  });
};
