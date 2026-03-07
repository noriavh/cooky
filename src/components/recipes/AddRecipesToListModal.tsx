import { useState, useMemo } from 'react';
import { Search, Check, Plus, Loader2 } from 'lucide-react';
import { useRecipes } from '@/hooks/useRecipes';
import { useAddRecipeToList } from '@/hooks/useRecipeLists';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AddRecipesToListModalProps {
  listId: string;
  existingRecipeIds: string[];
}

const AddRecipesToListModal = ({
  listId,
  existingRecipeIds,
}: AddRecipesToListModalProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const { data: recipes, isLoading } = useRecipes();
  const addRecipeToList = useAddRecipeToList();

  // Filter recipes based on search query
  const filteredRecipes = useMemo(() => {
    if (!recipes) return [];
    
    const availableRecipes = recipes.filter(
      (recipe) => !existingRecipeIds.includes(recipe.id)
    );

    if (!searchQuery.trim()) return availableRecipes;

    const query = searchQuery.toLowerCase();
    return availableRecipes.filter(
      (recipe) =>
        recipe.title.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query) ||
        recipe.recipe_type.toLowerCase().includes(query)
    );
  }, [recipes, searchQuery, existingRecipeIds]);

  const toggleRecipe = (recipeId: string) => {
    setSelectedRecipeIds((prev) =>
      prev.includes(recipeId)
        ? prev.filter((id) => id !== recipeId)
        : [...prev, recipeId]
    );
  };

  const handleConfirm = async () => {
    if (selectedRecipeIds.length === 0) return;

    setIsAdding(true);
    try {
      await Promise.all(
        selectedRecipeIds.map((recipeId) =>
          addRecipeToList.mutateAsync({ listId, recipeId })
        )
      );
      toast.success(
        `${selectedRecipeIds.length} recette${selectedRecipeIds.length > 1 ? 's' : ''} ajoutée${selectedRecipeIds.length > 1 ? 's' : ''}`
      );
      setSelectedRecipeIds([]);
      setSearchQuery('');
      setOpen(false);
    } catch (error) {
      toast.error("Erreur lors de l'ajout des recettes");
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelectedRecipeIds([]);
      setSearchQuery('');
    }
  };

  const recipeTypeLabels: Record<string, string> = {
    apero: 'Apéro',
    entree: 'Entrée',
    soupe: 'Soupe',
    plat: 'Plat',
    dessert: 'Dessert',
    boisson: 'Boisson',
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter des recettes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter des recettes</DialogTitle>
          <DialogDescription>
            Recherchez et sélectionnez les recettes à ajouter à votre liste.
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une recette..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Selected count badge */}
        {selectedRecipeIds.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedRecipeIds.length} sélectionnée
              {selectedRecipeIds.length > 1 ? 's' : ''}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRecipeIds([])}
              className="h-auto py-1 px-2 text-xs"
            >
              Tout désélectionner
            </Button>
          </div>
        )}

        {/* Recipes list */}
        <ScrollArea className="h-[300px] pr-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {searchQuery
                ? 'Aucune recette trouvée'
                : 'Toutes les recettes sont déjà dans cette liste'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRecipes.map((recipe) => {
                const isSelected = selectedRecipeIds.includes(recipe.id);
                return (
                  <button
                    key={recipe.id}
                    onClick={() => toggleRecipe(recipe.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent'
                    )}
                  >
                    {/* Recipe image */}
                    <div className="h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {recipe.image_url ? (
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                          📷
                        </div>
                      )}
                    </div>

                    {/* Recipe info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{recipe.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {recipeTypeLabels[recipe.recipe_type] || recipe.recipe_type}
                      </p>
                    </div>

                    {/* Selection indicator */}
                    <div
                      className={cn(
                        'h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/30'
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedRecipeIds.length === 0 || isAdding}
          >
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ajout en cours...
              </>
            ) : (
              <>
                Ajouter ({selectedRecipeIds.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddRecipesToListModal;
