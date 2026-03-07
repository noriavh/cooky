import { useState, useEffect } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EssentialProduct, useUpdateEssentialProduct, useDeleteEssentialProduct } from '@/hooks/useEssentialProducts';
import { toast } from 'sonner';

interface EssentialProductItemProps {
  item: EssentialProduct;
}

const EssentialProductItem = ({ item }: EssentialProductItemProps) => {
  const [quantity, setQuantity] = useState<string>(item.quantity?.toString() || '');
  const updateEssential = useUpdateEssentialProduct();
  const deleteEssential = useDeleteEssentialProduct();

  const unit = item.units || item.shopping_products?.units;

  // Sync local state with item changes
  useEffect(() => {
    setQuantity(item.quantity?.toString() || '');
  }, [item.quantity]);

  const handleQuantityChange = (newValue: string) => {
    setQuantity(newValue);
  };

  const handleQuantityBlur = async () => {
    const numValue = quantity ? parseFloat(quantity) : null;
    if (numValue !== item.quantity) {
      try {
        await updateEssential.mutateAsync({
          id: item.id,
          quantity: numValue || undefined,
          unit_id: item.unit_id || undefined,
        });
      } catch (error) {
        toast.error('Erreur lors de la mise à jour');
        setQuantity(item.quantity?.toString() || '');
      }
    }
  };

  const handleIncrement = async () => {
    const currentValue = parseFloat(quantity) || 0;
    const newValue = currentValue + 1;
    setQuantity(newValue.toString());
    try {
      await updateEssential.mutateAsync({
        id: item.id,
        quantity: newValue,
        unit_id: item.unit_id || undefined,
      });
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
      setQuantity(item.quantity?.toString() || '');
    }
  };

  const handleDecrement = async () => {
    const currentValue = parseFloat(quantity) || 0;
    if (currentValue <= 0) return;
    const newValue = Math.max(0, currentValue - 1);
    setQuantity(newValue > 0 ? newValue.toString() : '');
    try {
      await updateEssential.mutateAsync({
        id: item.id,
        quantity: newValue > 0 ? newValue : undefined,
        unit_id: item.unit_id || undefined,
      });
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
      setQuantity(item.quantity?.toString() || '');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEssential.mutateAsync(item.id);
      toast.success('Produit retiré des essentiels');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="flex items-center justify-between py-2 px-2 hover:bg-muted/50 rounded-md gap-2">
      <span className="font-medium flex-1 min-w-0 truncate">
        {item.shopping_products?.name}
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={handleDecrement}
          disabled={updateEssential.isPending || !quantity}
        >
          <Minus className="h-3 w-3" />
        </Button>

        <Input
          type="number"
          value={quantity}
          onChange={(e) => handleQuantityChange(e.target.value)}
          onBlur={handleQuantityBlur}
          className="h-7 w-14 text-center px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          placeholder="-"
          min="0"
          step="0.1"
        />

        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={handleIncrement}
          disabled={updateEssential.isPending}
        >
          <Plus className="h-3 w-3" />
        </Button>

        {unit && (
          <span className="text-sm text-muted-foreground w-8 text-left">
            {unit.abbreviation || unit.name}
          </span>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
        onClick={handleDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default EssentialProductItem;
