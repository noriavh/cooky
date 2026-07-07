import { Navigate, Link, useParams, useLocation } from 'react-router-dom';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useJournalProductStats, useJournalProductHistory } from '@/hooks/useJournalHistory';
import { slotLabel, SCORE_COLORS, SCORE_LABELS, UNSCORED_LABEL } from '@/lib/journal';
import { cn } from '@/lib/utils';

const JournalProductDetail = () => {
  const { user, loading } = useAuth();
  const { productId } = useParams<{ productId: string }>();
  const location = useLocation();
  const backPath = location.pathname.startsWith('/journal/products')
    ? '/journal/products'
    : '/journal/history';

  const { data: allStats = [] } = useJournalProductStats();
  const { data: history = [], isLoading } = useJournalProductHistory(productId ?? '');

  const stats = allStats.find((s) => s.productId === productId);
  const scored = stats ? stats.green + stats.orange + stats.red : 0;

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="pb-20 md:pb-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-4">
        <Link to={backPath}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-xl md:text-2xl font-bold">
          {stats?.productName ?? 'Produit'}
        </h1>
      </div>

      {stats && (
        <Card className="p-4 mb-4">
          <div className="flex items-center justify-between gap-3 mb-2 text-sm">
            <span className="text-muted-foreground">
              {stats.total} consommation{stats.total > 1 ? 's' : ''}
              {stats.unscored > 0 && ` · ${stats.unscored} non scorée${stats.unscored > 1 ? 's' : ''}`}
            </span>
            <span className="text-muted-foreground">
              du {format(parse(stats.firstDate, 'yyyy-MM-dd', new Date()), 'd MMM yyyy', { locale: fr })}
              {' au '}
              {format(parse(stats.lastDate, 'yyyy-MM-dd', new Date()), 'd MMM yyyy', { locale: fr })}
            </span>
          </div>
          {scored > 0 ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-muted flex">
                <div className="bg-green-500 h-full" style={{ width: `${stats.greenPct}%` }} />
                <div className="bg-orange-400 h-full" style={{ width: `${stats.orangePct}%` }} />
                <div className="bg-red-500 h-full" style={{ width: `${stats.redPct}%` }} />
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {Math.round(stats.greenPct)}% / {Math.round(stats.orangePct)}% / {Math.round(stats.redPct)}%
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Aucun repas scoré</p>
          )}
        </Card>
      )}

      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center">Chargement...</div>
      ) : history.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center">
          Aucune consommation enregistrée pour ce produit
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((entry) => (
            <Card key={entry.itemId} className="p-3">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'w-3 h-3 rounded-full flex-shrink-0',
                    entry.score ? SCORE_COLORS[entry.score] : 'bg-muted border border-muted-foreground/30'
                  )}
                  title={entry.score ? SCORE_LABELS[entry.score] : UNSCORED_LABEL}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium capitalize">
                    {format(parse(entry.date, 'yyyy-MM-dd', new Date()), 'EEEE d MMMM yyyy', { locale: fr })}
                    <span className="text-muted-foreground font-normal">
                      {' · '}
                      {slotLabel(entry.slotType, entry.slotName)}
                    </span>
                  </p>
                  {entry.note && (
                    <p className="text-sm text-muted-foreground mt-0.5">{entry.note}</p>
                  )}
                </div>
                {entry.sourceRecipeTitle && (
                  <Badge variant="outline" className="text-xs font-normal flex-shrink-0">
                    {entry.sourceRecipeTitle}
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default JournalProductDetail;
