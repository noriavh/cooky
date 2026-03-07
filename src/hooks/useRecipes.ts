import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserFamily } from './useFamilies';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Ingredient = Tables<'ingredients'> & {
  units?: Tables<'units'> | null;
  shopping_products?: (Tables<'shopping_products'> & {
    units?: Tables<'units'> | null;
  }) | null;
};

export type RecipeOwner = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

export type Recipe = Tables<'recipes'> & {
  origins?: Tables<'origins'> | null;
  ingredients?: Ingredient[];
  steps?: Tables<'steps'>[];
  recipe_tags?: { tags: Tables<'tags'> }[];
  owner?: RecipeOwner | null;
  copied_from_id?: string | null;
};

// All accessible recipes (includes cookiers' recipes) - for Inspiration page
export const useRecipes = () => {
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useUserFamily();

  return useQuery({
    queryKey: ['recipes', user?.id, family?.id ?? 'personal'],
    queryFn: async () => {
      if (!user) return [];
      
      // First get my family id if any
      const myFamilyId = family?.id;
      
      // Get all cookier ids who share their recipes with me
      const { data: sentCookiers } = await supabase
        .from('cookiers')
        .select('cookier_id, cookier_shares_recipes')
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .eq('cookier_shares_recipes', true);
      
      const { data: receivedCookiers } = await supabase
        .from('cookiers')
        .select('user_id, user_shares_recipes')
        .eq('cookier_id', user.id)
        .eq('status', 'accepted')
        .eq('user_shares_recipes', true);
      
      const cookierIds = [
        ...(sentCookiers?.map(c => c.cookier_id) || []),
        ...(receivedCookiers?.map(c => c.user_id) || []),
      ];
      
      // Get family ids of cookiers to include family recipes too
      const { data: cookierFamilies } = cookierIds.length > 0
        ? await supabase
            .from('family_members')
            .select('family_id, user_id')
            .in('user_id', cookierIds)
        : { data: [] };
      
      const cookierFamilyIds = cookierFamilies?.map(f => f.family_id) || [];
      
      // Build the query - we need recipes where:
      // 1. I own it OR
      // 2. It's in my family OR
      // 3. Owner is a cookier who shares with me OR
      // 4. It's in a cookier's family who shares with me
      
      let query = supabase
        .from('recipes')
        .select(`
          *,
          origins (*),
          ingredients (*, units (*), shopping_products (*, units (*))),
          steps (*),
          recipe_tags (tags (*))
        `);
      
      // Build OR conditions
      const orConditions: string[] = [`owner_id.eq.${user.id}`];
      
      if (myFamilyId) {
        orConditions.push(`family_id.eq.${myFamilyId}`);
      }
      
      if (cookierIds.length > 0) {
        orConditions.push(`owner_id.in.(${cookierIds.join(',')})`);
      }
      
      if (cookierFamilyIds.length > 0) {
        orConditions.push(`family_id.in.(${cookierFamilyIds.join(',')})`);
      }
      
      const { data, error } = await query
        .or(orConditions.join(','))
        .order('created_at', { ascending: false })
        .order('position', { referencedTable: 'ingredients', ascending: true })
        .order('position', { referencedTable: 'steps', ascending: true });

      if (error) throw error;
      
      // Fetch owner profiles
      const ownerIds = [...new Set(data?.map(r => r.owner_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', ownerIds);
      
      // Attach owner profiles to recipes
      return (data || []).map(recipe => ({
        ...recipe,
        owner: profiles?.find(p => p.id === recipe.owner_id) || null,
      })) as Recipe[];
    },
    enabled: !!user && !familyLoading,
  });
};

// Only personal/family recipes - for "Mes Recettes" page
export const useMyRecipes = () => {
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useUserFamily();

  return useQuery({
    queryKey: ['my-recipes', user?.id, family?.id ?? 'personal'],
    queryFn: async () => {
      if (!user) return [];
      
      // Query recipes owned by user OR belonging to user's family
      let query = supabase
        .from('recipes')
        .select(`
          *,
          origins (*),
          ingredients (*, units (*), shopping_products (*, units (*))),
          steps (*),
          recipe_tags (tags (*))
        `);
      
      if (family?.id) {
        // If user has a family, get family recipes
        query = query.eq('family_id', family.id);
      } else {
        // If user has no family, get only their own recipes
        query = query.eq('owner_id', user.id).is('family_id', null);
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .order('position', { referencedTable: 'ingredients', ascending: true })
        .order('position', { referencedTable: 'steps', ascending: true });

      if (error) throw error;
      
      // Fetch owner profiles
      const ownerIds = [...new Set(data?.map(r => r.owner_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', ownerIds);
      
      return (data || []).map(recipe => ({
        ...recipe,
        owner: profiles?.find(p => p.id === recipe.owner_id) || null,
      })) as Recipe[];
    },
    enabled: !!user && !familyLoading,
  });
};

export const useRecipe = (id: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recipe', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          origins (*),
          ingredients (*, units (*), shopping_products (*, units (*))),
          steps (*),
          recipe_tags (tags (*))
        `)
        .eq('id', id)
        .order('position', { referencedTable: 'ingredients', ascending: true })
        .order('position', { referencedTable: 'steps', ascending: true })
        .single();

      if (error) throw error;
      return data as Recipe;
    },
    enabled: !!user && !!id,
  });
};

export const usePopularRecipes = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['popular-recipes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          origins (*)
        `)
        .order('view_count', { ascending: false })
        .limit(6);

      if (error) throw error;
      return data as Recipe[];
    },
    enabled: !!user,
  });
};

export const useCreateRecipe = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family } = useUserFamily();

  return useMutation({
    mutationFn: async (recipe: Omit<TablesInsert<'recipes'>, 'owner_id' | 'family_id'>) => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('recipes')
        .insert({ 
          ...recipe, 
          owner_id: user.id,
          family_id: family?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
};

export const useUpdateRecipe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...recipe }: { id: string } & Partial<TablesInsert<'recipes'>>) => {
      const { data, error } = await supabase
        .from('recipes')
        .update(recipe)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', data.id] });
    },
  });
};

export const useDeleteRecipe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
};

export const useOrigins = () => {
  return useQuery({
    queryKey: ['origins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('origins')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
  });
};

export const useUnits = () => {
  return useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
  });
};

export const useTags = () => {
  const { user } = useAuth();
  const { data: family, isLoading: familyLoading } = useUserFamily();

  return useQuery({
    queryKey: ['tags', user?.id, family?.id ?? 'personal'],
    queryFn: async () => {
      // RLS handles the filtering
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!user && !familyLoading,
  });
};
