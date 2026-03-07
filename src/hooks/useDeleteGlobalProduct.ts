import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type RecipeWithOwner = {
  recipe_id: string;
  owner_id: string;
  family_id: string | null;
};

export type ProductUsageInfo = {
  isUsed: boolean;
  usageCount: number;
  affectedRecipes: RecipeWithOwner[];
};

export const useCheckProductUsage = () => {
  return useMutation({
    mutationFn: async (productId: string): Promise<ProductUsageInfo> => {
      // Check if this product is used in any ingredients
      const { data: ingredients, error } = await supabase
        .from('ingredients')
        .select(`
          recipe_id,
          recipes!inner (
            owner_id,
            family_id
          )
        `)
        .eq('product_id', productId);

      if (error) throw error;

      if (!ingredients || ingredients.length === 0) {
        return { isUsed: false, usageCount: 0, affectedRecipes: [] };
      }

      // Get unique recipes with their owner info
      const recipesMap = new Map<string, RecipeWithOwner>();
      ingredients.forEach((ing: any) => {
        if (!recipesMap.has(ing.recipe_id)) {
          recipesMap.set(ing.recipe_id, {
            recipe_id: ing.recipe_id,
            owner_id: ing.recipes.owner_id,
            family_id: ing.recipes.family_id,
          });
        }
      });

      return {
        isUsed: true,
        usageCount: recipesMap.size,
        affectedRecipes: Array.from(recipesMap.values()),
      };
    },
  });
};

export const useDeleteGlobalProductWithConversion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      productId, 
      productData,
      affectedRecipes 
    }: { 
      productId: string;
      productData: { name: string; aisle_id: string | null; unit_id: string | null };
      affectedRecipes: RecipeWithOwner[];
    }) => {
      // Group recipes by owner (user_id or family_id)
      const ownerGroups = new Map<string, { 
        userId: string; 
        familyId: string | null; 
        recipeIds: string[] 
      }>();

      affectedRecipes.forEach((recipe) => {
        // If recipe belongs to a family, use family_id as key
        // Otherwise use owner_id
        const key = recipe.family_id || recipe.owner_id;
        
        if (!ownerGroups.has(key)) {
          ownerGroups.set(key, {
            userId: recipe.owner_id,
            familyId: recipe.family_id,
            recipeIds: [],
          });
        }
        ownerGroups.get(key)!.recipeIds.push(recipe.recipe_id);
      });

      // For each unique owner, create a local product and update their ingredients
      for (const [_, ownerInfo] of ownerGroups) {
        // Create local product for this user/family
        const { data: newProduct, error: createError } = await supabase
          .from('shopping_products')
          .insert({
            name: productData.name,
            aisle_id: productData.aisle_id,
            unit_id: productData.unit_id,
            user_id: ownerInfo.userId,
            family_id: ownerInfo.familyId,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Update all ingredients in recipes for this owner to use the new local product
        for (const recipeId of ownerInfo.recipeIds) {
          const { error: updateError } = await supabase
            .from('ingredients')
            .update({ product_id: newProduct.id })
            .eq('recipe_id', recipeId)
            .eq('product_id', productId);

          if (updateError) throw updateError;
        }
      }

      // Now delete the global product
      const { error: deleteError } = await supabase
        .from('shopping_products')
        .delete()
        .eq('id', productId);

      if (deleteError) throw deleteError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-products'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
};
