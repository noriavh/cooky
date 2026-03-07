import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ChefHat, X, ShoppingBasket, Leaf } from 'lucide-react';
import { includesNormalized } from '@/lib/stringUtils';
import { motion } from 'framer-motion';
import { useMyRecipes, useOrigins, useTags } from '@/hooks/useRecipes';
import { useShoppingProducts } from '@/hooks/useShoppingProducts';
import { useSeasonalProducts } from '@/hooks/useSeasonalProducts';
import { useProfile, isDietCompatible, DIET_LABELS, type DietType } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Checkbox } from '@/components/ui/checkbox';
import RecipeCard from '@/components/recipes/RecipeCard';
import RecipeListItem from '@/components/recipes/RecipeListItem';
import ViewToggle, { ViewMode } from '@/components/recipes/ViewToggle';
import BulkActionsMenu from '@/components/recipes/BulkActionsMenu';
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

const dietOptions = [
  { value: 'none', label: '🍖 Omnivore' },
  { value: 'pescetarian', label: '🐟 Pescétarien' },
  { value: 'vegetarian', label: '🥚 Végétarien' },
  { value: 'vegan', label: '🌱 Végétalien' },
];

const Recipes = () => {
  const isMobile = useIsMobile();
  const { data: recipes, isLoading } = useMyRecipes();
  const { data: origins } = useOrigins();
  const { data: tags } = useTags();
  const { data: profile } = useProfile();
  const { data: products } = useShoppingProducts();
  const { data: seasonalProducts } = useSeasonalProducts();

  // Get product IDs that are in season for current month
  const currentMonth = new Date().getMonth() + 1;
  const seasonalProductIds = useMemo(() => {
    if (!seasonalProducts) return new Set<string>();
    return new Set(
      seasonalProducts
        .filter(p => p.product_seasons?.some(s => s.month === currentMonth))
        .map(p => p.id)
    );
  }, [seasonalProducts, currentMonth]);

  const [searchName, setSearchName] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterOrigin, setFilterOrigin] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterDiet, setFilterDiet] = useState<string>('all');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterSeasonal, setFilterSeasonal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());
  const [dietFilterInitialized, setDietFilterInitialized] = useState(false);

  // Initialize diet filter from user profile
  useEffect(() => {
    if (profile && !dietFilterInitialized) {
      if (profile.diet && profile.diet !== 'none') {
        setFilterDiet(profile.diet);
      }
      setDietFilterInitialized(true);
    }
  }, [profile, dietFilterInitialized]);

  // Filter products for search
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!productSearch.trim()) return products.slice(0, 50);
    return products
      .filter(p => includesNormalized(p.name, productSearch))
      .slice(0, 50);
  }, [products, productSearch]);

  const filteredRecipes = useMemo(() => {
    if (!recipes) return [];

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

      // Filter by diet
      if (filterDiet !== 'all') {
        const recipeDiet = (recipe as any).diet as DietType;
        if (!isDietCompatible(recipeDiet, filterDiet as DietType)) {
          return false;
        }
      }

      // Filter by tags (AND logic - recipe must have ALL selected tags)
      if (filterTags.length > 0) {
        const recipeTagIds = recipe.recipe_tags?.filter(rt => rt.tags).map(rt => rt.tags.id) || [];
        const hasAllTags = filterTags.every(tagId => recipeTagIds.includes(tagId));
        if (!hasAllTags) return false;
      }

      // Filter by product (ingredient contains this product)
      if (filterProduct !== 'all') {
        const hasProduct = recipe.ingredients?.some(ing => ing.product_id === filterProduct);
        if (!hasProduct) return false;
      }

      // Filter by seasonal (all fruit/vegetable ingredients must be in season)
      if (filterSeasonal && seasonalProductIds.size > 0) {
        const fruitVegIngredients = recipe.ingredients?.filter(ing => 
          ing.product_id && seasonalProducts?.some(sp => sp.id === ing.product_id)
        ) || [];
        
        // Recipe passes if it has no fruit/veg ingredients OR all fruit/veg ingredients are in season
        if (fruitVegIngredients.length > 0) {
          const allInSeason = fruitVegIngredients.every(ing => 
            ing.product_id && seasonalProductIds.has(ing.product_id)
          );
          if (!allInSeason) return false;
        }
      }

      return true;
    });
  }, [recipes, searchName, filterType, filterOrigin, filterDifficulty, filterDiet, filterTags, filterProduct, filterSeasonal, seasonalProductIds, seasonalProducts]);

  const hasActiveFilters = searchName || filterType !== 'all' || filterOrigin !== 'all' || filterDifficulty !== 'all' || filterDiet !== 'all' || filterTags.length > 0 || filterProduct !== 'all' || filterSeasonal;

  const clearFilters = () => {
    setSearchName('');
    setFilterType('all');
    setFilterOrigin('all');
    setFilterDifficulty('all');
    setFilterDiet('all');
    setFilterTags([]);
    setFilterProduct('all');
    setFilterSeasonal(false);
    setProductSearch('');
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

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header with filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border p-3 sm:p-4 space-y-3 sm:space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-display font-bold">Mes Recettes</h1>
          <div className="flex items-center gap-2">
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            <Link to="/recipes/new">
              <Button className="gradient-warm text-primary-foreground hover:opacity-90" size={isMobile ? 'icon' : 'default'}>
                <Plus className="w-4 h-4" />
                {!isMobile && <span className="ml-2">Nouvelle recette</span>}
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3">
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

          {/* Filter by diet */}
          <Select value={filterDiet} onValueChange={setFilterDiet}>
            <SelectTrigger>
              <SelectValue placeholder="Régime" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous régimes</SelectItem>
              {dietOptions.map((option) => (
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

        {/* Filter by product and seasonal row */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShoppingBasket className="h-4 w-4" />
              <span>Par produit :</span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-between font-normal">
                  <span className={filterProduct === 'all' ? 'text-muted-foreground' : ''}>
                    {filterProduct === 'all' 
                      ? 'Tous les produits' 
                      : products?.find(p => p.id === filterProduct)?.name || 'Produit'}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-2">
                  <Input
                    placeholder="Rechercher un produit..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="h-8"
                  />
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    <div
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => {
                        setFilterProduct('all');
                        setProductSearch('');
                      }}
                    >
                      <span className="text-sm">Tous les produits</span>
                    </div>
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                        onClick={() => {
                          setFilterProduct(product.id);
                          setProductSearch('');
                        }}
                      >
                        <span className="text-sm">{product.name}</span>
                        {product.aisles && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {product.aisles.icon}
                          </span>
                        )}
                      </div>
                    ))}
                    {filteredProducts.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Aucun produit trouvé
                      </p>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {filterProduct !== 'all' && (
              <Badge variant="secondary" className="gap-1 pr-1">
                {products?.find(p => p.id === filterProduct)?.name}
                <button 
                  onClick={() => setFilterProduct('all')}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>

          {/* Seasonal filter */}
          <Button
            variant={filterSeasonal ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterSeasonal(!filterSeasonal)}
            className="gap-2"
          >
            <Leaf className="h-4 w-4" />
            De saison
          </Button>
        </div>

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
      {isLoading ? (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          : "space-y-2"
        }>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className={viewMode === 'grid' ? "h-64 animate-pulse bg-muted" : "h-20 animate-pulse bg-muted"} />
          ))}
        </div>
      ) : filteredRecipes.length > 0 ? (
        viewMode === 'grid' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredRecipes.map((recipe, index) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <RecipeCard recipe={recipe} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            {filteredRecipes.map((recipe, index) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <RecipeListItem 
                  recipe={recipe} 
                  showCheckbox
                  isSelected={selectedRecipes.has(recipe.id)}
                  onSelectChange={(checked) => handleSelectRecipe(recipe.id, checked)}
                />
              </motion.div>
            ))}
          </motion.div>
        )
      ) : (
        <Card className="p-8 sm:p-12 text-center">
          <ChefHat className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground/50 mb-4" />
          {hasActiveFilters ? (
            <>
              <p className="text-base sm:text-lg font-medium text-foreground mb-2">
                Aucune recette trouvée
              </p>
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                Essayez de modifier vos filtres
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Effacer les filtres
              </Button>
            </>
          ) : (
            <>
              <p className="text-base sm:text-lg font-medium text-foreground mb-2">
                Aucune recette pour le moment
              </p>
              <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                Commencez par créer votre première recette
              </p>
              <Link to="/recipes/new">
                <Button className="gradient-warm text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer une recette
                </Button>
              </Link>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default Recipes;
