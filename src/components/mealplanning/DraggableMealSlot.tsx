import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MealType, MealSlotData } from '@/hooks/useMealPlans';
import MealSlot from './MealSlot';
import { cn } from '@/lib/utils';

interface DraggableMealSlotProps {
  date: string;
  mealType: MealType;
  slotData?: MealSlotData;
  onAddMeal: (date: string, mealType: MealType, recipeId: string | null, servings: number, customText?: string) => void;
}

const DraggableMealSlot = ({ date, mealType, slotData, onAddMeal }: DraggableMealSlotProps) => {
  const slotId = `${date}-${mealType}`;
  const hasContent = slotData && slotData.mealPlans.length > 0;
  
  // Make filled slots draggable
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: slotId,
    data: { date, mealType, slotData },
    disabled: !hasContent,
  });

  // Make all slots droppable
  const { setNodeRef: setDropRef, isOver, active } = useDroppable({
    id: slotId,
    data: { date, mealType },
  });

  // Combine refs
  const setNodeRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined;

  // Don't show drop indicator on the source slot
  const showDropIndicator = isOver && active?.id !== slotId;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(hasContent ? { ...attributes, ...listeners } : {})}
      className={cn(
        'h-full transition-all duration-200',
        hasContent && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50 scale-95',
        showDropIndicator && 'ring-2 ring-primary ring-offset-2 rounded-lg'
      )}
    >
      <MealSlot
        date={date}
        mealType={mealType}
        slotData={slotData}
        onAddMeal={onAddMeal}
      />
    </div>
  );
};

export default DraggableMealSlot;
