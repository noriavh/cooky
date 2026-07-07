import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useJournalSlotNames, useGetOrCreateJournalMeal } from '@/hooks/useFoodJournal';
import { toast } from 'sonner';

interface AddCustomSlotPopoverProps {
  date: string;
  existingSlotNames: string[];
}

const AddCustomSlotPopover = ({ date, existingSlotNames }: AddCustomSlotPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');

  const { data: knownNames = [] } = useJournalSlotNames();
  const getOrCreateMeal = useGetOrCreateJournalMeal();

  const trimmed = name.trim();
  const existingSet = new Set(existingSlotNames.map((n) => n.toLowerCase()));
  const isDuplicate = !!trimmed && existingSet.has(trimmed.toLowerCase());

  const suggestions = knownNames.filter(
    (n) =>
      !existingSet.has(n.toLowerCase()) &&
      (!trimmed || n.toLowerCase().includes(trimmed.toLowerCase()))
  );

  const createSlot = (slotName: string) => {
    getOrCreateMeal.mutate(
      { date, slotType: 'custom', slotName },
      {
        onSuccess: () => {
          setName('');
          setIsOpen(false);
        },
        onError: () => {
          toast.error('Erreur lors de la création du créneau');
        },
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed || isDuplicate) return;
    createSlot(trimmed);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Créneau
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            placeholder="Ex: Goûter, Collation..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          {isDuplicate && (
            <p className="text-xs text-destructive">Ce créneau existe déjà pour ce jour</p>
          )}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => createSlot(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}
          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={!trimmed || isDuplicate || getOrCreateMeal.isPending}
          >
            {getOrCreateMeal.isPending ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-1" />
            )}
            Ajouter
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
};

export default AddCustomSlotPopover;
