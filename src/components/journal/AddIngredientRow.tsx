import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import IngredientProductSelect from '@/components/recipes/IngredientProductSelect';
import { useGetOrCreateProduct } from '@/hooks/useShoppingProducts';
import { toast } from 'sonner';

interface AddIngredientRowProps {
  onAdd: (productId: string) => Promise<void>;
}

const AddIngredientRow = ({ onAdd }: AddIngredientRowProps) => {
  const [value, setValue] = useState<{ productId: string | null; name: string }>({ productId: null, name: '' });
  const [isAdding, setIsAdding] = useState(false);
  const getOrCreateProduct = useGetOrCreateProduct();

  const addProduct = async (productId: string) => {
    setIsAdding(true);
    try {
      await onAdd(productId);
      setValue({ productId: null, name: '' });
    } catch {
      toast.error("Erreur lors de l'ajout de l'ingrédient");
    } finally {
      setIsAdding(false);
    }
  };

  const handleChange = (newValue: { productId: string | null; name: string }) => {
    setValue(newValue);
    if (newValue.productId) {
      addProduct(newValue.productId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = value.name.trim();
    if (!name || isAdding) return;

    setIsAdding(true);
    try {
      const product = await getOrCreateProduct.mutateAsync({ name });
      await onAdd(product.id);
      setValue({ productId: null, name: '' });
    } catch {
      toast.error("Erreur lors de l'ajout de l'ingrédient");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <IngredientProductSelect
        value={value}
        onChange={handleChange}
        placeholder="Ajouter un ingrédient..."
        inputClassName="h-8 text-sm"
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0"
        disabled={!value.name.trim() || isAdding}
        title="Ajouter"
      >
        {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
      </Button>
    </form>
  );
};

export default AddIngredientRow;
