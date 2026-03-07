import { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AdminProduct, AdminAisle, AdminUnit } from '@/hooks/useAdminData';

interface EditProductDialogProps {
  product: AdminProduct;
  aisles: AdminAisle[] | undefined;
  units: AdminUnit[] | undefined;
  onSave: (productId: string, data: { name: string; aisle_id: string | null; unit_id: string | null }) => void;
  isPending: boolean;
}

const EditProductDialog = ({ product, aisles, units, onSave, isPending }: EditProductDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(product.name);
  const [aisleId, setAisleId] = useState<string>(product.aisle?.id || 'none');
  const [unitId, setUnitId] = useState<string>(product.unit?.id || 'none');

  useEffect(() => {
    if (open) {
      setName(product.name);
      setAisleId(product.aisle?.id || 'none');
      setUnitId(product.unit?.id || 'none');
    }
  }, [open, product]);

  const handleSave = () => {
    onSave(product.id, {
      name: name.trim(),
      aisle_id: aisleId === 'none' ? null : aisleId,
      unit_id: unitId === 'none' ? null : unitId,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Modifier le produit</TooltipContent>
      </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le produit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="product-name">Nom</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du produit"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-aisle">Rayon</Label>
            <Select value={aisleId} onValueChange={setAisleId}>
              <SelectTrigger id="product-aisle">
                <SelectValue placeholder="Sélectionner un rayon" />
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-unit">Unité</Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger id="product-unit">
                <SelectValue placeholder="Sélectionner une unité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                {units?.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.abbreviation || unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isPending || !name.trim()}>
            {isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditProductDialog;
