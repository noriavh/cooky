import { useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, X, Pencil, Check, Search } from 'lucide-react';
import {
  useRecipeList,
  useDeleteRecipeList,
  useRemoveRecipeFromList,
  useUpdateRecipeList,
} from '@/hooks/useRecipeLists';
import { useOrigins, useTags } from '@/hooks/useRecipes';
import { useCanEditList } from '@/hooks/useSharing';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import RecipeCard from '@/components/recipes/RecipeCard';
import RecipeListItem from '@/components/recipes/RecipeListItem';
import ViewToggle, { ViewMode } from '@/components/recipes/ViewToggle';
import BulkActionsMenu from '@/components/recipes/BulkActionsMenu';
import AddRecipesToListModal from '@/components/recipes/AddRecipesToListModal';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';

const typeOptions = [
  { value: 'apero', label: 'Apéro' },
  { value: 'entree', label: 'Entrée' },
  { value: 'soupe', label: 'Soupe' },
  { value: 'plat', label: 'Plat' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'boisson', label: 'Boisson' },
  { value: 'petit_dejeuner', label: 'Petit-déjeuner' },
  { value: 'gouter', label: 'Goûter' },
];

const difficultyOptions = [
  { value: 'facile', label: 'Facile' },
  { value: 'moyen', label: 'Moyen' },
  { value: 'difficile', label: 'Difficile' },
];

const ListDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { data: list, isLoading, error } = useRecipeList(id);
  const { data: canEdit } = useCanEditList(id, list?.owner_id);
  const { data: origins } = useOrigins();
  const { data: tags } = useTags();
  const deleteList = useDeleteRecipeList();
  const removeRecipe = useRemoveRecipeFromList();
  const updateList = useUpdateRecipeList();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [searchName, setSearchName] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterOrigin, setFilterOrigin] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());

  const recipes = list?.recipe_list_items?.map((item) => item.recipes).filter((recipe): recipe is NonNullable<typeof recipe> => recipe !== null) || [];

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      // Filter by name
      if (searchName.trim()) {
        const query = searchName.toLowerCase();
        const matchesName = recipe.title.toLowerCase().includes(query);
        const matchesDescription = recipe.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription) return false;
      }

      // Filter by type
      if (filterType !== 'all' && recipe.recipe_type !== filterType) {
        return false;
      }

      // Filter by origin
      if (filterOrigin !== 'all' && recipe.origin_id !== filterOrigin) {
        return false;
      }

      // Filter by difficulty
      if (filterDifficulty !== 'all' && recipe.difficulty !== filterDifficulty) {
        return false;
      }

      // Filter by tags (AND logic)
      if (filterTags.length > 0) {
        const recipeTagIds = recipe.recipe_tags?.map(rt => rt.tags.id) || [];
        const hasAllTags = filterTags.every(tagId => recipeTagIds.includes(tagId));
        if (!hasAllTags) return false;
      }

      return true;
    });
  }, [recipes, searchName, filterType, filterOrigin, filterDifficulty, filterTags]);

  const hasActiveFilters = searchName || filterType !== 'all' || filterOrigin !== 'all' || filterDifficulty !== 'all' || filterTags.length > 0;

  const clearFilters = () => {
    setSearchName('');
    setFilterType('all');
    setFilterOrigin('all');
    setFilterDifficulty('all');
    setFilterTags([]);
  };

  const toggleTag = (tagId: string) => {
    setFilterTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const removeTag = (tagId: string) => {
    setFilterTags(prev => prev.filter(id => id !== tagId));
  };

  const handleStartEditName = () => {
    setEditedName(list?.name || '');
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!id || !editedName.trim()) return;
    try {
      await updateList.mutateAsync({ id, name: editedName.trim() });
      toast.success('Nom de la liste modifié');
      setIsEditingName(false);
    } catch (error) {
      toast.error('Erreur lors de la modification');
    }
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleDeleteList = async () => {
    if (!id) return;
    try {
      await deleteList.mutateAsync(id);
      toast.success('Liste supprimée');
      navigate('/lists');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleRemoveRecipe = async (recipeId: string) => {
    if (!id) return;
    try {
      await removeRecipe.mutateAsync({ listId: id, recipeId });
      toast.success('Recette retirée de la liste');
    } catch (error) {
      toast.error('Erreur lors du retrait');
    }
  };

  const handleSelectRecipe = (recipeId: string, checked: boolean) => {
    setSelectedRecipes(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(recipeId);
      } else {
        newSet.delete(recipeId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecipes(new Set(filteredRecipes.map(r => r.id)));
    } else {
      setSelectedRecipes(new Set());
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Liste introuvable</p>
            <Button asChild>
              <Link to="/lists">Retour aux listes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header with filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border p-3 sm:p-4 space-y-3 sm:space-y-4"
      >
        {/* Title row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link to="/lists">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="h-9 w-32 sm:w-48"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') handleCancelEditName();
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleSaveName}
                    disabled={updateList.isPending}
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleCancelEditName}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-display font-bold truncate">{list.name}</h1>
                    <p className="text-sm text-muted-foreground">
                      {recipes.length} recette{recipes.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={handleStartEditName}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            {canEdit && (
              <AddRecipesToListModal
                listId={id!}
                existingRecipeIds={recipes.map((r) => r.id)}
              />
            )}
            {canEdit && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size={isMobile ? 'icon' : 'sm'}>
                    <Trash2 className="h-4 w-4" />
                    {!isMobile && <span className="ml-2">Supprimer</span>}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer la liste ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. La liste "{list.name}" sera
                      définitivement supprimée.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteList}>
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Filters */}
        {recipes.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
            {/* Search by name */}
            <div className="relative col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter by type */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter by origin */}
            <Select value={filterOrigin} onValueChange={setFilterOrigin}>
              <SelectTrigger>
                <SelectValue placeholder="Origine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes origines</SelectItem>
                {origins?.map((origin) => (
                  <SelectItem key={origin.id} value={origin.id}>
                    {origin.emoji} {origin.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter by difficulty */}
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulté" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes difficultés</SelectItem>
                {difficultyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter by tags */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between font-normal">
                  <span className={filterTags.length === 0 ? 'text-muted-foreground' : ''}>
                    {filterTags.length === 0 
                      ? 'Tags' 
                      : `${filterTags.length} tag${filterTags.length > 1 ? 's' : ''}`}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {tags && tags.length > 0 ? (
                    tags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                        onClick={() => toggleTag(tag.id)}
                      >
                        <Checkbox
                          checked={filterTags.includes(tag.id)}
                          onCheckedChange={() => toggleTag(tag.id)}
                        />
                        <span className="text-sm">{tag.name}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Aucun tag disponible
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Selected tags display */}
        {filterTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {filterTags.map(tagId => {
              const tag = tags?.find(t => t.id === tagId);
              return tag ? (
                <Badge 
                  key={tagId} 
                  variant="secondary" 
                  className="gap-1 pr-1"
                >
                  {tag.name}
                  <button 
                    onClick={() => removeTag(tagId)}
                    className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ) : null;
            })}
          </div>
        )}

        {/* Active filters info */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {filteredRecipes.length} recette{filteredRecipes.length !== 1 ? 's' : ''} trouvée{filteredRecipes.length !== 1 ? 's' : ''}
            </span>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Effacer les filtres
            </Button>
          </div>
        )}
      </motion.div>

      {/* Selection bar for list view */}
      {viewMode === 'list' && filteredRecipes.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3 sm:gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-input"
                checked={selectedRecipes.size === filteredRecipes.length && filteredRecipes.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              {isMobile ? 'Tout' : 'Tout sélectionner'}
            </label>
            {selectedRecipes.size > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedRecipes.size} sél.
              </span>
            )}
          </div>
          <BulkActionsMenu 
            selectedRecipes={filteredRecipes.filter(r => selectedRecipes.has(r.id))}
            onActionComplete={() => setSelectedRecipes(new Set())}
          />
        </div>
      )}

      {/* Recipes grid/list */}
      {filteredRecipes.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecipes.map((recipe, index) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative group"
              >
                <RecipeCard recipe={recipe} />
                {canEdit && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 left-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemoveRecipe(recipe.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRecipes.map((recipe, index) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="relative group"
              >
                <RecipeListItem 
                  recipe={recipe}
                  showCheckbox
                  isSelected={selectedRecipes.has(recipe.id)}
                  onSelectChange={(checked) => handleSelectRecipe(recipe.id, checked)}
                />
                {canEdit && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1/2 -translate-y-1/2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemoveRecipe(recipe.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        )
      ) : recipes.length > 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <p className="text-muted-foreground mb-4">
            Aucune recette ne correspond à vos filtres
          </p>
          <Button variant="outline" onClick={clearFilters}>
            Effacer les filtres
          </Button>
        </Card>
      ) : (
        <Card className="p-8 sm:p-12 text-center">
          <p className="text-muted-foreground mb-4">
            {canEdit 
              ? "Cette liste est vide. Ajoutez des recettes à votre liste."
              : "Cette liste est vide."}
          </p>
          {canEdit && (
            <AddRecipesToListModal
              listId={id!}
              existingRecipeIds={[]}
            />
          )}
        </Card>
      )}
    </div>
  );
};

export default ListDetail;
