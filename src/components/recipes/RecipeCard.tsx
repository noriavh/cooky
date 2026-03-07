import { motion } from 'framer-motion';
import { Clock, ChefHat, Euro, Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Recipe } from '@/hooks/useRecipes';
import { useAuth } from '@/contexts/AuthContext';
import { useUserFamily } from '@/hooks/useFamilies';
import FavoriteButton from './FavoriteButton';

const dietLabels: Record<string, { label: string; icon: string }> = {
  vegan: { label: 'Végétalien', icon: '🌱' },
  vegetarian: { label: 'Végétarien', icon: '🥚' },
  pescetarian: { label: 'Pescétarien', icon: '🐟' },
};

interface RecipeCardProps {
  recipe: Recipe;
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

const difficultyColors: Record<string, string> = {
  facile: 'bg-success/10 text-success',
  moyen: 'bg-accent/20 text-accent-foreground',
  difficile: 'bg-destructive/10 text-destructive',
};

const RecipeCard = ({ recipe, showOwner = false, isFavorite = false, showFavoriteButton = false }: RecipeCardProps) => {
  const { user } = useAuth();
  const { data: family } = useUserFamily();
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  // Determine if this is "my" recipe (owner or family member)
  const isMyRecipe = recipe.owner_id === user?.id || 
    (family?.id && recipe.family_id === family.id);

  const ownerName = recipe.owner?.username || 'Utilisateur';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link to={`/recipes/${recipe.id}`}>
        <Card className="overflow-hidden shadow-card hover:shadow-hover transition-shadow duration-300 border-0 bg-card">
          <div className="aspect-[4/3] relative bg-secondary overflow-hidden">
            {recipe.image_url ? (
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                <ChefHat className="w-12 h-12 text-primary/40" />
              </div>
            )}
            {recipe.diet && recipe.diet !== 'none' && dietLabels[recipe.diet] && (
              <Badge className="absolute top-2 left-2 bg-success text-success-foreground">
                {dietLabels[recipe.diet].icon} {dietLabels[recipe.diet].label}
              </Badge>
            )}
            {showOwner && !isMyRecipe && (
              <Badge 
                className={`absolute ${recipe.diet && recipe.diet !== 'none' ? 'top-10' : 'top-2'} left-2 bg-secondary text-secondary-foreground`}
              >
                {ownerName}
              </Badge>
            )}
            <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
              {typeLabels[recipe.recipe_type] || recipe.recipe_type}
            </Badge>
            {showFavoriteButton && (
              <div className="absolute bottom-2 right-2">
                <FavoriteButton 
                  recipeId={recipe.id} 
                  isFavorite={isFavorite} 
                  className="bg-background/80 hover:bg-background"
                />
              </div>
            )}
          </div>
          <CardContent className="p-4">
            <h3 className="font-display font-semibold text-lg mb-2 line-clamp-1">
              {recipe.title}
            </h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {totalTime > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{totalTime} min</span>
                </div>
              )}
              {recipe.price_level && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: parseInt(recipe.price_level) }).map((_, i) => (
                    <Euro key={i} className="w-3 h-3" />
                  ))}
                </div>
              )}
              {recipe.difficulty && (
                <Badge variant="secondary" className={difficultyColors[recipe.difficulty]}>
                  {recipe.difficulty}
                </Badge>
              )}
            </div>
            {/* Tags */}
            {recipe.recipe_tags && recipe.recipe_tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {recipe.recipe_tags
                  .filter((rt) => rt.tags !== null)
                  .slice(0, 3)
                  .map((rt) => (
                    <Badge 
                      key={rt.tags!.id} 
                      variant="outline" 
                      className="text-xs px-1.5 py-0"
                    >
                      {rt.tags!.name}
                    </Badge>
                  ))}
                {recipe.recipe_tags.filter((rt) => rt.tags !== null).length > 3 && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    +{recipe.recipe_tags.filter((rt) => rt.tags !== null).length - 3}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
};

export default RecipeCard;
