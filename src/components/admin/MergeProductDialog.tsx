import { useState, useMemo } from 'react';
import { Loader2, AlertTriangle, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingProduct } from '@/hooks/useShoppingProducts';

interface MergeProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceProduct: ShoppingProduct | null;
  allProducts: ShoppingProduct[];
  onMerge: (sourceId: string, masterId: string) => Promise<void>;
  isMerging: boolean;
}

const MergeProductDialog = ({
  open,
  onOpenChange,
  sourceProduct,
  allProducts,
  onMerge,
  isMerging,
}: MergeProductDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaster, setSelectedMaster] = useState<ShoppingProduct | null>(null);
  const [showUnitWarning, setShowUnitWarning] = useState(false);

  // Filter out the source product and filter by search
  const availableProducts = useMemo(() => {
    if (!allProducts || !sourceProduct) return [];
    return allProducts
      .filter((p) => p.id !== sourceProduct.id)
      .filter((p) => 
        !searchQuery.trim() || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [allProducts, sourceProduct, searchQuery]);

  const handleSelectMaster = (product: ShoppingProduct) => {
    setSelectedMaster(product);
  };

  const handleConfirmMerge = () => {
    if (!sourceProduct || !selectedMaster) return;

    // Check if units are different
    const sourceUnit = sourceProduct.unit_id;
    const masterUnit = selectedMaster.unit_id;

    if (sourceUnit !== masterUnit) {
      setShowUnitWarning(true);
    } else {
      executeMerge();
    }
  };

  const executeMerge = async () => {
    if (!sourceProduct || !selectedMaster) return;
    await onMerge(sourceProduct.id, selectedMaster.id);
    setShowUnitWarning(false);
    setSelectedMaster(null);
    setSearchQuery('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedMaster(null);
    setSearchQuery('');
    setShowUnitWarning(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden z-[100]">
          <DialogHeader>
            <DialogTitle>Fusionner le produit</DialogTitle>
            <DialogDescription>
              Sélectionnez le produit "Master" qui remplacera{' '}
              <span className="font-semibold text-foreground">
                {sourceProduct?.name}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 min-h-0 overflow-hidden">
            {/* Source product info */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm text-muted-foreground mb-1">Produit à fusionner :</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{sourceProduct?.name}</span>
                {sourceProduct?.units && (
                  <Badge variant="secondary" className="text-xs">
                    {sourceProduct.units.abbreviation || sourceProduct.units.name}
                  </Badge>
                )}
                {sourceProduct?.aisles && (
                  <Badge variant="outline" className="text-xs">
                    {sourceProduct.aisles.icon} {sourceProduct.aisles.name}
                  </Badge>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher le produit Master..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Products list */}
            <ScrollArea className="h-[250px] border rounded-lg">
              <div className="p-2 space-y-1">
                {availableProducts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    Aucun produit trouvé
                  </p>
                ) : (
                  availableProducts.map((product) => (
                    <button
                      key={product.id}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedMaster?.id === product.id
                          ? 'bg-primary/10 border-primary border'
                          : 'hover:bg-muted border border-transparent'
                      }`}
                      onClick={() => handleSelectMaster(product)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{product.name}</span>
                        {product.units && (
                          <Badge variant="secondary" className="text-xs">
                            {product.units.abbreviation || product.units.name}
                          </Badge>
                        )}
                        {product.aisles && (
                          <Badge variant="outline" className="text-xs">
                            {product.aisles.icon} {product.aisles.name}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Selected master preview */}
            {selectedMaster && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Produit Master sélectionné :</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-primary">{selectedMaster.name}</span>
                  {selectedMaster.units && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedMaster.units.abbreviation || selectedMaster.units.name}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 pt-4 border-t bg-background">
            <Button variant="outline" onClick={handleClose} type="button">
              Annuler
            </Button>
            <Button
              onClick={handleConfirmMerge}
              disabled={!selectedMaster || isMerging}
              type="button"
            >
              {isMerging && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Fusionner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit warning dialog */}
      <AlertDialog open={showUnitWarning} onOpenChange={setShowUnitWarning}>
        <AlertDialogContent className="z-[110]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Unités différentes
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Les unités des deux produits sont différentes :
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>
                  <span className="font-medium">{sourceProduct?.name}</span> :{' '}
                  {sourceProduct?.units?.name || 'Aucune unité'}
                </li>
                <li>
                  <span className="font-medium">{selectedMaster?.name}</span> :{' '}
                  {selectedMaster?.units?.name || 'Aucune unité'}
                </li>
              </ul>
              <p className="pt-2">
                Voulez-vous quand même continuer la fusion ? Les quantités existantes 
                pourraient ne plus être cohérentes.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeMerge}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {isMerging && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Continuer la fusion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MergeProductDialog;
