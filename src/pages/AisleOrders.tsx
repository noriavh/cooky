import { useState, useEffect } from 'react';
import { GripVertical, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAislesWithOrder, useSaveAisleOrders, type AisleWithOrder } from '@/hooks/useAisleOrders';
import { useAisles } from '@/hooks/useShoppingList';

const AisleOrders = () => {
  const { toast } = useToast();
  const { data: aislesWithOrder, isLoading } = useAislesWithOrder();
  const { data: defaultAisles } = useAisles();
  const saveOrders = useSaveAisleOrders();
  
  const [orderedAisles, setOrderedAisles] = useState<AisleWithOrder[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (aislesWithOrder) {
      setOrderedAisles(aislesWithOrder);
      setHasChanges(false);
    }
  }, [aislesWithOrder]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...orderedAisles];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);

    // Update positions
    const updatedOrder = newOrder.map((aisle, i) => ({
      ...aisle,
      customPosition: i,
    }));

    setOrderedAisles(updatedOrder);
    setDraggedIndex(index);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = async () => {
    const orders = orderedAisles.map((aisle, index) => ({
      aisleId: aisle.id,
      position: index,
    }));

    try {
      await saveOrders.mutateAsync(orders);
      toast({
        title: 'Ordre sauvegardé',
        description: 'L\'ordre des rayons a été mis à jour',
      });
      setHasChanges(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder l\'ordre',
        variant: 'destructive',
      });
    }
  };

  const handleReset = () => {
    if (!defaultAisles) return;
    
    const resetOrder: AisleWithOrder[] = defaultAisles
      .sort((a, b) => a.position - b.position)
      .map((aisle, index) => ({
        ...aisle,
        customPosition: index,
      }));
    
    setOrderedAisles(resetOrder);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="container max-w-2xl py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-6 space-y-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
        <h1 className="text-2xl font-bold truncate min-w-0">Mes rayons</h1>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!hasChanges && orderedAisles.every((a, i) => a.position === i)}
          >
            <RotateCcw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Réinitialiser</span>
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saveOrders.isPending}
          >
            <Save className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{saveOrders.isPending ? 'Sauvegarde...' : 'Sauvegarder'}</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            Ordre des rayons dans la liste de courses
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Glissez-déposez les rayons pour modifier leur ordre d'affichage
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {orderedAisles.map((aisle, index) => (
              <div
                key={aisle.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 px-4 py-3 cursor-grab active:cursor-grabbing transition-colors ${
                  draggedIndex === index ? 'bg-muted' : 'hover:bg-muted/50'
                }`}
              >
                <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <span className="text-xl flex-shrink-0">{aisle.icon || '📦'}</span>
                <span className="font-medium">{aisle.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {hasChanges && (
        <p className="text-sm text-muted-foreground text-center">
          Des modifications non sauvegardées sont en attente
        </p>
      )}
    </div>
  );
};

export default AisleOrders;
