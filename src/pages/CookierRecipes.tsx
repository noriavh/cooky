import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Search, Loader2, ChefHat } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import RecipeCard from '@/components/recipes/RecipeCard';
import RecipeListItem from '@/components/recipes/RecipeListItem';
import ViewToggle from '@/components/recipes/ViewToggle';
import { Badge } from '@/components/ui/badge';
import { Tables } from '@/integrations/supabase/types';

type Recipe = Tables<'recipes'> & {
  origins?: Tables<'origins'> | null;
  recipe_tags?: { tags: Tables<'tags'> }[];
};

const typeOptions = [
  { value: 'all', label: 'Tous les types' },
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
  { value: 'all', label: 'Toutes difficultés' },
  { value: 'facile', label: 'Facile' },
  { value: 'moyen', label: 'Moyen' },
  { value: 'difficile', label: 'Difficile' },
];

const CookierRecipes = () => {
  const { cookierId } = useParams<{ cookierId: string }>();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [originFilter, setOriginFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch cookier profile
  const { data: cookierProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['cookier-profile', cookierId],
    queryFn: async () => {
      if (!cookierId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', cookierId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!cookierId,
  });

  // Fetch cookier's recipes - RLS handles visibility, we just need to filter by owner
  // For cookiers in a family, we fetch recipes owned by them OR belonging to their family
  const { data: recipes, isLoading: recipesLoading } = useQuery({
    queryKey: ['cookier-recipes', cookierId],
    queryFn: async () => {
      if (!cookierId) return [];
      
      // Get all recipes accessible via RLS where the cookier is the owner
      // This will include personal recipes and family recipes they own
      const { data: ownedRecipes, error: ownedError } = await supabase
        .from('recipes')
        .select(`
          *,
          origins (*),
          recipe_tags (tags (*))
        `)
        .eq('owner_id', cookierId)
        .order('created_at', { ascending: false });
      
      if (ownedError) throw ownedError;
      
      // If cookier has family recipes, also get other family members' recipes
      // by checking if any of their recipes have a family_id
      const familyIds = [...new Set(ownedRecipes?.filter(r => r.family_id).map(r => r.family_id))];
      
      if (familyIds.length > 0) {
        // Get all family recipes (owned by any family member)
        const { data: familyRecipes, error: familyError } = await supabase
          .from('recipes')
          .select(`
            *,
            origins (*),
            recipe_tags (tags (*))
          `)
          .in('family_id', familyIds)
          .order('created_at', { ascending: false });
        
        if (familyError) throw familyError;
        return familyRecipes as Recipe[];
      }
      
      return ownedRecipes as Recipe[];
    },
    enabled: !!cookierId,
  });

  // Fetch origins for filter
  const { data: origins } = useQuery({
    queryKey: ['origins'],
    queryFn: async () => {
      const { data, error } = await supabase.from('origins').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch tags for filter
  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tags').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Get unique tags from recipes
  const availableTags = useMemo(() => {
    if (!recipes || !tags) return [];
    const tagIds = new Set<string>();
    recipes.forEach(recipe => {
      recipe.recipe_tags?.forEach(rt => {
        if (rt.tags?.id) tagIds.add(rt.tags.id);
      });
    });
    return tags.filter(tag => tagIds.has(tag.id));
  }, [recipes, tags]);

  // Filter recipes
  const filteredRecipes = useMemo(() => {
    if (!recipes) return [];
    return recipes.filter(recipe => {
      const matchesSearch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || recipe.recipe_type === typeFilter;
      const matchesOrigin = originFilter === 'all' || recipe.origin_id === originFilter;
      const matchesDifficulty = difficultyFilter === 'all' || recipe.difficulty === difficultyFilter;
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.every(tagId => 
          recipe.recipe_tags?.some(rt => rt.tags?.id === tagId)
        );
      return matchesSearch && matchesType && matchesOrigin && matchesDifficulty && matchesTags;
    });
  }, [recipes, searchQuery, typeFilter, originFilter, difficultyFilter, selectedTags]);

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const isLoading = profileLoading || recipesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!recipes || recipes.length === 0) {
    return (
      <div className="container max-w-4xl py-6 px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div className="text-center py-12">
          <ChefHat className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Aucune recette</h2>
          <p className="text-muted-foreground">
            {cookierProfile?.username || 'Ce cookier'} n'a pas encore partagé de recettes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Recettes de {cookierProfile?.username || 'Cookier'}
          </h1>
        </div>
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher une recette..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={originFilter} onValueChange={setOriginFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Origine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes origines</SelectItem>
              {origins?.map(origin => (
                <SelectItem key={origin.id} value={origin.id}>
                  {origin.emoji} {origin.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Difficulté" />
            </SelectTrigger>
            <SelectContent>
              {difficultyOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {availableTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <Badge
                key={tag.id}
                variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Recipe count */}
      <p className="text-sm text-muted-foreground">
        {filteredRecipes.length} recette{filteredRecipes.length > 1 ? 's' : ''}
      </p>

      {/* Recipes */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRecipes.map(recipe => (
            <RecipeListItem key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CookierRecipes;
