// Recipe validation types
export interface ValidatedRecipe {
  title: string;
  description: string | null;
  recipe_type: 'entree' | 'plat' | 'dessert' | 'boisson' | 'apero' | 'soupe';
  difficulty: 'facile' | 'moyen' | 'difficile';
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  ingredients: { name: string; quantity: number | null; unit: string | null }[];
  steps: { content: string; position: number }[];
}

const VALID_RECIPE_TYPES = ['entree', 'plat', 'dessert', 'boisson', 'apero', 'soupe'];
const VALID_DIFFICULTIES = ['facile', 'moyen', 'difficile'];

/**
 * Validates a recipe object and returns the validated data or an error message
 */
export function validateRecipe(data: unknown): { success: true; data: ValidatedRecipe } | { success: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { success: false, error: 'Données de recette invalides' };
  }

  const recipe = data as Record<string, unknown>;

  // Validate title
  if (!recipe.title || typeof recipe.title !== 'string' || recipe.title.length < 1) {
    return { success: false, error: 'Titre de recette manquant' };
  }

  // Validate recipe_type
  const recipeType = recipe.recipe_type || 'plat';
  if (!VALID_RECIPE_TYPES.includes(recipeType as string)) {
    return { success: false, error: 'Type de recette invalide' };
  }

  // Validate difficulty
  const difficulty = recipe.difficulty || 'moyen';
  if (!VALID_DIFFICULTIES.includes(difficulty as string)) {
    return { success: false, error: 'Difficulté invalide' };
  }

  // Validate ingredients
  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    return { success: false, error: 'Ingrédients manquants' };
  }

  const ingredients = recipe.ingredients.map((ing: unknown) => {
    const ingredient = ing as Record<string, unknown>;
    return {
      name: String(ingredient.name || '').slice(0, 200),
      quantity: typeof ingredient.quantity === 'number' ? ingredient.quantity : null,
      unit: typeof ingredient.unit === 'string' ? ingredient.unit.slice(0, 50) : null,
    };
  }).filter(ing => ing.name.length > 0);

  if (ingredients.length === 0) {
    return { success: false, error: 'Ingrédients valides manquants' };
  }

  // Validate steps
  if (!Array.isArray(recipe.steps) || recipe.steps.length === 0) {
    return { success: false, error: 'Étapes manquantes' };
  }

  const steps = recipe.steps.map((step: unknown, index: number) => {
    const s = step as Record<string, unknown>;
    return {
      content: String(s.content || '').slice(0, 5000),
      position: typeof s.position === 'number' ? s.position : index + 1,
    };
  }).filter(step => step.content.length > 0);

  if (steps.length === 0) {
    return { success: false, error: 'Étapes valides manquantes' };
  }

  const validated: ValidatedRecipe = {
    title: String(recipe.title).slice(0, 500),
    description: typeof recipe.description === 'string' ? recipe.description.slice(0, 2000) : null,
    recipe_type: recipeType as ValidatedRecipe['recipe_type'],
    difficulty: difficulty as ValidatedRecipe['difficulty'],
    prep_time: typeof recipe.prep_time === 'number' && recipe.prep_time >= 0 ? recipe.prep_time : null,
    cook_time: typeof recipe.cook_time === 'number' && recipe.cook_time >= 0 ? recipe.cook_time : null,
    servings: typeof recipe.servings === 'number' && recipe.servings > 0 ? recipe.servings : null,
    ingredients,
    steps,
  };

  return { success: true, data: validated };
}

/**
 * Parses AI response content (handles markdown code blocks) and extracts JSON
 */
export function parseAIResponse(content: string): unknown | null {
  try {
    let jsonStr = content.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    
    // Try to extract JSON from markdown code block pattern
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    jsonStr = jsonStr.trim();
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}
