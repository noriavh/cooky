import { useState, useEffect } from 'react';
import { Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const MONTHS = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' },
];

interface EditSeasonDialogProps {
  product: { id: string; name: string; months: number[] } | null;
  onClose: () => void;
  onSave: (productId: string, months: number[]) => void;
  isPending: boolean;
}

const EditSeasonDialog = ({ product, onClose, onSave, isPending }: EditSeasonDialogProps) => {
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  useEffect(() => {
    if (product) {
      setSelectedMonths(product.months);
    }
  }, [product]);

  const toggleMonth = (month: number) => {
    setSelectedMonths(prev =>
      prev.includes(month)
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };

  const toggleAllMonths = () => {
    if (selectedMonths.length === 12) {
      setSelectedMonths([]);
    } else {
      setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    }
  };

  const handleSave = () => {
    if (product) {
      onSave(product.id, selectedMonths);
    }
  };

  return (
    <Dialog open={!!product} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" />
            Mois de saison
          </DialogTitle>
          <DialogDescription>
            Sélectionnez les mois où <strong>{product?.name}</strong> est de saison en Belgique.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAllMonths}
          >
            {selectedMonths.length === 12 ? 'Tout désélectionner' : 'Tout sélectionner'}
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedMonths.length}/12 mois
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 py-4">
          {MONTHS.map(({ value, label }) => (
            <div
              key={value}
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => toggleMonth(value)}
            >
              <Checkbox
                id={`month-${value}`}
                checked={selectedMonths.includes(value)}
                onCheckedChange={(checked) => {
                  // Prevent double toggle from parent div click
                }}
              />
              <Label className="text-sm cursor-pointer">
                {label}
              </Label>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditSeasonDialog;
