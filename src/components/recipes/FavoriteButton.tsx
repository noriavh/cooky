import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToggleFavorite } from '@/hooks/useRecipeFavorites';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  recipeId: string;
  isFavorite: boolean;
  size?: 'sm' | 'default';
  className?: string;
}

const FavoriteButton = ({ recipeId, isFavorite, size = 'sm', className }: FavoriteButtonProps) => {
  const toggleFavorite = useToggleFavorite();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite.mutate({ recipeId, isFavorite });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'h-8 w-8 shrink-0',
        isFavorite && 'text-yellow-500 hover:text-yellow-600',
        className
      )}
      onClick={handleClick}
      disabled={toggleFavorite.isPending}
    >
      <Star
        className={cn(
          'h-4 w-4',
          size === 'default' && 'h-5 w-5',
          isFavorite && 'fill-current'
        )}
      />
    </Button>
  );
};

export default FavoriteButton;
