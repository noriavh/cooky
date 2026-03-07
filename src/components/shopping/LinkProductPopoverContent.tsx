import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { ShoppingProduct } from '@/hooks/useShoppingProducts';

interface LinkProductPopoverContentProps {
  inputRef: React.RefObject<HTMLInputElement>;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onClearSearch: () => void;
  isSearching: boolean;
  searchResults?: ShoppingProduct[];
  onSelectProduct: (product: ShoppingProduct) => void;
}

export function LinkProductPopoverContent({
  inputRef,
  searchTerm,
  onSearchTermChange,
  onClearSearch,
  isSearching,
  searchResults,
  onSelectProduct,
}: LinkProductPopoverContentProps) {
  return (
    <PopoverContent className="w-64 p-2" align="end">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Associer un produit</span>
        </div>

        <div className="relative">
          <Input
            ref={inputRef}
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="pr-8 h-8"
          />
          {searchTerm && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onClearSearch}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {searchTerm.length > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-1">
            {isSearching ? (
              <p className="text-sm text-muted-foreground p-2 text-center">Recherche...</p>
            ) : searchResults && searchResults.length > 0 ? (
              searchResults.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelectProduct(product)}
                  className={cn('w-full text-left p-2 rounded-md hover:bg-accent transition-colors')}
                >
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.aisles?.icon} {product.aisles?.name ?? 'Aucun rayon'}
                    {product.units && ` • ${product.units.abbreviation || product.units.name}`}
                  </p>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground p-2 text-center">Aucun produit trouvé</p>
            )}
          </div>
        )}

        {searchTerm.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">Tapez pour rechercher un produit</p>
        )}
      </div>
    </PopoverContent>
  );
}
