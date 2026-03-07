import { useMemo, useState } from 'react';
import { Trash2, ShoppingCart, ListX, Pencil, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  useShoppingList,
  useClearCheckedItems,
  useClearAllItems,
} from '@/hooks/useShoppingList';
import { useAislesWithOrder } from '@/hooks/useAisleOrders';
import ShoppingListItem from '@/components/shopping/ShoppingListItem';
import QuickAddProduct from '@/components/shopping/QuickAddProduct';
import AddEssentialsToListButton from '@/components/shopping/AddEssentialsToListButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const ShoppingList = () => {
  const isMobile = useIsMobile();
  const [isShoppingMode, setIsShoppingMode] = useState(() => {
    const saved = localStorage.getItem('shopping-mode');
    return saved === 'true';
  });

  const toggleShoppingMode = () => {
    setIsShoppingMode(prev => {
      const next = !prev;
      localStorage.setItem('shopping-mode', String(next));
      return next;
    });
  };
  const { data: items, isLoading } = useShoppingList();
  const { data: aislesWithOrder } = useAislesWithOrder();
  const clearChecked = useClearCheckedItems();
  const clearAll = useClearAllItems();
  // Group items by aisle with custom order
  const groupedItems = useMemo(() => {
    if (!items) return {};

    const groups: Record<string, typeof items> = {};
    const noAisle: typeof items = [];

    items.forEach((item) => {
      if (item.aisles) {
        const aisleName = item.aisles.name;
        if (!groups[aisleName]) {
          groups[aisleName] = [];
        }
        groups[aisleName].push(item);
      } else {
        noAisle.push(item);
      }
    });

    // Sort groups by custom aisle order if available
    const sortedGroups: Record<string, typeof items> = {};
    
    // Get unique aisles from items
    const aisles = items
      .filter((item) => item.aisles)
      .map((item) => item.aisles!)
      .filter((aisle, index, self) => 
        index === self.findIndex((a) => a.id === aisle.id)
      );

    // Create a map of aisle ID to custom position
    const orderMap = new Map<string, number>();
    if (aislesWithOrder) {
      aislesWithOrder.forEach((aisle, index) => {
        orderMap.set(aisle.id, aisle.customPosition);
      });
    }

    // Sort aisles by custom position (fallback to default position)
    aisles.sort((a, b) => {
      const posA = orderMap.has(a.id) ? orderMap.get(a.id)! : a.position;
      const posB = orderMap.has(b.id) ? orderMap.get(b.id)! : b.position;
      return posA - posB;
    });

    aisles.forEach((aisle) => {
      if (groups[aisle.name]) {
        sortedGroups[aisle.name] = groups[aisle.name];
      }
    });

    if (noAisle.length > 0) {
      sortedGroups['Autres'] = noAisle;
    }

    return sortedGroups;
  }, [items, aislesWithOrder]);

  const hasCheckedItems = items?.some((item) => item.checked) ?? false;
  const hasItems = (items?.length ?? 0) > 0;

  const handleClearChecked = async () => {
    try {
      await clearChecked.mutateAsync();
      toast.success('Éléments cochés supprimés');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAll.mutateAsync();
      toast.success('Liste vidée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-6 px-4 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">Liste de courses</h1>
        </div>
        <div className="flex gap-2">
          {/* Mode toggle - only on mobile */}
          {isMobile && (
            <Button
              variant={isShoppingMode ? "default" : "outline"}
              size="sm"
              onClick={toggleShoppingMode}
              title={isShoppingMode ? "Mode édition" : "Mode courses"}
              className={cn(
                "transition-all",
                isShoppingMode && "bg-primary text-primary-foreground"
              )}
            >
              {isShoppingMode ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <ShoppingBag className="h-4 w-4" />
              )}
            </Button>
          )}
          <AddEssentialsToListButton isMobile={isMobile} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearChecked}
            disabled={!hasCheckedItems || clearChecked.isPending}
            title="Supprimer cochés"
          >
            <Trash2 className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Supprimer cochés</span>}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" title="Vider la liste" disabled={!hasItems}>
                {isMobile ? <ListX className="h-4 w-4" /> : 'Vider la liste'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Vider la liste ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tous les éléments seront supprimés. Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll}>
                  Vider
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Quick Add with Search */}
      <QuickAddProduct />

      {/* Shopping List */}
      {!hasItems ? (
        <div className="py-12 text-center">
          <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Votre liste de courses est vide
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Recherchez un produit ou ajoutez-en un nouveau
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(groupedItems).map(([aisleName, aisleItems]) => {
            const aisle = aisleItems[0]?.aisles;
            return (
              <div key={aisleName}>
                <CardHeader className="pb-1 px-0 pt-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    {aisle?.icon && <span>{aisle.icon}</span>}
                    {aisleName}
                    <span className="text-xs font-normal">
                      ({aisleItems.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0 space-y-0">
                  {aisleItems.map((item) => (
                    <ShoppingListItem key={item.id} item={item} shoppingMode={isShoppingMode} />
                  ))}
                </CardContent>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default ShoppingList;
