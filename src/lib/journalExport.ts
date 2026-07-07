import { format, parse } from 'date-fns';
import { JournalExportEntry } from '@/hooks/useJournalHistory';
import { slotLabel, SCORE_LABELS, UNSCORED_LABEL, JournalScore } from '@/lib/journal';

interface ProductSummary {
  productName: string;
  total: number;
  green: number;
  orange: number;
  red: number;
  unscored: number;
  firstDate: string;
  lastDate: string;
}

const formatDate = (date: string): string =>
  format(parse(date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy');

const scoreLabel = (score: JournalScore | null): string =>
  score ? SCORE_LABELS[score] : UNSCORED_LABEL;

const buildSummaries = (entries: JournalExportEntry[]): ProductSummary[] => {
  const byProduct = new Map<string, ProductSummary>();
  for (const entry of entries) {
    let summary = byProduct.get(entry.productName);
    if (!summary) {
      summary = {
        productName: entry.productName,
        total: 0,
        green: 0,
        orange: 0,
        red: 0,
        unscored: 0,
        firstDate: entry.date,
        lastDate: entry.date,
      };
      byProduct.set(entry.productName, summary);
    }
    summary.total += 1;
    if (entry.score) {
      summary[entry.score] += 1;
    } else {
      summary.unscored += 1;
    }
    if (entry.date < summary.firstDate) summary.firstDate = entry.date;
    if (entry.date > summary.lastDate) summary.lastDate = entry.date;
  }
  return [...byProduct.values()];
};

const pct = (count: number, scored: number): number | null =>
  scored > 0 ? Math.round((count / scored) * 1000) / 10 : null;

export const exportJournalToXlsx = async (
  entries: JournalExportEntry[],
  filename: string,
): Promise<void> => {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();

  const detailSheet = workbook.addWorksheet('Détail');
  detailSheet.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Créneau', key: 'slot', width: 14 },
    { header: 'Produit', key: 'product', width: 28 },
    { header: 'Score', key: 'score', width: 12 },
    { header: 'Note', key: 'note', width: 40 },
    { header: "Recette d'origine", key: 'recipe', width: 28 },
  ];
  detailSheet.getRow(1).font = { bold: true };

  const sortedEntries = [...entries].sort(
    (a, b) => a.date.localeCompare(b.date) || slotLabel(a.slotType, a.slotName).localeCompare(slotLabel(b.slotType, b.slotName), 'fr')
  );

  for (const entry of sortedEntries) {
    detailSheet.addRow({
      date: formatDate(entry.date),
      slot: slotLabel(entry.slotType, entry.slotName),
      product: entry.productName,
      score: scoreLabel(entry.score),
      note: entry.note ?? '',
      recipe: entry.sourceRecipeTitle ?? '',
    });
  }

  const summarySheet = workbook.addWorksheet('Synthèse');
  summarySheet.columns = [
    { header: 'Produit', key: 'product', width: 28 },
    { header: 'Nb consommations', key: 'total', width: 18 },
    { header: 'Nb vert', key: 'green', width: 10 },
    { header: 'Nb orange', key: 'orange', width: 10 },
    { header: 'Nb rouge', key: 'red', width: 10 },
    { header: 'Nb non scoré', key: 'unscored', width: 13 },
    { header: '% vert', key: 'greenPct', width: 10 },
    { header: '% orange', key: 'orangePct', width: 10 },
    { header: '% rouge', key: 'redPct', width: 10 },
    { header: 'Première conso', key: 'firstDate', width: 15 },
    { header: 'Dernière conso', key: 'lastDate', width: 15 },
  ];
  summarySheet.getRow(1).font = { bold: true };

  const summaries = buildSummaries(entries).sort((a, b) => {
    const scoredA = a.green + a.orange + a.red;
    const scoredB = b.green + b.orange + b.red;
    return (pct(b.red, scoredB) ?? -1) - (pct(a.red, scoredA) ?? -1) || b.total - a.total;
  });

  for (const summary of summaries) {
    const scored = summary.green + summary.orange + summary.red;
    summarySheet.addRow({
      product: summary.productName,
      total: summary.total,
      green: summary.green,
      orange: summary.orange,
      red: summary.red,
      unscored: summary.unscored,
      greenPct: pct(summary.green, scored),
      orangePct: pct(summary.orange, scored),
      redPct: pct(summary.red, scored),
      firstDate: formatDate(summary.firstDate),
      lastDate: formatDate(summary.lastDate),
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
