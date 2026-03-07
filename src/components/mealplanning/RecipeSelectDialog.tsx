import { useState, useEffect } from 'react';
import { Search, ChefHat, Minus, Plus, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useRecipes } from '@/hooks/useRecipes';

interface RecipeSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (recipeId: string | null, servings: number, customText?: string) => void;
  editingCustomText?: { id: string; text: string } | null;
  onUpdateCustomText?: (id: string, text: string) => void;
}

const RecipeSelectDialog = ({ 
  open, 
  onOpenChange, 
  onSelect,
  editingCustomText,
  onUpdateCustomText,
}: RecipeSelectDialogProps) => {
  const [search, setSearch] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);
  const [servings, setServings] = useState(4);
  const [customText, setCustomText] = useState('');
  const { data: recipes = [], isLoading } = useRecipes();

  const isEditMode = !!editingCustomText;

  // Initialize custom text when editing
  useEffect(() => {
    if (editingCustomText) {
      setCustomText(editingCustomText.text);
    }
  }, [editingCustomText]);

  // Reset or initialize state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && editingCustomText) {
      setCustomText(editingCustomText.text);
      setSelectedRecipe(null);
    } else if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedRecipe) {
      onSelect(selectedRecipe, servings);
      resetState();
    }
  };

  const handleConfirmCustom = () => {
    if (customText.trim()) {
      if (isEditMode && editingCustomText && onUpdateCustomText) {
        onUpdateCustomText(editingCustomText.id, customText.trim());
      } else {
        onSelect(null, servings, customText.trim());
      }
      resetState();
    }
  };

  const resetState = () => {
    setSelectedRecipe(null);
    setServings(4);
    setSearch('');
    setCustomText('');
  };

  const handleRecipeClick = (recipeId: string, recipeServings: number | null) => {
    setSelectedRecipe(recipeId);
    setServings(recipeServings || 4);
    setCustomText(''); // Clear custom text when selecting a recipe
  };

  const handleCustomTextChange = (value: string) => {
    setCustomText(value);
    setSelectedRecipe(null); // Clear recipe selection when typing custom text
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Modifier le texte' : 'Choisir une recette'}</DialogTitle>
        </DialogHeader>

        {/* Manual Text Entry Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>Texte manuel</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Resto italien, Restes d'hier..."
              value={customText}
              onChange={(e) => handleCustomTextChange(e.target.value)}
              className="flex-1"
            />
            {customText.trim() && (
              <Button onClick={handleConfirmCustom} size="sm">
                {isEditMode ? 'Modifier' : 'Ajouter'}
              </Button>
            )}
          </div>
        </div>

        {!isEditMode && (
          <>
            <Separator />

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une recette..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[250px] pr-4">
              {isLoading ? (
                <p className="text-center text-muted-foreground py-4">Chargement...</p>
              ) : filteredRecipes.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Aucune recette trouvée</p>
              ) : (
                <div className="space-y-2">
                  {filteredRecipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      onClick={() => handleRecipeClick(recipe.id, recipe.servings)}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                        selectedRecipe === recipe.id
                          ? 'bg-primary/10 border border-primary'
                          : 'hover:bg-muted border border-transparent'
                      }`}
                    >
                      {recipe.image_url ? (
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                          <ChefHat className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{recipe.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {recipe.servings} portions
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {selectedRecipe && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Portions :</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setServings(Math.max(1, servings - 1))}
                    disabled={servings <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">{servings}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setServings(servings + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <Button onClick={handleConfirm}>
                  Confirmer
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RecipeSelectDialog;
