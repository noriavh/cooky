import { useState } from 'react';
import { Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useUserFamily } from '@/hooks/useFamilies';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Recipe, Ingredient } from '@/hooks/useRecipes';

interface ProductToCopy {
  originalId: string;
  name: string;
  unitName: string | null;
  unitId: string | null;
  aisleId: string | null;
}

interface CopyRecipeButtonProps {
  recipe: Recipe;
}

const CopyRecipeButton = ({ recipe }: CopyRecipeButtonProps) => {
  const { user } = useAuth();
  const { data: family } = useUserFamily();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [showProductsDialog, setShowProductsDialog] = useState(false);
  const [productsToCopy, setProductsToCopy] = useState<ProductToCopy[]>([]);
  const [productMapping, setProductMapping] = useState<Map<string, string>>(new Map());

  const analyzeProducts = async () => {
    if (!user || !recipe.ingredients) return;
    
    setIsAnalyzing(true);
    
    try {
      const ingredientsWithProducts = recipe.ingredients.filter(ing => ing.product_id);
      const productsToAnalyze: ProductToCopy[] = [];
      const mapping = new Map<string, string>();

      for (const ingredient of ingredientsWithProducts) {
        const productId = ingredient.product_id!;
        const product = ingredient.shopping_products;
        
        if (!product) continue;

        // Check if it's a global product (user_id is null)
        const isGlobal = product.user_id === null && product.family_id === null;
        
        if (isGlobal) {
          // Global product, can use directly
          mapping.set(productId, productId);
          continue;
        }

        // Check if user/family has a product with same name and unit
        const { data: existingProducts } = await supabase
          .from('shopping_products')
          .select('id, name, unit_id')
          .or(
            family 
              ? `family_id.eq.${family.id},and(user_id.eq.${user.id},family_id.is.null)` 
              : `user_id.eq.${user.id}`
          )
          .ilike('name', product.name);

        const matchingProduct = existingProducts?.find(
          p => p.unit_id === product.unit_id
        );

        if (matchingProduct) {
          // Found matching product, use it
          mapping.set(productId, matchingProduct.id);
        } else {
          // Need to copy this product
          productsToAnalyze.push({
            originalId: productId,
            name: product.name,
            unitName: product.units?.name || null,
            unitId: product.unit_id,
            aisleId: product.aisle_id,
          });
        }
      }

      setProductMapping(mapping);

      if (productsToAnalyze.length > 0) {
        setProductsToCopy(productsToAnalyze);
        setShowProductsDialog(true);
      } else {
        // No products to copy, proceed directly
        await copyRecipe(mapping);
      }
    } catch (error) {
      console.error('Error analyzing products:', error);
      toast.error('Erreur lors de l\'analyse des produits');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyRecipe = async (mapping: Map<string, string>) => {
    if (!user) return;
    
    setIsCopying(true);
    
    try {
      // Create new products if needed
      const finalMapping = new Map(mapping);
      
      for (const product of productsToCopy) {
        const { data: newProduct, error: productError } = await supabase
          .from('shopping_products')
          .insert({
            name: product.name,
            unit_id: product.unitId,
            aisle_id: product.aisleId,
            user_id: user.id,
            family_id: family?.id || null,
          })
          .select('id')
          .single();

        if (productError) throw productError;
        finalMapping.set(product.originalId, newProduct.id);
      }

      // Create the recipe copy with reference to original
      const { data: newRecipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          title: recipe.title,
          description: recipe.description,
          recipe_type: recipe.recipe_type,
          difficulty: recipe.difficulty,
          prep_time: recipe.prep_time,
          cook_time: recipe.cook_time,
          servings: recipe.servings,
          price_level: recipe.price_level,
          image_url: recipe.image_url,
          origin_id: recipe.origin_id,
          owner_id: user.id,
          family_id: family?.id || null,
          copied_from_id: recipe.id,
        })
        .select('id')
        .single();

      if (recipeError) throw recipeError;

      // Copy ingredients (without tags)
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        const ingredientsCopy = recipe.ingredients.map(ing => ({
          recipe_id: newRecipe.id,
          name: ing.name,
          quantity: ing.quantity,
          unit_id: ing.unit_id,
          position: ing.position,
          product_id: ing.product_id ? finalMapping.get(ing.product_id) || null : null,
        }));

        const { error: ingredientsError } = await supabase
          .from('ingredients')
          .insert(ingredientsCopy);

        if (ingredientsError) throw ingredientsError;
      }

      // Copy steps
      if (recipe.steps && recipe.steps.length > 0) {
        const stepsCopy = recipe.steps.map(step => ({
          recipe_id: newRecipe.id,
          content: step.content,
          position: step.position,
        }));

        const { error: stepsError } = await supabase
          .from('steps')
          .insert(stepsCopy);

        if (stepsError) throw stepsError;
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['shopping-products'] });

      toast.success('Recette copiée avec succès');
      setShowProductsDialog(false);
      navigate(`/recipes/${newRecipe.id}`);
    } catch (error) {
      console.error('Error copying recipe:', error);
      toast.error('Erreur lors de la copie de la recette');
    } finally {
      setIsCopying(false);
    }
  };

  const handleConfirmCopy = () => {
    copyRecipe(productMapping);
  };

  return (
    <>
      <Button
        variant="outline"
        size={isMobile ? 'icon' : 'sm'}
        onClick={analyzeProducts}
        disabled={isAnalyzing}
        title="Copier la recette"
      >
        {isAnalyzing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        {!isMobile && <span className="ml-2">Copier</span>}
      </Button>

      <Dialog open={showProductsDialog} onOpenChange={setShowProductsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copier la recette</DialogTitle>
            <DialogDescription>
              Les produits suivants n'existent pas dans votre base de données et seront créés :
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {productsToCopy.map((product) => (
              <div
                key={product.originalId}
                className="flex items-center justify-between p-2 bg-muted rounded-md"
              >
                <span className="font-medium">{product.name}</span>
                {product.unitName && (
                  <Badge variant="secondary">{product.unitName}</Badge>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowProductsDialog(false)}
              disabled={isCopying}
            >
              Annuler
            </Button>
            <Button onClick={handleConfirmCopy} disabled={isCopying}>
              {isCopying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Copie en cours...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copier la recette
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CopyRecipeButton;
