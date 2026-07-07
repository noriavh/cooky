import { useState } from 'react';
import { Search, ChefHat, ArrowLeft, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRecipes, useRecipe } from '@/hooks/useRecipes';
import { useGetOrCreateProduct } from '@/hooks/useShoppingProducts';
import { toast } from 'sonner';

export interface PickedIngredient {
  productId: string;
  sourceRecipeId: string;
}

interface RecipeIngredientsPickDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingProductIds: string[];
  onConfirm: (items: PickedIngredient[]) => Promise<void>;
}

const RecipeIngredientsPickDialog = ({
  open,
  onOpenChange,
  existingProductIds,
  onConfirm,
}: RecipeIngredientsPickDialogProps) => {
  const [search, setSearch] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [uncheckedIds, setUncheckedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: recipes = [], isLoading } = useRecipes();
  const { data: recipe, isLoading: isRecipeLoading } = useRecipe(selectedRecipeId ?? undefined);
  const getOrCreateProduct = useGetOrCreateProduct();

  const filteredRecipes = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  const ingredients = recipe?.ingredients ?? [];
  const existingSet = new Set(existingProductIds);

  const isAlreadyInMeal = (productId: string | null) =>
    !!productId && existingSet.has(productId);

  const checkedIngredients = ingredients.filter(
    (ing) => !uncheckedIds.has(ing.id) && !isAlreadyInMeal(ing.product_id)
  );

  const resetState = () => {
    setSearch('');
    setSelectedRecipeId(null);
    setUncheckedIds(new Set());
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetState();
    onOpenChange(newOpen);
  };

  const toggleIngredient = (ingredientId: string) => {
    setUncheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ingredientId)) {
        next.delete(ingredientId);
      } else {
        next.add(ingredientId);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!selectedRecipeId || checkedIngredients.length === 0) return;

    setIsSubmitting(true);
    try {
      const items: PickedIngredient[] = [];
      for (const ing of checkedIngredients) {
        let productId = ing.product_id;
        if (!productId) {
          const product = await getOrCreateProduct.mutateAsync({ name: ing.name });
          productId = product.id;
        }
        items.push({ productId, sourceRecipeId: selectedRecipeId });
      }
      await onConfirm(items);
      handleOpenChange(false);
    } catch {
      toast.error("Erreur lors de l'ajout des ingrédients");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedRecipeId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 -ml-1"
                onClick={() => {
                  setSelectedRecipeId(null);
                  setUncheckedIds(new Set());
                }}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            {selectedRecipeId ? recipe?.title ?? 'Ingrédients' : 'Ajouter depuis une recette'}
          </DialogTitle>
        </DialogHeader>

        {!selectedRecipeId ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une recette..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[300px] pr-4">
              {isLoading ? (
                <p className="text-center text-muted-foreground py-4">Chargement...</p>
              ) : filteredRecipes.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucune recette trouvée</p>
              ) : (
                <div className="space-y-2">
                  {filteredRecipes.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRecipeId(r.id)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left hover:bg-muted"
                    >
                      {r.image_url ? (
                        <img
                          src={r.image_url}
                          alt={r.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                          <ChefHat className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <p className="font-medium truncate flex-1">{r.title}</p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <>
            <ScrollArea className="h-[300px] pr-4">
              {isRecipeLoading ? (
                <p className="text-center text-muted-foreground py-4">Chargement...</p>
              ) : ingredients.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Cette recette n'a pas d'ingrédients
                </p>
              ) : (
                <div className="space-y-1">
                  {ingredients.map((ing) => {
                    const alreadyInMeal = isAlreadyInMeal(ing.product_id);
                    const checked = alreadyInMeal || !uncheckedIds.has(ing.id);
                    return (
                      <label
                        key={ing.id}
                        className={`flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer ${
                          alreadyInMeal ? 'opacity-50 cursor-default' : ''
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={alreadyInMeal}
                          onCheckedChange={() => toggleIngredient(ing.id)}
                        />
                        <span className="text-sm flex-1">
                          {ing.shopping_products?.name ?? ing.name}
                        </span>
                        {alreadyInMeal ? (
                          <Badge variant="outline" className="text-xs">
                            déjà dans le repas
                          </Badge>
                        ) : !ing.product_id ? (
                          <Badge variant="outline" className="text-xs">
                            sera créé comme produit
                          </Badge>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            <Button
              onClick={handleConfirm}
              disabled={checkedIngredients.length === 0 || isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Ajouter ({checkedIngredients.length})
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RecipeIngredientsPickDialog;
