import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useRecipe, useDeleteRecipe } from '@/hooks/useRecipes';
import { useCanEditRecipe } from '@/hooks/useSharing';
import { useAuth } from '@/contexts/AuthContext';
import { useUserFamily } from '@/hooks/useFamilies';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Clock,
  Users,
  ChefHat,
  Euro,
  Edit,
  Trash2,
  Minus,
  Plus,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import AddToListButton from '@/components/recipes/AddToListButton';
import AddToShoppingListButton from '@/components/shopping/AddToShoppingListButton';
import AddToShoppingListWithCopyButton from '@/components/shopping/AddToShoppingListWithCopyButton';
import RecipePdfButton from '@/components/recipes/RecipePdfButton';
import IngredientLinkButton from '@/components/recipes/IngredientLinkButton';
import CopyRecipeButton from '@/components/recipes/CopyRecipeButton';
import AddToMealPlanButton from '@/components/recipes/AddToMealPlanButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const difficultyLabels: Record<string, string> = {
  facile: 'Facile',
  moyen: 'Moyen',
  difficile: 'Difficile',
};

const recipeTypeLabels: Record<string, string> = {
  apero: 'Apéro',
  entree: 'Entrée',
  soupe: 'Soupe',
  plat: 'Plat',
  dessert: 'Dessert',
  boisson: 'Boisson',
  petit_dejeuner: 'Petit-déjeuner',
  gouter: 'Goûter',
};

const RecipeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: family } = useUserFamily();
  const { data: recipe, isLoading, error } = useRecipe(id);
  const { data: canEdit } = useCanEditRecipe(id, recipe?.owner_id);
  const deleteRecipe = useDeleteRecipe();

  // Check if this is someone else's recipe (for copy button)
  const isOthersRecipe = useMemo(() => {
    if (!user || !recipe) return false;
    // Recipe belongs to user
    if (recipe.owner_id === user.id) return false;
    // Recipe belongs to user's family
    if (family?.id && recipe.family_id === family.id) return false;
    return true;
  }, [user, recipe, family]);

  const [servings, setServings] = useState<number | null>(null);

  // Initialize servings when recipe loads
  const currentServings = servings ?? recipe?.servings ?? 4;
  const originalServings = recipe?.servings ?? 4;
  const scaleFactor = currentServings / originalServings;

  const scaledIngredients = useMemo(() => {
    if (!recipe?.ingredients) return [];
    return recipe.ingredients
      .sort((a, b) => a.position - b.position)
      .map((ingredient) => ({
        ...ingredient,
        displayName: ingredient.shopping_products?.name || ingredient.name,
        scaledQuantity: ingredient.quantity
          ? Math.round(ingredient.quantity * scaleFactor * 100) / 100
          : null,
      }));
  }, [recipe?.ingredients, scaleFactor]);

  const sortedSteps = useMemo(() => {
    if (!recipe?.steps) return [];
    return [...recipe.steps].sort((a, b) => a.position - b.position);
  }, [recipe?.steps]);

  const handleLinkIngredient = async (ingredientId: string, productId: string, productName: string) => {
    try {
      await supabase
        .from('ingredients')
        .update({ product_id: productId, name: productName })
        .eq('id', ingredientId);
      
      // Invalidate the recipe query to refresh data
      queryClient.invalidateQueries({ queryKey: ['recipe', id] });
    } catch (error) {
      console.error('Error linking ingredient:', error);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteRecipe.mutateAsync(id);
      toast.success('Recette supprimée');
      navigate('/recipes');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const decrementServings = () => {
    if (currentServings > 1) {
      setServings(currentServings - 1);
    }
  };

  const incrementServings = () => {
    setServings(currentServings + 1);
  };

  const totalTime = (recipe?.prep_time ?? 0) + (recipe?.cook_time ?? 0);

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-6 px-4 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="container max-w-4xl py-6 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Recette introuvable</p>
            <Button asChild>
              <Link to="/recipes">Retour aux recettes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 px-4 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {!isMobile && (
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        )}
        <div className={`flex gap-2 flex-wrap ${isMobile ? '' : 'ml-auto'}`}>
          <RecipePdfButton
            recipe={recipe}
            scaledIngredients={scaledIngredients}
            servings={currentServings}
          />
          {isOthersRecipe && <CopyRecipeButton recipe={recipe} />}
          <AddToMealPlanButton
            recipeId={id!}
            recipeTitle={recipe.title}
            recipeServings={recipe.servings}
            showLabel={!isMobile}
          />
          {canEdit ? (
            <AddToShoppingListButton
              ingredients={recipe.ingredients ?? []}
              servings={currentServings}
              originalServings={originalServings}
            />
          ) : (
            <AddToShoppingListWithCopyButton
              ingredients={recipe.ingredients ?? []}
              servings={currentServings}
              originalServings={originalServings}
            />
          )}
          {canEdit && <AddToListButton recipeId={id!} />}
          {canEdit && (
            <Button variant="outline" size={isMobile ? 'icon' : 'sm'} asChild title="Modifier">
              <Link to={`/recipes/${id}/edit`}>
                <Edit className="h-4 w-4" />
                {!isMobile && <span className="ml-2">Modifier</span>}
              </Link>
            </Button>
          )}
          {canEdit && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size={isMobile ? 'icon' : 'sm'} title="Supprimer">
                  <Trash2 className="h-4 w-4" />
                  {!isMobile && <span className="ml-2">Supprimer</span>}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer la recette ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. La recette sera définitivement supprimée.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Hero Image */}
      {recipe.image_url && (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl">
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Title & Meta */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{recipeTypeLabels[recipe.recipe_type]}</Badge>
          {recipe.origins && (
            <Badge variant="outline">
              {recipe.origins.emoji} {recipe.origins.name}
            </Badge>
          )}
          {recipe.recipe_tags
            ?.filter(({ tags }) => tags !== null)
            .map(({ tags }) => (
              <Badge key={tags!.id} variant="outline">
                {tags!.name}
              </Badge>
            ))}
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">{recipe.title}</h1>

        {recipe.source_url && (
          <a
            href={recipe.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Voir la recette originale
          </a>
        )}

        {recipe.description && (
          <p className="text-muted-foreground text-base sm:text-lg">{recipe.description}</p>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {totalTime > 0 && (
            <Card>
              <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Temps total</p>
                  <p className="font-medium text-sm sm:text-base">{totalTime} min</p>
                </div>
              </CardContent>
            </Card>
          )}
          {recipe.difficulty && (
            <Card>
              <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <ChefHat className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Difficulté</p>
                  <p className="font-medium text-sm sm:text-base">{difficultyLabels[recipe.difficulty]}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {recipe.price_level && (
            <Card>
              <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <Euro className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="font-medium text-sm sm:text-base">{'€'.repeat(parseInt(recipe.price_level))}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {recipe.origins && (
            <Card>
              <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Origine</p>
                  <p className="font-medium text-sm sm:text-base truncate">{recipe.origins.name}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Separator />

      {/* Time breakdown */}
      {(recipe.prep_time || recipe.cook_time) && (
        <Card>
          <CardContent className="py-4">
            <div className="flex justify-center gap-6 sm:gap-8">
              {recipe.prep_time && (
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold">{recipe.prep_time}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">min préparation</p>
                </div>
              )}
              {recipe.cook_time && (
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold">{recipe.cook_time}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">min cuisson</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ingredients */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              Ingrédients
            </CardTitle>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={decrementServings}
                disabled={currentServings <= 1}
              >
                <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <span className="font-medium min-w-[60px] sm:min-w-[80px] text-center text-sm sm:text-base">
                {currentServings} {isMobile ? 'pers.' : (currentServings > 1 ? 'portions' : 'portion')}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={incrementServings}
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {scaledIngredients.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun ingrédient</p>
          ) : (
            <ul className="space-y-2">
              {scaledIngredients.map((ingredient) => (
                <li
                  key={ingredient.id}
                  className="flex items-center gap-2 py-2 border-b border-border last:border-0"
                >
                  <span className="font-medium min-w-[60px] sm:min-w-[80px] text-sm sm:text-base">
                    {ingredient.scaledQuantity !== null && (
                      <>
                        {ingredient.scaledQuantity}
                        {ingredient.units?.abbreviation && ` ${ingredient.units.abbreviation}`}
                      </>
                    )}
                  </span>
                  <span className="text-foreground text-sm sm:text-base flex-1">
                    {ingredient.displayName}
                  </span>
                  {!ingredient.product_id && canEdit && (
                    <IngredientLinkButton
                      ingredientName={ingredient.name}
                      onLink={(productId, productName) => 
                        handleLinkIngredient(ingredient.id, productId, productName)
                      }
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Préparation</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedSteps.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune étape</p>
          ) : (
            <ol className="space-y-4 sm:space-y-6">
              {sortedSteps.map((step, index) => (
                <li key={step.id} className="flex gap-3 sm:gap-4">
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs sm:text-sm">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-sm sm:text-base">{step.content}</p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecipeDetail;
