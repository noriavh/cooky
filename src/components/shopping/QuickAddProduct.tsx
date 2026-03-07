import { useState, useRef, useEffect } from 'react';
import { Search, Plus, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSearchShoppingProducts, type ShoppingProduct } from '@/hooks/useShoppingProducts';
import { useAddShoppingListItem } from '@/hooks/useShoppingList';
import { useIsAdmin } from '@/hooks/useUserRole';
import AddProductDialog from './AddProductDialog';

interface QuickAddProductProps {
  className?: string;
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

const QuickAddProduct = ({ className }: QuickAddProductProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLocalDialogOpen, setIsLocalDialogOpen] = useState(false);
  const [isGlobalDialogOpen, setIsGlobalDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { isAdmin } = useIsAdmin();

  // Debounce the search term to avoid too many queries
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data: products = [], isLoading } = useSearchShoppingProducts(debouncedSearchTerm);
  const addItem = useAddShoppingListItem();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selection when products change
  useEffect(() => {
    setSelectedIndex(0);
  }, [products]);

  const handleAddProduct = async (product: ShoppingProduct) => {
    try {
      await addItem.mutateAsync({
        name: product.name,
        quantity: 1,
        unit_id: product.unit_id,
        aisle_id: product.aisle_id,
        product_id: product.id,
      });
      toast.success(`${product.name} ajouté à la liste`);
      setSearchTerm('');
      setIsOpen(false);
      inputRef.current?.focus();
    } catch (error) {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleOpenLocalDialog = () => {
    setIsOpen(false);
    setIsLocalDialogOpen(true);
  };

  const handleOpenGlobalDialog = () => {
    setIsOpen(false);
    setIsGlobalDialogOpen(true);
  };

  const handleProductCreated = async (product: { id: string; name: string; aisle_id: string | null; unit_id: string | null }) => {
    try {
      await addItem.mutateAsync({
        name: product.name,
        quantity: 1,
        unit_id: product.unit_id,
        aisle_id: product.aisle_id,
        product_id: product.id,
      });
      toast.success(`${product.name} ajouté à la liste`);
    } catch (error) {
      toast.error("Erreur lors de l'ajout à la liste");
    }
  };

  // Calculate total options count for keyboard navigation
  const createOptionsCount = isAdmin ? 2 : 1;
  const totalOptions = products.length + createOptionsCount;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || !searchTerm.trim()) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalOptions);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex < products.length) {
          // It's a product
          if (products[selectedIndex]) {
            handleAddProduct(products[selectedIndex]);
          }
        } else if (selectedIndex === products.length) {
          // First create option (local)
          handleOpenLocalDialog();
        } else if (selectedIndex === products.length + 1 && isAdmin) {
          // Second create option (global - admin only)
          handleOpenGlobalDialog();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsLocalDialogOpen(false);
      setIsGlobalDialogOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <>
      <div ref={containerRef} className={cn("relative", className)}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(e.target.value.length > 0);
            }}
            onFocus={() => setIsOpen(searchTerm.length > 0)}
            onBlur={(e) => {
              // If focus moves to an element inside the dropdown, keep the focus on the input
              const next = e.relatedTarget as HTMLElement | null;
              if (next && containerRef.current?.contains(next)) {
                requestAnimationFrame(() => inputRef.current?.focus());
              }
            }}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>

        {/* Dropdown results */}
        {isOpen && searchTerm.trim() && (
          <Card className="absolute z-50 w-full mt-1 p-1 shadow-lg max-h-64 overflow-auto">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Recherche...
              </div>
            ) : (
              <>
                {/* Existing products */}
                {products.map((product, index) => (
                  <button
                    key={product.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleAddProduct(product)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors',
                      index === selectedIndex
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {product.aisles?.icon && (
                        <span className="text-base">{product.aisles.icon}</span>
                      )}
                      <span>{product.name}</span>
                    </div>
                    {product.units && (
                      <span className="text-muted-foreground text-xs">
                        {product.units.abbreviation || product.units.name}
                      </span>
                    )}
                  </button>
                ))}

                {/* Separator if products exist */}
                {products.length > 0 && (
                  <div className="border-t my-1" />
                )}

                {/* Create local product option */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleOpenLocalDialog}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                    selectedIndex === products.length
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  <Plus className="h-4 w-4" />
                  <span>Créer "{searchTerm}"</span>
                </button>

                {/* Create global product option (admin only) */}
                {isAdmin && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleOpenGlobalDialog}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-primary',
                      selectedIndex === products.length + 1
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    <Globe className="h-4 w-4" />
                    <span>Créer produit global "{searchTerm}"</span>
                  </button>
                )}
              </>
            )}
          </Card>
        )}
      </div>

      {/* Local product dialog */}
      <AddProductDialog
        open={isLocalDialogOpen}
        onOpenChange={handleDialogClose}
        initialName={searchTerm}
        isGlobal={false}
        onProductCreated={handleProductCreated}
      />

      {/* Global product dialog (admin) */}
      <AddProductDialog
        open={isGlobalDialogOpen}
        onOpenChange={handleDialogClose}
        initialName={searchTerm}
        isGlobal={true}
        onProductCreated={handleProductCreated}
      />
    </>
  );
};

export default QuickAddProduct;
