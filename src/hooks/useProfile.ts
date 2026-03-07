import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type DietType = 'none' | 'pescetarian' | 'vegetarian' | 'vegan' | null;

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  diet: DietType;
  show_morning_meals: boolean;
  show_noon_meals: boolean;
  show_evening_meals: boolean;
  created_at: string;
  updated_at: string;
}

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user,
  });
};

// Diet hierarchy mapping - which aisles exclude which diets
// Key: aisle name (lowercase), Value: highest allowed diet
const AISLE_DIET_RESTRICTIONS: Record<string, DietType> = {
  'viande': 'none',
  'charcuterie': 'none',
  'poisson et fruits de mer': 'pescetarian',
  'produits laitiers': 'vegetarian',
  'crèmerie': 'vegetarian',
};

// Diet hierarchy - lower index = more restrictive
const DIET_HIERARCHY: DietType[] = ['vegan', 'vegetarian', 'pescetarian', 'none'];

export const getDietFromIndex = (index: number): DietType => {
  return DIET_HIERARCHY[index] || 'none';
};

export const getDietIndex = (diet: DietType): number => {
  const index = DIET_HIERARCHY.indexOf(diet);
  return index === -1 ? 3 : index; // Default to 'none' (index 3) if not found
};

// Check if a product name contains "oeuf"
const containsEgg = (productName: string): boolean => {
  return productName.toLowerCase().includes('oeuf');
};

// Calculate the diet of a recipe based on its ingredients
export const calculateRecipeDiet = (
  ingredients: Array<{
    name: string;
    product_id?: string | null;
    shopping_products?: {
      name: string;
      aisle_id?: string | null;
    } | null;
  }>,
  aisles: Array<{ id: string; name: string }>
): DietType => {
  // Start with vegan (most restrictive)
  let currentDietIndex = 0; // vegan

  for (const ingredient of ingredients) {
    const productName = ingredient.shopping_products?.name || ingredient.name;
    const aisleId = ingredient.shopping_products?.aisle_id;

    // Check for egg in product name
    if (containsEgg(productName)) {
      const vegetarianIndex = getDietIndex('vegetarian');
      if (vegetarianIndex > currentDietIndex) {
        currentDietIndex = vegetarianIndex;
      }
    }

    // Check aisle restrictions
    if (aisleId) {
      const aisle = aisles.find(a => a.id === aisleId);
      if (aisle) {
        const aisleName = aisle.name.toLowerCase();
        for (const [restrictedAisle, maxDiet] of Object.entries(AISLE_DIET_RESTRICTIONS)) {
          if (aisleName.includes(restrictedAisle.toLowerCase())) {
            const maxDietIndex = getDietIndex(maxDiet);
            if (maxDietIndex > currentDietIndex) {
              currentDietIndex = maxDietIndex;
            }
            break;
          }
        }
      }
    }

    // If we've already hit 'none', no need to check further
    if (currentDietIndex === 3) break;
  }

  return getDietFromIndex(currentDietIndex);
};

// Diet labels for UI
export const DIET_LABELS: Record<string, { label: string; emoji: string }> = {
  'none': { label: 'Omnivore', emoji: '🍖' },
  'pescetarian': { label: 'Pescétarien', emoji: '🐟' },
  'vegetarian': { label: 'Végétarien', emoji: '🥚' },
  'vegan': { label: 'Végétalien', emoji: '🌱' },
};

// Check if a recipe diet matches a filter diet
// A recipe is compatible if its diet is at least as restrictive as the filter
export const isDietCompatible = (recipeDiet: DietType, filterDiet: DietType): boolean => {
  if (!filterDiet || filterDiet === 'none') return true;
  if (!recipeDiet) return true;
  
  const recipeIndex = getDietIndex(recipeDiet);
  const filterIndex = getDietIndex(filterDiet);
  
  // Recipe is compatible if its diet is equal or more restrictive (lower index)
  return recipeIndex <= filterIndex;
};
