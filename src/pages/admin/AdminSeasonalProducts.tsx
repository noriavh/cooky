import { useState, useMemo } from 'react';
import { Leaf, Search, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAdminSeasonalProducts, useAdminUpdateProductSeasons } from '@/hooks/useAdminData';
import { includesNormalized } from '@/lib/stringUtils';
import EditSeasonDialog from '@/components/admin/EditSeasonDialog';

const MONTH_NAMES = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
];

const AdminSeasonalProducts = () => {
  const { data: products, isLoading } = useAdminSeasonalProducts();
  const updateSeasons = useAdminUpdateProductSeasons();
  const [searchName, setSearchName] = useState('');
  const [editingProduct, setEditingProduct] = useState<{
    id: string;
    name: string;
    months: number[];
  } | null>(null);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchName.trim()) return products;
    return products.filter(p => includesNormalized(p.name, searchName));
  }, [products, searchName]);

  const getMonthBadges = (months: number[]) => {
    if (months.length === 0) {
      return <span className="text-muted-foreground text-sm">Aucun mois sélectionné</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {months.sort((a, b) => a - b).map(month => (
          <Badge key={month} variant="secondary" className="text-xs">
            {MONTH_NAMES[month - 1]}
          </Badge>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Leaf className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Produits de saison</h1>
          <p className="text-muted-foreground text-sm">
            {products?.length || 0} fruits et légumes
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recherche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Produit</TableHead>
                <TableHead>Mois de saison</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                    Aucun produit trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const months = product.product_seasons?.map((s: { month: number }) => s.month) || [];
                  
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.aisle?.icon} {product.name}
                      </TableCell>
                      <TableCell>{getMonthBadges(months)}</TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingProduct({
                                id: product.id,
                                name: product.name,
                                months
                              })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Modifier les mois</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditSeasonDialog
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onSave={(productId, months) => {
          updateSeasons.mutate({ productId, months }, {
            onSuccess: () => setEditingProduct(null)
          });
        }}
        isPending={updateSeasons.isPending}
      />
    </div>
  );
};

export default AdminSeasonalProducts;
