import { useMemo, useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useJournalProductStats, ProductStats } from '@/hooks/useJournalHistory';
import ProductStatsRow from '@/components/journal/ProductStatsRow';
import ExportJournalDialog from '@/components/journal/ExportJournalDialog';

type SortKey = 'redPct' | 'total' | 'name' | 'lastDate';

const SORT_LABELS: Record<SortKey, string> = {
  redPct: 'Taux de rouge',
  total: 'Nb de consommations',
  name: 'Nom',
  lastDate: 'Dernière consommation',
};

const compareBySort = (sortKey: SortKey) => (a: ProductStats, b: ProductStats): number => {
  switch (sortKey) {
    case 'redPct':
      return b.redPct - a.redPct || b.red - a.red || b.total - a.total;
    case 'total':
      return b.total - a.total;
    case 'name':
      return a.productName.localeCompare(b.productName, 'fr');
    case 'lastDate':
      return b.lastDate.localeCompare(a.lastDate);
  }
};

const JournalHistory = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('redPct');
  const [isExportOpen, setIsExportOpen] = useState(false);

  const { data: stats = [], isLoading } = useJournalProductStats();

  const filteredStats = useMemo(() => {
    const term = search.toLowerCase().trim();
    const filtered = term
      ? stats.filter((s) => s.productName.toLowerCase().includes(term))
      : stats;
    return [...filtered].sort(compareBySort(sortKey));
  }, [stats, search, sortKey]);

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="pb-20 md:pb-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Link to="/journal">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl md:text-2xl font-bold">Historique par produit</h1>
        </div>

        <Button variant="outline" size="sm" onClick={() => setIsExportOpen(true)}>
          <Download className="w-4 h-4 mr-1" />
          Exporter
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <SelectItem key={key} value={key}>
                {SORT_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center">Chargement...</div>
      ) : filteredStats.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center">
          {stats.length === 0
            ? 'Aucune consommation enregistrée pour le moment'
            : 'Aucun produit ne correspond à la recherche'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredStats.map((productStats) => (
            <ProductStatsRow
              key={productStats.productId}
              stats={productStats}
              onClick={() => navigate(`/journal/history/${productStats.productId}`)}
            />
          ))}
        </div>
      )}

      <ExportJournalDialog open={isExportOpen} onOpenChange={setIsExportOpen} />
    </div>
  );
};

export default JournalHistory;
