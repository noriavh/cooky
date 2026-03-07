import { useState, useMemo } from 'react';
import { Leaf, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSeasonalProducts } from '@/hooks/useSeasonalProducts';
import { includesNormalized } from '@/lib/stringUtils';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const SeasonalProducts = () => {
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [searchName, setSearchName] = useState('');
  const { data: products, isLoading } = useSeasonalProducts();

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter(product => {
      // Filter by selected month
      const months = product.product_seasons?.map((s: { month: number }) => s.month) || [];
      if (!months.includes(selectedMonth)) return false;
      
      // Filter by search
      if (searchName.trim() && !includesNormalized(product.name, searchName)) {
        return false;
      }
      
      return true;
    });
  }, [products, selectedMonth, searchName]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border p-3 sm:p-4 space-y-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Leaf className="h-6 w-6 text-primary" />
          <h1 className="text-xl sm:text-2xl font-display font-bold">Produits de saison</h1>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Découvrez les fruits et légumes de saison en Belgique
        </p>

        <div className="flex flex-wrap gap-3 items-center">
          <Select 
            value={selectedMonth.toString()} 
            onValueChange={(v) => setSelectedMonth(parseInt(v))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, index) => (
                <SelectItem key={index + 1} value={(index + 1).toString()}>
                  {name}
                  {index + 1 === currentMonth && ' (actuel)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} de saison en {MONTH_NAMES[selectedMonth - 1].toLowerCase()}
        </p>
      </motion.div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 flex items-center gap-2">
                <span className="text-xl">{product.aisle?.icon || '🥬'}</span>
                <span className="font-medium text-sm truncate">{product.name}</span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Leaf className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Aucun produit de saison trouvé</p>
        </div>
      )}
    </div>
  );
};

export default SeasonalProducts;
