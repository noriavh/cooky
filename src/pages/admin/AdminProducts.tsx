import { useState, useMemo } from 'react';
import { Package, Search, Globe, User, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAdminProducts, useAdminProfiles, useAdminFamilies, useAdminAisles, useAdminUnits, useAdminConvertToGlobal, useAdminUpdateProduct } from '@/hooks/useAdminData';
import { includesNormalized } from '@/lib/stringUtils';
import EditProductDialog from '@/components/admin/EditProductDialog';

const AdminProducts = () => {
  const { data: products, isLoading } = useAdminProducts();
  const { data: profiles } = useAdminProfiles();
  const { data: families } = useAdminFamilies();
  const { data: aisles } = useAdminAisles();
  const { data: units } = useAdminUnits();
  const convertToGlobal = useAdminConvertToGlobal();
  const updateProduct = useAdminUpdateProduct();

  const [searchName, setSearchName] = useState('');
  const [filterAisle, setFilterAisle] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');

  // Create lookup maps
  const profileMap = useMemo(() => {
    const map = new Map<string, string>();
    profiles?.forEach(p => map.set(p.id, p.username || 'Sans nom'));
    return map;
  }, [profiles]);

  const familyMap = useMemo(() => {
    const map = new Map<string, string>();
    families?.forEach(f => map.set(f.id, f.name));
    return map;
  }, [families]);

  // Helper to get product type
  const getProductType = (product: { user_id: string | null; family_id: string | null }) => {
    if (product.user_id === null && product.family_id === null) return 'global';
    if (product.family_id) return 'family';
    return 'local';
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products.filter(product => {
      const matchesName = includesNormalized(product.name, searchName);
      const matchesAisle = filterAisle === 'all' || product.aisle?.id === filterAisle;
      const matchesUnit = filterUnit === 'all' || product.unit?.id === filterUnit;
      
      const productType = getProductType(product);
      const matchesOwner =
        filterOwner === 'all' ||
        (filterOwner === 'global' && productType === 'global') ||
        (filterOwner === 'local' && (productType === 'local' || productType === 'family'));

      return matchesName && matchesAisle && matchesUnit && matchesOwner;
    });
  }, [products, searchName, filterAisle, filterUnit, filterOwner]);

  const getOwnerDisplay = (product: { user_id: string | null; family_id: string | null }) => {
    const type = getProductType(product);
    if (type === 'global') {
      return (
        <Badge variant="secondary" className="gap-1">
          <Globe className="h-3 w-3" /> Global
        </Badge>
      );
    }
    if (type === 'family' && product.family_id) {
      return (
        <Badge variant="outline" className="gap-1 border-primary/50 text-primary">
          <Users className="h-3 w-3" />
          {familyMap.get(product.family_id) || 'Famille'}
        </Badge>
      );
    }
    if (product.user_id) {
      return (
        <Badge variant="outline" className="gap-1">
          <User className="h-3 w-3" />
          {profileMap.get(product.user_id) || 'Utilisateur'}
        </Badge>
      );
    }
    return null;
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
        <Package className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Produits</h1>
          <p className="text-muted-foreground text-sm">
            {products?.length || 0} produits au total
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterOwner} onValueChange={setFilterOwner}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les produits</SelectItem>
                <SelectItem value="global">
                  <span className="flex items-center gap-2">
                    <Globe className="h-3 w-3" /> Produits globaux
                  </span>
                </SelectItem>
                <SelectItem value="local">
                  <span className="flex items-center gap-2">
                    <User className="h-3 w-3" /> Produits locaux
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterAisle} onValueChange={setFilterAisle}>
              <SelectTrigger>
                <SelectValue placeholder="Rayon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rayons</SelectItem>
                {aisles?.map((aisle) => (
                  <SelectItem key={aisle.id} value={aisle.id}>
                    {aisle.icon} {aisle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterUnit} onValueChange={setFilterUnit}>
              <SelectTrigger>
                <SelectValue placeholder="Unité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les unités</SelectItem>
                {units?.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.abbreviation || unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Rayon</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead>Propriétaire</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Aucun produit trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const isLocal = getProductType(product) !== 'global';
                  
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        {product.aisle ? (
                          <span>{product.aisle.icon} {product.aisle.name}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.unit?.abbreviation || product.unit?.name || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getOwnerDisplay(product)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <EditProductDialog
                            product={product}
                            aisles={aisles}
                            units={units}
                            onSave={(productId, data) => updateProduct.mutate({ productId, ...data })}
                            isPending={updateProduct.isPending}
                          />
                          {isLocal && (
                            <AlertDialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    >
                                      <Globe className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Convertir en global</TooltipContent>
                              </Tooltip>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Convertir en produit global ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Le produit "{product.name}" sera accessible à tous les utilisateurs.
                                    Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => convertToGlobal.mutate(product.id)}
                                    className="bg-green-600 text-white hover:bg-green-700"
                                    disabled={convertToGlobal.isPending}
                                  >
                                    {convertToGlobal.isPending ? 'Conversion...' : 'Convertir'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProducts;
