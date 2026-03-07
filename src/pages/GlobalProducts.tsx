import { useState, useMemo, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2, Search, GitMerge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/useUserRole';
import { includesNormalized } from '@/lib/stringUtils';
import { ShoppingProduct } from '@/hooks/useShoppingProducts';
import { useMergeProducts } from '@/hooks/useMergeProducts';
import { useCheckProductUsage, useDeleteGlobalProductWithConversion, ProductUsageInfo } from '@/hooks/useDeleteGlobalProduct';
import MergeProductDialog from '@/components/admin/MergeProductDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/alert-dialog';
import { useShoppingProducts, useDeleteShoppingProduct } from '@/hooks/useShoppingProducts';
import { usePendingGlobalRequests, useApproveGlobalRequest, useRejectGlobalRequest } from '@/hooks/useProductGlobalRequests';
import { useAisles } from '@/hooks/useShoppingList';
import { useUnits } from '@/hooks/useRecipes';
import AddProductDialog from '@/components/shopping/AddProductDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';

const GlobalProducts = () => {
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { data: products, isLoading } = useShoppingProducts();
  const { data: pendingRequests, isLoading: requestsLoading } = usePendingGlobalRequests();
  const { data: aisles } = useAisles();
  const { data: units } = useUnits();
  const deleteProduct = useDeleteShoppingProduct();
  const checkProductUsage = useCheckProductUsage();
  const deleteWithConversion = useDeleteGlobalProductWithConversion();
  const approveRequest = useApproveGlobalRequest();
  const rejectRequest = useRejectGlobalRequest();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Redirect non-admins to home page
  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, isAdminLoading, navigate]);

  const mergeProducts = useMergeProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAisle, setFilterAisle] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteWithConversionInfo, setDeleteWithConversionInfo] = useState<{
    productId: string;
    productData: { name: string; aisle_id: string | null; unit_id: string | null };
    usageInfo: ProductUsageInfo;
  } | null>(null);
  const [mergeSourceProduct, setMergeSourceProduct] = useState<ShoppingProduct | null>(null);

  // Only global products (user_id = null and family_id = null)
  const globalProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => p.user_id === null && p.family_id === null);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!globalProducts) return [];
    return globalProducts.filter((product) => {
      const matchesSearch = !searchQuery.trim() || 
        includesNormalized(product.name, searchQuery);
      const matchesAisle = filterAisle === 'all' || product.aisle_id === filterAisle;
      return matchesSearch && matchesAisle;
    });
  }, [globalProducts, searchQuery, filterAisle]);

  const handleDeleteClick = async (product: ShoppingProduct) => {
    try {
      const usageInfo = await checkProductUsage.mutateAsync(product.id);
      
      if (usageInfo.isUsed) {
        // Product is used in recipes, show conversion dialog
        setDeleteWithConversionInfo({
          productId: product.id,
          productData: {
            name: product.name,
            aisle_id: product.aisle_id,
            unit_id: product.unit_id,
          },
          usageInfo,
        });
      } else {
        // Product not used, show simple delete confirmation
        setDeleteConfirmId(product.id);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de vérifier l'utilisation du produit",
        variant: "destructive",
      });
    }
  };

  const handleSimpleDelete = async (id: string) => {
    try {
      await deleteProduct.mutateAsync(id);
      setDeleteConfirmId(null);
      toast({
        title: "Produit supprimé",
        description: "Le produit a été supprimé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le produit",
        variant: "destructive",
      });
    }
  };

  const handleDeleteWithConversion = async () => {
    if (!deleteWithConversionInfo) return;
    
    try {
      await deleteWithConversion.mutateAsync({
        productId: deleteWithConversionInfo.productId,
        productData: deleteWithConversionInfo.productData,
        affectedRecipes: deleteWithConversionInfo.usageInfo.affectedRecipes,
      });
      setDeleteWithConversionInfo(null);
      toast({
        title: "Produit supprimé",
        description: "Le produit global a été converti en produits locaux pour les utilisateurs concernés",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer et convertir le produit",
        variant: "destructive",
      });
    }
  };

  const handleApprove = async (request: typeof pendingRequests extends (infer T)[] | undefined ? T : never) => {
    if (!request) return;
    await approveRequest.mutateAsync(request as any);
  };

  const handleReject = async (requestId: string) => {
    await rejectRequest.mutateAsync(requestId);
  };

  const handleMerge = async (sourceId: string, masterId: string) => {
    await mergeProducts.mutateAsync({ sourceId, masterId });
  };

  // Show loading while checking admin status or loading data
  if (isAdminLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render anything if not admin (will redirect)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">Produits Globaux</h1>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} size={isMobile ? 'sm' : 'default'} className="shrink-0">
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Ajouter</span>
        </Button>
      </div>

      {/* Pending Requests Section */}
      {pendingRequests && pendingRequests.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-500/20 text-amber-600 border-amber-500/50">
                {pendingRequests.length}
              </Badge>
              Demandes en attente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-background rounded-lg border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{request.product?.name}</p>
                    {request.product?.units && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {request.product.units.abbreviation || request.product.units.name}
                      </Badge>
                    )}
                    {request.product?.aisles && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {request.product.aisles.icon} {request.product.aisles.name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    Demandé par {request.requester_profile?.username || 'Utilisateur'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleApprove(request)}
                    disabled={approveRequest.isPending}
                  >
                    <Check className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Accepter</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleReject(request.id)}
                    disabled={rejectRequest.isPending}
                  >
                    <X className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Refuser</span>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterAisle} onValueChange={setFilterAisle}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les rayons" />
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
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      {isMobile ? (
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <Card key={product.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {product.aisles && (
                        <Badge variant="outline" className="text-xs">
                          {product.aisles.icon} {product.aisles.name}
                        </Badge>
                      )}
                      {product.units && (
                        <Badge variant="secondary" className="text-xs">
                          {product.units.abbreviation || product.units.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setMergeSourceProduct(product)}
                      title="Fusionner"
                    >
                      <GitMerge className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingProduct(product.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDeleteClick(product)}
                      disabled={checkProductUsage.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredProducts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Aucun produit global trouvé
              </p>
              {searchQuery.trim() && (
                <Button
                  className="mt-4"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer "{searchQuery.trim()}"
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Rayon</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead className="w-[130px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    {product.aisles ? (
                      <Badge variant="outline">
                        {product.aisles.icon} {product.aisles.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.units ? (
                      <Badge variant="secondary">
                        {product.units.abbreviation || product.units.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setMergeSourceProduct(product)}
                        title="Fusionner"
                      >
                        <GitMerge className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingProduct(product.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteClick(product)}
                        disabled={checkProductUsage.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <p className="text-muted-foreground">
                      Aucun produit global trouvé
                    </p>
                    {searchQuery.trim() && (
                      <Button
                        className="mt-4"
                        onClick={() => setIsAddDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Créer "{searchQuery.trim()}"
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Dialog */}
      <AddProductDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setSearchQuery('');
        }}
        isGlobal={true}
        initialName={searchQuery.trim()}
      />

      {/* Edit Dialog */}
      {editingProduct && (
        <AddProductDialog
          open={true}
          onOpenChange={(open) => !open && setEditingProduct(null)}
          productId={editingProduct}
          isGlobal={true}
        />
      )}

      {/* Simple Delete Confirmation (product not used in recipes) */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le produit sera supprimé de la base globale.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleSimpleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete with Conversion Confirmation (product used in recipes) */}
      <AlertDialog open={!!deleteWithConversionInfo} onOpenChange={() => setDeleteWithConversionInfo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Produit utilisé dans des recettes</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Ce produit fait partie de <strong>{deleteWithConversionInfo?.usageInfo.usageCount}</strong> recette(s) en base de données.
              </p>
              <p>
                Voulez-vous le supprimer de la base globale ? Il sera converti en produit local pour tous les utilisateurs ou familles ayant des recettes avec ce produit.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWithConversion}
              disabled={deleteWithConversion.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteWithConversion.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Conversion...
                </>
              ) : (
                'Supprimer et convertir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Merge Dialog */}
      <MergeProductDialog
        open={!!mergeSourceProduct}
        onOpenChange={(open) => !open && setMergeSourceProduct(null)}
        sourceProduct={mergeSourceProduct}
        allProducts={globalProducts}
        onMerge={handleMerge}
        isMerging={mergeProducts.isPending}
      />
    </div>
  );
};

export default GlobalProducts;
