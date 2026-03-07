import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddToMealPlanDialog from './AddToMealPlanDialog';

interface AddToMealPlanButtonProps {
  recipeId: string;
  recipeTitle: string;
  recipeServings?: number | null;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

const AddToMealPlanButton = ({
  recipeId,
  recipeTitle,
  recipeServings,
  variant = 'outline',
  size = 'sm',
  showLabel = true,
}: AddToMealPlanButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
      >
        <CalendarPlus className="h-4 w-4" />
        {showLabel && <span className="ml-2">Planifier</span>}
      </Button>

      <AddToMealPlanDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        recipeId={recipeId}
        recipeTitle={recipeTitle}
        recipeServings={recipeServings}
      />
    </>
  );
};

export default AddToMealPlanButton;
