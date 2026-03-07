import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useRecipeFavorites = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recipe-favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('recipe_favorites')
        .select('recipe_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data.map(f => f.recipe_id);
    },
    enabled: !!user,
  });
};

export const useToggleFavorite = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recipeId, isFavorite }: { recipeId: string; isFavorite: boolean }) => {
      if (!user) throw new Error('User not authenticated');

      if (isFavorite) {
        // Remove favorite
        const { error } = await supabase
          .from('recipe_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('recipe_id', recipeId);
        
        if (error) throw error;
      } else {
        // Add favorite
        const { error } = await supabase
          .from('recipe_favorites')
          .insert({ user_id: user.id, recipe_id: recipeId });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-favorites'] });
    },
  });
};
