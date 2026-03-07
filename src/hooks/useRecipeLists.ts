import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserFamily } from './useFamilies';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type RecipeListRecipe = Tables<'recipes'> & {
  origins?: Tables<'origins'> | null;
  recipe_tags?: { tags: Tables<'tags'> }[];
};

export type RecipeList = Tables<'recipe_lists'> & {
  recipe_list_items?: { recipes: RecipeListRecipe | null }[];
};

export const useRecipeLists = () => {
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useUserFamily();

  return useQuery({
    queryKey: ['recipe-lists', user?.id, family?.id ?? 'personal'],
    queryFn: async () => {
      if (!user) return [];
      
      // RLS handles the filtering
      const { data, error } = await supabase
        .from('recipe_lists')
        .select(`
          *,
          recipe_list_items (
            recipes (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RecipeList[];
    },
    enabled: !!user && !familyLoading,
  });
};

export const useRecipeList = (id: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recipe-list', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('recipe_lists')
        .select(`
          *,
          recipe_list_items (
            recipes (
              *,
              origins (*),
              recipe_tags (tags (*))
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as RecipeList;
    },
    enabled: !!user && !!id,
  });
};

export const useCreateRecipeList = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family } = useUserFamily();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('recipe_lists')
        .insert({ 
          name, 
          owner_id: user.id,
          family_id: family?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-lists'] });
    },
  });
};

export const useDeleteRecipeList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recipe_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-lists'] });
    },
  });
};

export const useAddRecipeToList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, recipeId }: { listId: string; recipeId: string }) => {
      const { error } = await supabase
        .from('recipe_list_items')
        .insert({ list_id: listId, recipe_id: recipeId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-lists'] });
      queryClient.invalidateQueries({ queryKey: ['recipe-list'] });
    },
  });
};

export const useRemoveRecipeFromList = () => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-lists'] });
      queryClient.invalidateQueries({ queryKey: ['recipe-list'] });
    },
  });
};

export const useUpdateRecipeList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('recipe_lists')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['recipe-lists'] });
      queryClient.invalidateQueries({ queryKey: ['recipe-list', id] });
    },
  });
};
