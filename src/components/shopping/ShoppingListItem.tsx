import { useState, useRef, useEffect } from 'react';
import { Minus, Plus, Trash2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverTrigger,
} from '@/components/ui/popover';
import { LinkProductPopoverContent } from '@/components/shopping/LinkProductPopoverContent';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useUpdateShoppingListItem,
  useDeleteShoppingListItem,
  type ShoppingListItem as ShoppingListItemType,
} from '@/hooks/useShoppingList';
import { useUnits } from '@/hooks/useRecipes';
import { useSearchShoppingProducts, type ShoppingProduct } from '@/hooks/useShoppingProducts';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';

interface ShoppingListItemProps {
  item: ShoppingListItemType;
  shoppingMode?: boolean;
}

const ShoppingListItem = ({ item, shoppingMode = false }: ShoppingListItemProps) => {
  const isMobile = useIsMobile();
  const { data: units } = useUnits();
  const updateItem = useUpdateShoppingListItem();
  const deleteItem = useDeleteShoppingListItem();

  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [localQuantity, setLocalQuantity] = useState(item.quantity?.toString() ?? '');
  
  // Product linking state
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Swipe to delete state
  const x = useMotionValue(0);
  const background = useTransform(x, [0, 100], ['transparent', 'hsl(var(--destructive))']);
  const opacity = useTransform(x, [0, 100], [0, 1]);
  
  const { data: searchResults, isLoading: isSearching } = useSearchShoppingProducts(searchTerm);

  // Focus search input when popover opens
  useEffect(() => {
    if (isLinkPopoverOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isLinkPopoverOpen]);

  // Reset search when popover closes
  useEffect(() => {
    if (!isLinkPopoverOpen) {
      setSearchTerm('');
    }
  }, [isLinkPopoverOpen]);

  const handleToggleChecked = async () => {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        checked: !item.checked,
      });
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 0) return;
    try {
      await updateItem.mutateAsync({
        id: item.id,
        quantity: newQuantity || null,
      });
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleQuantityBlur = () => {
    setIsEditingQuantity(false);
    const newQuantity = parseFloat(localQuantity);
    if (!isNaN(newQuantity) && newQuantity !== item.quantity) {
      handleQuantityChange(newQuantity);
    }
  };

  const handleUnitChange = async (unitId: string) => {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        unit_id: unitId === 'none' ? null : unitId,
      });
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteItem.mutateAsync(item.id);
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleLinkProduct = async (product: ShoppingProduct) => {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        product_id: product.id,
        aisle_id: product.aisle_id,
        unit_id: product.unit_id,
      });
      toast.success(`Associé à "${product.name}"`);
      setIsLinkPopoverOpen(false);
    } catch (error) {
      toast.error('Erreur lors de l\'association');
    }
  };

  const decrementQuantity = () => {
    const currentQty = item.quantity ?? 1;
    if (currentQty > 0) {
      handleQuantityChange(currentQty - 1);
      setLocalQuantity((currentQty - 1).toString());
    }
  };

  const incrementQuantity = () => {
    const currentQty = item.quantity ?? 0;
    handleQuantityChange(currentQty + 1);
    setLocalQuantity((currentQty + 1).toString());
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      handleDelete();
    }
  };

  // Check if item is unmatched (no product_id linked)
  const isUnmatched = !item.product_id;

  // Link Product Popover Content (extracted component to avoid remount + focus loss)
  const linkPopoverContent = (
    <LinkProductPopoverContent
      inputRef={searchInputRef}
      searchTerm={searchTerm}
      onSearchTermChange={setSearchTerm}
      onClearSearch={() => setSearchTerm('')}
      isSearching={isSearching}
      searchResults={searchResults}
      onSelectProduct={handleLinkProduct}
    />
  );

  // Mobile layout - single row with swipe to delete
  if (isMobile) {
    // Shopping mode - simplified, taller rows, click anywhere to toggle
    if (shoppingMode) {
      return (
        <div className="relative overflow-hidden">
          {/* Delete background */}
          <motion.div 
            className="absolute inset-0 flex items-center justify-end pr-4 rounded-lg"
            style={{ background }}
          >
            <motion.div style={{ opacity }}>
              <Trash2 className="h-5 w-5 text-destructive-foreground" />
            </motion.div>
          </motion.div>
          
          {/* Swipeable content */}
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.3 }}
            onDragEnd={handleDragEnd}
            style={{ x }}
            onClick={handleToggleChecked}
            className={cn(
              'flex items-center gap-3 py-4 px-2 rounded-lg transition-colors bg-background relative cursor-pointer active:bg-accent/30',
              item.checked && 'bg-muted/50'
            )}
          >
            <Checkbox
              checked={item.checked}
              onCheckedChange={handleToggleChecked}
              onClick={(e) => e.stopPropagation()}
              className="h-6 w-6 shrink-0"
            />
            
            {/* Quantity and unit display */}
            <span className={cn(
              'text-sm font-medium shrink-0 min-w-[3rem]',
              item.checked && 'text-muted-foreground'
            )}>
              {item.quantity ?? '-'} {item.units?.abbreviation || item.units?.name || ''}
            </span>

            {/* Name - takes remaining space */}
            <span
              className={cn(
                'flex-1 truncate text-base min-w-0',
                item.checked && 'text-muted-foreground line-through'
              )}
            >
              {item.name}
            </span>
          </motion.div>
        </div>
      );
    }

    // Edit mode - current mobile layout
    return (
      <div className="relative overflow-hidden">
        {/* Delete background */}
        <motion.div 
          className="absolute inset-0 flex items-center justify-end pr-4 rounded-lg"
          style={{ background }}
        >
          <motion.div style={{ opacity }}>
            <Trash2 className="h-5 w-5 text-destructive-foreground" />
          </motion.div>
        </motion.div>
        
        {/* Swipeable content */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0, right: 0.3 }}
          onDragEnd={handleDragEnd}
          style={{ x }}
          className={cn(
            'flex items-center gap-1.5 py-2.5 rounded-lg transition-colors bg-background relative',
            item.checked && 'bg-muted/50'
          )}
        >
          <Checkbox
            checked={item.checked}
            onCheckedChange={handleToggleChecked}
            className="h-5 w-5 shrink-0"
          />
          
          {/* Quantity controls - compact */}
          <div className="flex items-center shrink-0 ml-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0"
              onClick={decrementQuantity}
              disabled={updateItem.isPending}
            >
              <Minus className="h-3 w-3" />
            </Button>
            
            {isEditingQuantity ? (
              <Input
                type="number"
                value={localQuantity}
                onChange={(e) => setLocalQuantity(e.target.value)}
                onBlur={handleQuantityBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleQuantityBlur()}
                className="w-7 h-6 text-center text-xs p-0"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditingQuantity(true)}
                className={cn(
                  'w-6 text-center font-medium text-xs',
                  item.checked && 'text-muted-foreground line-through'
                )}
              >
                {item.quantity ?? '-'}
              </button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0"
              onClick={incrementQuantity}
              disabled={updateItem.isPending}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {/* Unit selector - compact */}
          <Select
            value={item.unit_id ?? 'none'}
            onValueChange={handleUnitChange}
          >
            <SelectTrigger className="w-14 h-6 text-xs px-1.5 shrink-0">
              <SelectValue placeholder="-" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-</SelectItem>
              {units?.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.abbreviation || unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Name - takes remaining space */}
          <span
            className={cn(
              'flex-1 truncate text-sm min-w-0',
              item.checked && 'text-muted-foreground line-through'
            )}
          >
            {item.name}
          </span>
          
          {/* Link button only for unmatched */}
          {isUnmatched && (
            <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-amber-600 hover:text-amber-700 hover:bg-amber-100 shrink-0"
                  title="Associer à un produit"
                >
                  <Link2 className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              {linkPopoverContent}
            </Popover>
          )}
        </motion.div>
      </div>
    );
  }

  // Desktop layout - single row
  return (
    <div
      className={cn(
        'flex items-center gap-2 py-2 px-2 rounded-lg transition-colors',
        item.checked && 'bg-muted/50'
      )}
    >
      {/* Checkbox */}
      <Checkbox
        checked={item.checked}
        onCheckedChange={handleToggleChecked}
        className="h-5 w-5"
      />

      {/* Quantity controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={decrementQuantity}
          disabled={updateItem.isPending}
        >
          <Minus className="h-3 w-3" />
        </Button>
        
        {isEditingQuantity ? (
          <Input
            type="number"
            value={localQuantity}
            onChange={(e) => setLocalQuantity(e.target.value)}
            onBlur={handleQuantityBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleQuantityBlur()}
            className="w-14 h-7 text-center text-sm p-1"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditingQuantity(true)}
            className={cn(
              'min-w-[3rem] text-center font-medium text-sm',
              item.checked && 'text-muted-foreground line-through'
            )}
          >
            {item.quantity ?? '-'}
          </button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={incrementQuantity}
          disabled={updateItem.isPending}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Unit selector */}
      <Select
        value={item.unit_id ?? 'none'}
        onValueChange={handleUnitChange}
      >
        <SelectTrigger className="w-20 h-7 text-xs">
          <SelectValue placeholder="-" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">-</SelectItem>
          {units?.map((unit) => (
            <SelectItem key={unit.id} value={unit.id}>
              {unit.abbreviation || unit.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Name */}
      <span
        className={cn(
          'flex-1 text-sm truncate',
          item.checked && 'text-muted-foreground line-through'
        )}
      >
        {item.name}
      </span>

      {/* Link to product button - only for unmatched items */}
      {isUnmatched && (
        <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
              title="Associer à un produit existant"
            >
              <Link2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            {linkPopoverContent}
          </Popover>
      )}

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleDelete}
        disabled={deleteItem.isPending}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ShoppingListItem;
