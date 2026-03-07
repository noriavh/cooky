import { Clock, ChefHat, Euro, Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { Recipe } from '@/hooks/useRecipes';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { useUserFamily } from '@/hooks/useFamilies';
import FavoriteButton from './FavoriteButton';

const dietLabels: Record<string, { label: string; icon: string }> = {
  vegan: { label: 'Végétalien', icon: '🌱' },
  vegetarian: { label: 'Végétarien', icon: '🥚' },
  pescetarian: { label: 'Pescétarien', icon: '🐟' },
};

interface RecipeListItemProps {
  recipe: Recipe;
  isSelected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  showCheckbox?: boolean;
  showOwner?: boolean;
  isFavorite?: boolean;
  showFavoriteButton?: boolean;
}

const typeLabels: Record<string, string> = {
  apero: 'Apéro',
  entree: 'Entrée',
  soupe: 'Soupe',
  plat: 'Plat',
  dessert: 'Dessert',
  boisson: 'Boisson',
};

const difficultyLabels: Record<string, string> = {
  facile: 'Facile',
  moyen: 'Moyen',
  difficile: 'Difficile',
};

const difficultyColors: Record<string, string> = {
  facile: 'bg-success/10 text-success',
  moyen: 'bg-accent/20 text-accent-foreground',
  difficile: 'bg-destructive/10 text-destructive',
};

const RecipeListItem = ({ 
  recipe, 
  isSelected = false,
  onSelectChange,
  showCheckbox = false,
  showOwner = false,
  isFavorite = false,
  showFavoriteButton = false,
}: RecipeListItemProps) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { data: family } = useUserFamily();
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  // Determine if this is "my" recipe (owner or family member)
  const isMyRecipe = recipe.owner_id === user?.id || 
    (family?.id && recipe.family_id === family.id);

  const ownerName = recipe.owner?.username || 'Utilisateur';

  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-card rounded-lg border hover:bg-muted/50 transition-colors group">
      {showCheckbox && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelectChange}
          onClick={(e) => e.stopPropagation()}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
        />
      )}
      
      <Link 
        to={`/recipes/${recipe.id}`} 
        className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0"
      >
        {/* Thumbnail */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
              <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-primary/40" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium truncate text-sm sm:text-base">{recipe.title}</h3>
            {showOwner && !isMyRecipe && (
              <Badge 
                variant="secondary" 
                className="text-xs flex-shrink-0 bg-muted text-muted-foreground"
              >
                {ownerName}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {typeLabels[recipe.recipe_type] || recipe.recipe_type}
            </Badge>
            {totalTime > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="text-xs sm:text-sm">{totalTime} min</span>
              </div>
            )}
            {recipe.diet && recipe.diet !== 'none' && dietLabels[recipe.diet] && (
              <Badge variant="secondary" className="text-xs bg-success/10 text-success">
                {dietLabels[recipe.diet].icon} {dietLabels[recipe.diet].label}
              </Badge>
            )}
            {!isMobile && recipe.price_level && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: parseInt(recipe.price_level) }).map((_, i) => (
                  <Euro key={i} className="w-3 h-3" />
                ))}
              </div>
            )}
            {!isMobile && recipe.difficulty && (
              <Badge variant="secondary" className={`text-xs ${difficultyColors[recipe.difficulty]}`}>
                {difficultyLabels[recipe.difficulty]}
              </Badge>
            )}
          </div>
        </div>
      </Link>
      
      {showFavoriteButton && (
        <FavoriteButton recipeId={recipe.id} isFavorite={isFavorite} />
      )}
    </div>
  );
};

export default RecipeListItem;
