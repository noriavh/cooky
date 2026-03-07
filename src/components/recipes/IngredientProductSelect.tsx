import { useState, useRef, useEffect } from 'react';
import { Link2, Plus, X, Loader2, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useSearchShoppingProducts, useCreateShoppingProduct, type ShoppingProduct } from '@/hooks/useShoppingProducts';
import { useAisles } from '@/hooks/useShoppingList';
import { useIsAdmin } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import AddProductDialog from '@/components/shopping/AddProductDialog';

interface IngredientProductSelectProps {
  value: { productId: string | null; name: string };
  onChange: (value: { productId: string | null; name: string; defaultUnitId?: string | null }) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
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

const IngredientProductSelect = ({
  value,
  onChange,
  placeholder = "Nom de l'ingrédient",
  className,
  inputClassName,
}: IngredientProductSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { data: products = [], isLoading } = useSearchShoppingProducts(debouncedSearchTerm);
  const { data: aisles } = useAisles();
  const createProduct = useCreateShoppingProduct();
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const [isGlobalDialogOpen, setIsGlobalDialogOpen] = useState(false);
  const [pendingGlobalName, setPendingGlobalName] = useState('');

  // If we have a productId but no name displayed, we need the product name
  const displayValue = value.productId ? value.name : value.name;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    // If typing, we're in "unlinked" mode - just update the name
    onChange({ productId: null, name: newValue });
    if (newValue.trim() && !isOpen) {
      setIsOpen(true);
    }
  };

  const handleSelectProduct = (product: ShoppingProduct) => {
    onChange({ productId: product.id, name: product.name, defaultUnitId: product.unit_id });
    setSearchTerm('');
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
      onChange({ productId: newProduct.id, name: newProduct.name });
      setSearchTerm('');
      setIsOpen(false);
      toast.success(`Produit "${newProduct.name}" créé`);
    } catch (error) {
      toast.error('Erreur lors de la création du produit');
    }
  };

  const handleOpenGlobalDialog = () => {
    setPendingGlobalName(searchTerm.trim());
    setIsOpen(false);
    setIsGlobalDialogOpen(true);
  };

  const handleGlobalDialogClose = (open: boolean) => {
    setIsGlobalDialogOpen(open);
    if (!open) {
      // Refresh products list after dialog closes
      queryClient.invalidateQueries({ queryKey: ['shopping-products'] });
    }
  };

  const handleUnlinkProduct = () => {
    onChange({ productId: null, name: value.name });
  };

  const handleLinkClick = () => {
    setSearchTerm(value.name);
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Check if exact match exists
  const exactMatchExists = products.some(
    p => p.name.toLowerCase() === searchTerm.toLowerCase().trim()
  );

  return (
    <div ref={containerRef} className={cn("flex-1 relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative flex items-center gap-1">
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={value.productId ? displayValue : searchTerm || displayValue}
              onChange={handleInputChange}
              onFocus={() => {
                if (value.name.trim() || searchTerm.trim()) {
                  if (!value.productId) {
                    setSearchTerm(value.name);
                  }
                  setIsOpen(true);
                }
              }}
              className={cn(inputClassName, value.productId ? 'pr-8' : '')}
            />
            {value.productId ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 h-full w-8 hover:bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnlinkProduct();
                }}
                title="Dissocier le produit"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </Button>
            ) : value.name.trim() && !isOpen ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 h-full w-8 hover:bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLinkClick();
                }}
                title="Associer un produit"
              >
                <Link2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            ) : null}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[280px] p-2"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : products.length > 0 ? (
            <>
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
              {searchTerm.trim() && !exactMatchExists && (
                <>
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
                  {isAdmin && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full justify-start text-primary"
                      onClick={handleOpenGlobalDialog}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Créer un produit global
                    </Button>
                  )}
                </>
              )}
            </>
          ) : searchTerm.trim() ? (
            <>
              <p className="text-sm text-muted-foreground py-2 px-2">
                Aucun produit trouvé
              </p>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start text-primary"
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
              {isAdmin && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start text-primary"
                  onClick={handleOpenGlobalDialog}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Créer un produit global
                </Button>
              )}
            </>
          ) : null}
        </PopoverContent>
      </Popover>

      {value.productId && (
        <Badge variant="secondary" className="absolute -top-2 -right-2 text-[10px] px-1 py-0">
          lié
        </Badge>
      )}

      {/* Global Product Dialog */}
      <AddProductDialog
        open={isGlobalDialogOpen}
        onOpenChange={handleGlobalDialogClose}
        initialName={pendingGlobalName}
        isGlobal
      />
    </div>
  );
};

export default IngredientProductSelect;
