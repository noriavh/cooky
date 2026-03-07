import { useState, useRef, useEffect } from 'react';
import { Link2, Plus, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useSearchShoppingProducts, useCreateShoppingProduct, type ShoppingProduct } from '@/hooks/useShoppingProducts';
import { useAisles } from '@/hooks/useShoppingList';
import { toast } from 'sonner';

interface IngredientLinkButtonProps {
  ingredientName: string;
  onLink: (productId: string, productName: string) => void;
}

// Custom hook for debounced value
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const IngredientLinkButton = ({ ingredientName, onLink }: IngredientLinkButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { data: products = [], isLoading } = useSearchShoppingProducts(debouncedSearchTerm);
  const { data: aisles } = useAisles();
  const createProduct = useCreateShoppingProduct();

  // Initialize search with ingredient name when opening
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSearchTerm(ingredientName);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearchTerm('');
    }
    setIsOpen(open);
  };

  const handleSelectProduct = (product: ShoppingProduct) => {
    onLink(product.id, product.name);
    setIsOpen(false);
  };

  const handleCreateProduct = async () => {
    if (!searchTerm.trim()) return;

    try {
      const autresAisle = aisles?.find(a => a.name === 'Autres');
      const newProduct = await createProduct.mutateAsync({
        name: searchTerm.trim(),
        aisle_id: autresAisle?.id || null,
      });
      onLink(newProduct.id, newProduct.name);
      setIsOpen(false);
      toast.success(`Produit "${newProduct.name}" créé`);
    } catch (error) {
      toast.error('Erreur lors de la création du produit');
    }
  };

  // Check if exact match exists
  const exactMatchExists = products.some(
    p => p.name.toLowerCase() === searchTerm.toLowerCase().trim()
  );

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          title="Associer un produit"
        >
          <Link2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-2"
        align="end"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Input
          ref={inputRef}
          placeholder="Rechercher un produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-2"
          onBlur={(e) => {
            const next = e.relatedTarget as HTMLElement | null;
            const popoverContent = e.currentTarget.closest('[data-radix-popper-content-wrapper]');
            if (next && popoverContent?.contains(next)) {
              requestAnimationFrame(() => inputRef.current?.focus());
            }
          }}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : products.length > 0 ? (
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-1">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent text-sm flex items-center justify-between"
                  onClick={() => handleSelectProduct(product)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <span>{product.name}</span>
                  {product.aisles && (
                    <Badge variant="outline" className="text-xs ml-2">
                      {product.aisles.name}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        ) : searchTerm.trim() ? (
          <p className="text-sm text-muted-foreground py-2 px-2">
            Aucun produit trouvé
          </p>
        ) : null}

        {searchTerm.trim() && !exactMatchExists && (
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start mt-1 text-primary"
            onClick={handleCreateProduct}
            onMouseDown={(e) => e.preventDefault()}
            disabled={createProduct.isPending}
          >
            {createProduct.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Créer "{searchTerm.trim()}"
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default IngredientLinkButton;
