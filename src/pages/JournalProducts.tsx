import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useJournalProductStats } from '@/hooks/useJournalHistory';
import { productStatus, ProductStatus, PRODUCT_STATUS_LABELS, SCORE_COLORS } from '@/lib/journal';
import { cn } from '@/lib/utils';

const STATUS_ORDER: Record<ProductStatus, number> = {
  red: 0,
  orange: 1,
  green: 2,
  unscored: 3,
};

const STATUS_BADGE_CLASSES: Record<ProductStatus, string> = {
  red: 'bg-red-500/15 text-red-700 dark:text-red-400',
  orange: 'bg-orange-400/15 text-orange-700 dark:text-orange-400',
  green: 'bg-green-500/15 text-green-700 dark:text-green-400',
  unscored: 'bg-muted text-muted-foreground',
};

const JournalProducts = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: stats = [], isLoading } = useJournalProductStats();

  const products = useMemo(() => {
    const term = search.toLowerCase().trim();
    return stats
      .filter((s) => !term || s.productName.toLowerCase().includes(term))
      .map((s) => ({ ...s, status: productStatus(s) }))
      .sort(
        (a, b) =>
          STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
          a.productName.localeCompare(b.productName, 'fr')
      );
  }, [stats, search]);

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="pb-20 md:pb-6 max-w-3xl">
      <h1 className="text-xl md:text-2xl font-bold mb-4">Produits du journal</h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un produit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center">Chargement...</div>
      ) : products.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center">
          {stats.length === 0
            ? 'Aucune consommation enregistrée pour le moment'
            : 'Aucun produit ne correspond à la recherche'}
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <Card
              key={product.productId}
              className="p-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between gap-3"
              onClick={() => navigate(`/journal/products/${product.productId}`)}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={cn(
                    'w-3 h-3 rounded-full flex-shrink-0',
                    product.status === 'unscored'
                      ? 'bg-muted border border-muted-foreground/30'
                      : SCORE_COLORS[product.status]
                  )}
                />
                <p className="font-medium truncate">{product.productName}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm text-muted-foreground">
                  {product.total} conso{product.total > 1 ? 's' : ''}
                </span>
                <Badge className={cn('font-normal border-0', STATUS_BADGE_CLASSES[product.status])}>
                  {PRODUCT_STATUS_LABELS[product.status]}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default JournalProducts;
