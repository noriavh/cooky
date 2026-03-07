import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserFamily } from './useFamilies';

// Check if user can edit a recipe (owner or family member)
export const useCanEditRecipe = (recipeId: string | undefined, ownerId: string | undefined) => {
  const { user } = useAuth();
  const { data: family } = useUserFamily();

  return useQuery({
    queryKey: ['can-edit-recipe', recipeId, user?.id],
    queryFn: async () => {
      if (!recipeId || !user) return false;
      
      // If user is owner, they can edit
      if (user.id === ownerId) {
        return true;
      }
      
      // If recipe belongs to user's family, they can edit
      const { data: recipe } = await supabase
        .from('recipes')
        .select('family_id')
        .eq('id', recipeId)
        .single();
      
      if (recipe?.family_id && family?.id && recipe.family_id === family.id) {
        return true;
      }
      
      return false;
    },
    enabled: !!recipeId && !!user,
  });
};

// Check if user can edit a list (owner or family member)
export const useCanEditList = (listId: string | undefined, ownerId: string | undefined) => {
  const { user } = useAuth();
  const { data: family } = useUserFamily();

  return useQuery({
    queryKey: ['can-edit-list', listId, user?.id],
    queryFn: async () => {
      if (!listId || !user) return false;
      
      // If user is owner, they can edit
      if (user.id === ownerId) {
        return true;
      }
      
      // If list belongs to user's family, they can edit
      const { data: list } = await supabase
        .from('recipe_lists')
        .select('family_id')
        .eq('id', listId)
        .single();
      
      if (list?.family_id && family?.id && list.family_id === family.id) {
        return true;
      }
      
      return false;
    },
    enabled: !!listId && !!user,
  });
};
