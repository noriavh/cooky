import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductStats } from '@/hooks/useJournalHistory';

interface ProductStatsRowProps {
  stats: ProductStats;
  onClick: () => void;
}

const ProductStatsRow = ({ stats, onClick }: ProductStatsRowProps) => {
  const scored = stats.green + stats.orange + stats.red;

  return (
    <Card
      className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="font-medium truncate">{stats.productName}</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          {stats.unscored > 0 && (
            <Badge variant="outline" className="text-xs font-normal">
              non scoré : {stats.unscored}
            </Badge>
          )}
          <span className="text-sm text-muted-foreground">
            {stats.total} conso{stats.total > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {scored > 0 ? (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full overflow-hidden bg-muted flex">
            <div className="bg-green-500 h-full" style={{ width: `${stats.greenPct}%` }} />
            <div className="bg-orange-400 h-full" style={{ width: `${stats.orangePct}%` }} />
            <div className="bg-red-500 h-full" style={{ width: `${stats.redPct}%` }} />
          </div>
          <span className="text-xs text-muted-foreground w-24 text-right flex-shrink-0">
            {Math.round(stats.redPct)}% rouge
          </span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Aucun repas scoré</p>
      )}
    </Card>
  );
};

export default ProductStatsRow;
