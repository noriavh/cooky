import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, Download, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import { fetchJournalExportEntries } from '@/hooks/useJournalHistory';
import { exportJournalToXlsx } from '@/lib/journalExport';
import { toast } from 'sonner';

interface ExportJournalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DatePickerFieldProps {
  label: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
}

const DatePickerField = ({ label, value, onChange }: DatePickerFieldProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex-1 space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-start font-normal">
            <CalendarDays className="w-4 h-4 mr-2" />
            {value ? format(value, 'd MMM yyyy', { locale: fr }) : 'Choisir...'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange(date);
              setIsOpen(false);
            }}
            locale={fr}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

const ExportJournalDialog = ({ open, onOpenChange }: ExportJournalDialogProps) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'all' | 'range'>('all');
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [isExporting, setIsExporting] = useState(false);

  const isRangeInvalid = mode === 'range' && (!fromDate || !toDate || fromDate > toDate);

  const handleExport = async () => {
    if (!user || isRangeInvalid) return;

    setIsExporting(true);
    try {
      const from = mode === 'range' && fromDate ? format(fromDate, 'yyyy-MM-dd') : undefined;
      const to = mode === 'range' && toDate ? format(toDate, 'yyyy-MM-dd') : undefined;

      const entries = await fetchJournalExportEntries(user.id, from, to);

      if (entries.length === 0) {
        toast.info('Aucune donnée sur cette période');
        return;
      }

      const suffix = from && to ? `${from}-${to}` : 'complet';
      await exportJournalToXlsx(entries, `journal-alimentaire-${suffix}.xlsx`);
      toast.success('Export téléchargé');
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Exporter le journal</DialogTitle>
        </DialogHeader>

        <RadioGroup value={mode} onValueChange={(value) => setMode(value as 'all' | 'range')}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="export-all" />
            <Label htmlFor="export-all">Tout l'historique</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="range" id="export-range" />
            <Label htmlFor="export-range">Plage de dates</Label>
          </div>
        </RadioGroup>

        {mode === 'range' && (
          <div className="flex gap-2">
            <DatePickerField label="Du" value={fromDate} onChange={setFromDate} />
            <DatePickerField label="Au" value={toDate} onChange={setToDate} />
          </div>
        )}

        <Button onClick={handleExport} disabled={isExporting || isRangeInvalid}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Exporter en Excel
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ExportJournalDialog;
