import { useState, useMemo } from 'react';
import { Package, Search, Plus, Trash2, Globe, User, Users, Send } from 'lucide-react';
import { includesNormalized } from '@/lib/stringUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';
import {
  useShoppingProducts,
  useUpdateShoppingProduct,
  useDeleteShoppingProduct,
} from '@/hooks/useShoppingProducts';
import { useAisles } from '@/hooks/useShoppingList';
import { useUnits } from '@/hooks/useRecipes';
import { useAuth } from '@/contexts/AuthContext';
import { useUserFamily } from '@/hooks/useFamilies';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsAdmin } from '@/hooks/useUserRole';
import { useMyGlobalRequests, useRequestProductGlobal, useCancelGlobalRequest, useConvertToGlobal } from '@/hooks/useProductGlobalRequests';
import AddProductDialog from '@/components/shopping/AddProductDialog';

const ShoppingProducts = () => {
  const { user } = useAuth();
  const { data: family } = useUserFamily();
  const isMobile = useIsMobile();
  const { data: products, isLoading } = useShoppingProducts();
  const { data: aisles } = useAisles();
  const { data: units } = useUnits();
  const updateProduct = useUpdateShoppingProduct();
  const deleteProduct = useDeleteShoppingProduct();
  const { isAdmin } = useIsAdmin();
  const { data: myRequests } = useMyGlobalRequests();
  const requestGlobal = useRequestProductGlobal();
  const cancelRequest = useCancelGlobalRequest();
  const convertToGlobal = useConvertToGlobal();

  const [searchName, setSearchName] = useState('');
  const [filterAisle, setFilterAisle] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddGlobalDialogOpen, setIsAddGlobalDialogOpen] = useState(false);

  // Helper to check if product is editable (belongs to current user or family)
  const isEditable = (product: { user_id: string | null; family_id: string | null }) => {
    if (product.user_id === user?.id) return true;
    if (family && product.family_id === family.id) return true;
    return false;
  };

  // Helper to check product type
  const getProductType = (product: { user_id: string | null; family_id: string | null }) => {
    if (product.user_id === null && product.family_id === null) return 'global';
    if (family && product.family_id === family.id) return 'family';
    if (product.user_id === user?.id) return 'local';
    return 'other';
  };

  // Check if product has pending request
  const hasPendingRequest = (productId: string) => {
    return myRequests?.some(r => r.product_id === productId && r.status === 'pending');
  };

  const getRequestForProduct = (productId: string) => {
    return myRequests?.find(r => r.product_id === productId && r.status === 'pending');
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products.filter((product) => {
      const matchesName = includesNormalized(product.name, searchName);
      const matchesAisle = filterAisle === 'all' || product.aisle_id === filterAisle;
      const matchesUnit = filterUnit === 'all' || product.unit_id === filterUnit;
      
      const productType = getProductType(product);
      const matchesOwner =
        filterOwner === 'all' ||
        (filterOwner === 'global' && productType === 'global') ||
        (filterOwner === 'local' && (productType === 'local' || productType === 'family'));

      return matchesName && matchesAisle && matchesUnit && matchesOwner;
    });
  }, [products, searchName, filterAisle, filterUnit, filterOwner, user?.id, family?.id]);

  const handleUpdateName = async (id: string, name: string) => {
    try {
      await updateProduct.mutateAsync({ id, name });
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Un produit avec ce nom existe déjà');
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    }
  };

  const handleUpdateAisle = async (id: string, aisle_id: string) => {
    try {
      await updateProduct.mutateAsync({
        id,
        aisle_id: aisle_id === 'none' ? null : aisle_id,
      });
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleUpdateUnit = async (id: string, unit_id: string) => {
    try {
      await updateProduct.mutateAsync({
        id,
        unit_id: unit_id === 'none' ? null : unit_id,
      });
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct.mutateAsync(id);
      toast.success('Produit supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const renderProductBadge = (product: { user_id: string | null; family_id: string | null }) => {
    const type = getProductType(product);
    if (type === 'global') {
      return (
        <Badge variant="secondary" className="gap-1">
          <Globe className="h-3 w-3" /> Global
        </Badge>
      );
    }
    if (type === 'family') {
      return (
        <Badge variant="outline" className="gap-1 border-primary/50 text-primary">
          <Users className="h-3 w-3" /> Famille
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <User className="h-3 w-3" /> Perso
      </Badge>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Package className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold truncate">Produits courses</h1>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} size={isMobile ? 'sm' : 'default'}>
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Nouveau produit</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search + Owner filter on first row */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
                <SelectValue placeholder="Tous" />
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
                    <User className="h-3 w-3" /> {family ? 'Mes produits / Famille' : 'Mes produits'}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Aisle + Unit filter on second row */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
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

      {/* Products */}
      <Card>
        <CardContent className="p-0">
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {products?.length === 0
                  ? 'Aucun produit enregistré'
                  : 'Aucun produit ne correspond à votre recherche'}
              </p>
              {searchName.trim() && filteredProducts.length === 0 && (
                <div className="mt-4 flex flex-col gap-2 items-center">
                  <Button
                    onClick={() => setIsAddDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer "{searchName.trim()}"
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      onClick={() => setIsAddGlobalDialogOpen(true)}
                      className="gap-2"
                    >
                      <Globe className="h-4 w-4" />
                      Créer un produit global
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : isMobile ? (
            // Mobile: Card list view
            <div className="divide-y">
              {filteredProducts.map((product) => {
                const canEdit = isEditable(product);

                return (
                  <div key={product.id} className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {canEdit ? (
                          <Input
                            defaultValue={product.name}
                            onBlur={(e) => {
                              if (e.target.value !== product.name) {
                                handleUpdateName(product.id, e.target.value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            className="border-0 bg-transparent p-0 h-auto focus-visible:ring-1 font-medium"
                          />
                        ) : (
                          <span className="font-medium">{product.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {renderProductBadge(product)}
                        {/* Show "Convert to global" for admin OR "Propose global" for non-admin */}
                        {canEdit && getProductType(product) !== 'global' && (
                          isAdmin ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  aria-label="Convertir en global"
                                >
                                  <Globe className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Convertir en produit global ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Le produit "{product.name}" sera accessible à tous les utilisateurs.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => convertToGlobal.mutate({
                                      id: product.id,
                                      name: product.name,
                                      unit_id: product.unit_id,
                                      aisle_id: product.aisle_id,
                                    })}
                                    className="bg-green-600 text-white hover:bg-green-700"
                                  >
                                    Convertir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : hasPendingRequest(product.id) ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-amber-500"
                                  onClick={() => {
                                    const request = getRequestForProduct(product.id);
                                    if (request) cancelRequest.mutate(request.id);
                                  }}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Annuler la demande</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                                  onClick={() => requestGlobal.mutate(product.id)}
                                  disabled={requestGlobal.isPending}
                                >
                                  <Globe className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Proposer en global</TooltipContent>
                            </Tooltip>
                          )
                        )}
                        {canEdit && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer le produit ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Le produit "{product.name}" sera supprimé de votre base de données.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(product.id)}>
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                    
                    {canEdit ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={product.aisle_id ?? 'none'}
                          onValueChange={(value) => handleUpdateAisle(product.id, value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Rayon" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Aucun rayon</SelectItem>
                            {aisles?.map((aisle) => (
                              <SelectItem key={aisle.id} value={aisle.id}>
                                {aisle.icon} {aisle.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={product.unit_id ?? 'none'}
                          onValueChange={(value) => handleUpdateUnit(product.id, value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Unité" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Aucune unité</SelectItem>
                            {units?.map((unit) => (
                              <SelectItem key={unit.id} value={unit.id}>
                                {unit.abbreviation || unit.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          {product.aisles ? `${product.aisles.icon} ${product.aisles.name}` : 'Pas de rayon'}
                        </span>
                        <span>•</span>
                        <span>
                          {product.units?.abbreviation || product.units?.name || 'Pas d\'unité'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // Desktop: Table view
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead className="w-48">Rayon</TableHead>
                  <TableHead className="w-32">Unité</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const canEdit = isEditable(product);

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        {canEdit ? (
                          <Input
                            defaultValue={product.name}
                            onBlur={(e) => {
                              if (e.target.value !== product.name) {
                                handleUpdateName(product.id, e.target.value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur();
                              }
                            }}
                            className="border-0 bg-transparent p-0 h-auto focus-visible:ring-1"
                          />
                        ) : (
                          <span className="text-sm">{product.name}</span>
                        )}
                      </TableCell>
                      <TableCell>{renderProductBadge(product)}</TableCell>
                      <TableCell>
                        {canEdit ? (
                          <Select
                            value={product.aisle_id ?? 'none'}
                            onValueChange={(value) => handleUpdateAisle(product.id, value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Aucun" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Aucun</SelectItem>
                              {aisles?.map((aisle) => (
                                <SelectItem key={aisle.id} value={aisle.id}>
                                  {aisle.icon} {aisle.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {product.aisles ? `${product.aisles.icon} ${product.aisles.name}` : '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {canEdit ? (
                          <Select
                            value={product.unit_id ?? 'none'}
                            onValueChange={(value) => handleUpdateUnit(product.id, value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">-</SelectItem>
                              {units?.map((unit) => (
                                <SelectItem key={unit.id} value={unit.id}>
                                  {unit.abbreviation || unit.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {product.units?.abbreviation || product.units?.name || '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {/* Convert to global for admin OR Propose global for non-admin */}
                          {canEdit && getProductType(product) !== 'global' && (
                            isAdmin ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    aria-label="Convertir en global"
                                  >
                                    <Globe className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Convertir en produit global ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Le produit "{product.name}" sera accessible à tous les utilisateurs.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => convertToGlobal.mutate({
                                        id: product.id,
                                        name: product.name,
                                        unit_id: product.unit_id,
                                        aisle_id: product.aisle_id,
                                      })}
                                      className="bg-green-600 text-white hover:bg-green-700"
                                    >
                                      Convertir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : hasPendingRequest(product.id) ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-amber-500"
                                    onClick={() => {
                                      const request = getRequestForProduct(product.id);
                                      if (request) cancelRequest.mutate(request.id);
                                    }}
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Annuler la demande</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                    onClick={() => requestGlobal.mutate(product.id)}
                                  >
                                    <Globe className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Proposer en global</TooltipContent>
                              </Tooltip>
                            )
                          )}
                          {canEdit && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer le produit ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Le produit "{product.name}" sera supprimé.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(product.id)}>
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs sm:text-sm text-muted-foreground text-center">
        {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} 
        {products && filteredProducts.length !== products.length && ` sur ${products.length}`}
      </p>

      {/* Add Product Dialog */}
      <AddProductDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setSearchName('');
        }}
        initialName={searchName.trim()}
      />

      {/* Add Global Product Dialog (admin only) */}
      <AddProductDialog
        open={isAddGlobalDialogOpen}
        onOpenChange={(open) => {
          setIsAddGlobalDialogOpen(open);
          if (!open) setSearchName('');
        }}
        initialName={searchName.trim()}
        isGlobal
      />
    </div>
  );
};

export default ShoppingProducts;