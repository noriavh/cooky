import { useState } from 'react';
import { Search, Plus, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useShoppingProducts, ShoppingProduct } from '@/hooks/useShoppingProducts';
import { useAddEssentialProduct, useEssentialProducts } from '@/hooks/useEssentialProducts';
import { toast } from 'sonner';
import { includesNormalized } from '@/lib/stringUtils';

interface AddEssentialProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddEssentialProductDialog = ({ open, onOpenChange }: AddEssentialProductDialogProps) => {
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ShoppingProduct | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const { data: products = [] } = useShoppingProducts();
  const { data: existingEssentials = [] } = useEssentialProducts();
  const addEssential = useAddEssentialProduct();

  // Get IDs of products already in essentials
  const existingProductIds = new Set(existingEssentials.map((e) => e.product_id));

  // Filter products by search
  const filteredProducts = products.filter(
    (product) =>
      includesNormalized(product.name, search) &&
      !existingProductIds.has(product.id)
  );

  const handleSelectProduct = (product: ShoppingProduct) => {
    setSelectedProduct(product);
    setQuantity('');
  };

  const handleAdd = async () => {
    if (!selectedProduct) return;

    try {
      await addEssential.mutateAsync({
        product_id: selectedProduct.id,
        quantity: quantity ? parseFloat(quantity) : undefined,
        unit_id: selectedProduct.unit_id || undefined,
      });
      toast.success('Produit ajouté aux essentiels');
      setSelectedProduct(null);
      setQuantity('');
    } catch (error) {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedProduct(null);
      setQuantity('');
      setSearch('');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {selectedProduct ? 'Définir la quantité' : 'Ajouter un produit essentiel'}
          </DialogTitle>
        </DialogHeader>

        {selectedProduct ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              {selectedProduct.aisles?.icon && (
                <span className="text-lg">{selectedProduct.aisles.icon}</span>
              )}
              <span className="font-medium">{selectedProduct.name}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-1 block">
                  Quantité par défaut (optionnel)
                </label>
                <Input
                  type="number"
                  placeholder="Ex: 2"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="0"
                  step="0.1"
                />
              </div>
              {selectedProduct.units && (
                <div className="pt-5">
                  <span className="text-muted-foreground">
                    {selectedProduct.units.abbreviation || selectedProduct.units.name}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                Retour
              </Button>
              <Button onClick={handleAdd} disabled={addEssential.isPending}>
                <Check className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-[300px] pr-4">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {search ? 'Aucun produit trouvé' : 'Aucun produit disponible'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between py-2 px-2 hover:bg-muted/50 rounded-md cursor-pointer"
                      onClick={() => handleSelectProduct(product)}
                    >
                      <div className="flex items-center gap-2">
                        {product.aisles?.icon && (
                          <span className="text-sm">{product.aisles.icon}</span>
                        )}
                        <span>{product.name}</span>
                        {product.units && (
                          <span className="text-xs text-muted-foreground">
                            ({product.units.abbreviation || product.units.name})
                          </span>
                        )}
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddEssentialProductDialog;
