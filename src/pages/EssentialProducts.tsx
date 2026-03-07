import { useState, useMemo } from 'react';
import { Star, ArrowLeft, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  useEssentialProducts,
  EssentialProduct,
} from '@/hooks/useEssentialProducts';
import { useAislesWithOrder } from '@/hooks/useAisleOrders';
import AddEssentialProductDialog from '@/components/shopping/AddEssentialProductDialog';
import EssentialProductItem from '@/components/shopping/EssentialProductItem';

const EssentialProducts = () => {
  const { user, loading } = useAuth();
  const { data: essentials, isLoading } = useEssentialProducts();
  const { data: aislesWithOrder } = useAislesWithOrder();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Group essentials by aisle (same logic as ShoppingList)
  const groupedItems = useMemo(() => {
    if (!essentials) return {};

    const groups: Record<string, EssentialProduct[]> = {};
    const noAisle: EssentialProduct[] = [];

    essentials.forEach((item) => {
      if (item.shopping_products?.aisles) {
        const aisleName = item.shopping_products.aisles.name;
        if (!groups[aisleName]) {
          groups[aisleName] = [];
        }
        groups[aisleName].push(item);
      } else {
        noAisle.push(item);
      }
    });

    // Sort groups by custom aisle order if available
    const sortedGroups: Record<string, EssentialProduct[]> = {};

    // Get unique aisles
    const aisles = essentials
      .filter((item) => item.shopping_products?.aisles)
      .map((item) => item.shopping_products!.aisles!)
      .filter((aisle, index, self) => 
        index === self.findIndex((a) => a.id === aisle.id)
      );

    // Create a map of aisle ID to custom position
    const orderMap = new Map<string, number>();
    if (aislesWithOrder) {
      aislesWithOrder.forEach((aisle) => {
        orderMap.set(aisle.id, aisle.customPosition);
      });
    }

    // Sort aisles by custom position
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
  }, [essentials, aislesWithOrder]);

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const hasItems = (essentials?.length ?? 0) > 0;

  return (
    <div className="container max-w-2xl py-6 px-4 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/shopping">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Star className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">Mes essentiels</h1>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Sélectionnez les produits que vous achetez régulièrement pour les ajouter rapidement à votre liste de courses.
      </p>

      {/* Essentials List */}
      {!hasItems ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Aucun produit essentiel défini
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Ajoutez vos produits habituels pour les retrouver rapidement
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedItems).map(([aisleName, aisleItems]) => {
            const aisle = aisleItems[0]?.shopping_products?.aisles;
            return (
              <Card key={aisleName} className="overflow-hidden">
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    {aisle?.icon && <span>{aisle.icon}</span>}
                    {aisleName}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({aisleItems.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6 pb-2 sm:pb-4 space-y-1">
                  {aisleItems.map((item) => (
                    <EssentialProductItem key={item.id} item={item} />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      <AddEssentialProductDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  );
};

export default EssentialProducts;
