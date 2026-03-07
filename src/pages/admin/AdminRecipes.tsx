import { useState, useMemo } from 'react';
import { ChefHat, Search, User, Users, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminRecipes, useAdminProfiles, useAdminFamilies, useAdminOrigins, useAdminTags } from '@/hooks/useAdminData';
import { includesNormalized } from '@/lib/stringUtils';
import OwnerAutocomplete from '@/components/admin/OwnerAutocomplete';

const difficultyLabels: Record<string, string> = {
  facile: 'Facile',
  moyen: 'Moyen',
  difficile: 'Difficile',
};

const AdminRecipes = () => {
  const { data: recipes, isLoading } = useAdminRecipes();
  const { data: profiles } = useAdminProfiles();
  const { data: families } = useAdminFamilies();
  const { data: origins } = useAdminOrigins();
  const { data: tags } = useAdminTags();

  const [searchName, setSearchName] = useState('');
  const [filterOrigin, setFilterOrigin] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterBudget, setFilterBudget] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');

  // Create lookup maps
  const profileMap = useMemo(() => {
    const map = new Map<string, string>();
    profiles?.forEach(p => map.set(p.id, p.username || 'Sans nom'));
    return map;
  }, [profiles]);

  const familyMap = useMemo(() => {
    const map = new Map<string, string>();
    families?.forEach(f => map.set(f.id, f.name));
    return map;
  }, [families]);

  // Get unique owners for filter
  const ownerOptions = useMemo(() => {
    if (!recipes) return [];
    const owners = new Set<string>();
    recipes.forEach(r => {
      if (r.family_id) {
        owners.add(`family:${r.family_id}`);
      } else {
        owners.add(`user:${r.owner_id}`);
      }
    });
    return Array.from(owners).map(o => {
      const [type, id] = o.split(':');
      return {
        value: o,
        label: type === 'family' 
          ? familyMap.get(id) || 'Famille' 
          : profileMap.get(id) || 'Utilisateur',
        type: type as 'user' | 'family',
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, [recipes, profileMap, familyMap]);

  const filteredRecipes = useMemo(() => {
    if (!recipes) return [];

    return recipes.filter(recipe => {
      const matchesName = includesNormalized(recipe.title, searchName);
      const matchesOrigin = filterOrigin === 'all' || recipe.origin?.id === filterOrigin;
      const matchesDifficulty = filterDifficulty === 'all' || recipe.difficulty === filterDifficulty;
      const matchesBudget = filterBudget === 'all' || recipe.price_level === filterBudget;
      
      let matchesOwner = filterOwner === 'all';
      if (!matchesOwner) {
        const [type, id] = filterOwner.split(':');
        if (type === 'family') {
          matchesOwner = recipe.family_id === id;
        } else {
          matchesOwner = recipe.owner_id === id && !recipe.family_id;
        }
      }

      const matchesTag = filterTag === 'all' || 
        recipe.tags?.some(t => t.tag?.id === filterTag);

      return matchesName && matchesOrigin && matchesDifficulty && matchesBudget && matchesOwner && matchesTag;
    });
  }, [recipes, searchName, filterOrigin, filterDifficulty, filterBudget, filterOwner, filterTag]);

  const getOwnerDisplay = (recipe: { owner_id: string; family_id: string | null }) => {
    if (recipe.family_id) {
      return (
        <Badge variant="outline" className="gap-1 border-primary/50 text-primary">
          <Users className="h-3 w-3" />
          {familyMap.get(recipe.family_id) || 'Famille'}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <User className="h-3 w-3" />
        {profileMap.get(recipe.owner_id) || 'Utilisateur'}
      </Badge>
    );
  };

  const handleRowClick = (recipeId: string) => {
    // Open recipe in new tab (main app)
    window.open(`/recipes/${recipeId}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ChefHat className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Recettes</h1>
          <p className="text-muted-foreground text-sm">
            {recipes?.length || 0} recettes au total • Cliquez sur une recette pour la visualiser
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="pl-9"
              />
            </div>

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

            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger>
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les tags</SelectItem>
                {tags?.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulté" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes difficultés</SelectItem>
                <SelectItem value="facile">Facile</SelectItem>
                <SelectItem value="moyen">Moyen</SelectItem>
                <SelectItem value="difficile">Difficile</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterBudget} onValueChange={setFilterBudget}>
              <SelectTrigger>
                <SelectValue placeholder="Budget" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous budgets</SelectItem>
                <SelectItem value="1">€</SelectItem>
                <SelectItem value="2">€€</SelectItem>
                <SelectItem value="3">€€€</SelectItem>
              </SelectContent>
            </Select>

            <OwnerAutocomplete
              options={ownerOptions}
              value={filterOwner}
              onChange={setFilterOwner}
              placeholder="Propriétaire"
            />
          </div>
        </CardContent>
      </Card>

      {/* Recipes Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Origine</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Difficulté</TableHead>
                <TableHead>Propriétaire</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecipes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Aucune recette trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecipes.map((recipe) => (
                  <TableRow 
                    key={recipe.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(recipe.id)}
                  >
                    <TableCell>
                      {recipe.image_url ? (
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <ChefHat className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{recipe.title}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {recipe.tags?.slice(0, 3).map((t) => (
                          <Badge key={t.tag?.id} variant="secondary" className="text-xs">
                            {t.tag?.name}
                          </Badge>
                        ))}
                        {recipe.tags && recipe.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{recipe.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {recipe.origin ? (
                        <span>{recipe.origin.emoji} {recipe.origin.name}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {recipe.price_level ? '€'.repeat(parseInt(recipe.price_level)) : '-'}
                    </TableCell>
                    <TableCell>
                      {recipe.difficulty ? difficultyLabels[recipe.difficulty] : '-'}
                    </TableCell>
                    <TableCell>{getOwnerDisplay(recipe)}</TableCell>
                    <TableCell>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRecipes;
