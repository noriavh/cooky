import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { useEssentialProducts, useAddEssentialsToShoppingList } from '@/hooks/useEssentialProducts';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AddEssentialsToListButtonProps {
  isMobile?: boolean;
}

const AddEssentialsToListButton = ({ isMobile }: AddEssentialsToListButtonProps) => {
  const [open, setOpen] = useState(false);
  const { data: essentials = [] } = useEssentialProducts();
  const addToList = useAddEssentialsToShoppingList();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Select all by default
      setSelectedIds(new Set(essentials.map((e) => e.id)));
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleAdd = async () => {
    const selectedEssentials = essentials.filter((e) => selectedIds.has(e.id));
    if (selectedEssentials.length === 0) {
      toast.error('Sélectionnez au moins un produit');
      return;
    }

    try {
      await addToList.mutateAsync(selectedEssentials);
      toast.success(`${selectedEssentials.length} produit(s) ajouté(s) à la liste`);
      setOpen(false);
    } catch (error) {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  if (essentials.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="Ajouter les essentiels">
          <Star className="h-4 w-4" />
          {!isMobile && <span className="ml-2">Essentiels</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter les essentiels</DialogTitle>
          <DialogDescription>
            Sélectionnez les produits à ajouter à votre liste de courses
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {essentials.map((essential) => (
              <div
                key={essential.id}
                className="flex items-center gap-3 py-2 px-2 hover:bg-muted/50 rounded-md cursor-pointer"
                onClick={() => toggleSelection(essential.id)}
              >
                <Checkbox
                  checked={selectedIds.has(essential.id)}
                  onCheckedChange={() => toggleSelection(essential.id)}
                />
                <div className="flex items-center gap-2 flex-1">
                  {essential.shopping_products?.aisles?.icon && (
                    <span className="text-sm">{essential.shopping_products.aisles.icon}</span>
                  )}
                  <span>{essential.shopping_products?.name}</span>
                  {essential.quantity && (
                    <span className="text-sm text-muted-foreground">
                      ({essential.quantity}{essential.units?.abbreviation ? ` ${essential.units.abbreviation}` : ''})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleAdd} disabled={addToList.isPending || selectedIds.size === 0}>
            Ajouter ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddEssentialsToListButton;
