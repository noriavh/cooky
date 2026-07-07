export type JournalSlotType = 'morning' | 'noon' | 'evening' | 'custom';
export type JournalScore = 'green' | 'orange' | 'red';

export const DEFAULT_SLOTS: Exclude<JournalSlotType, 'custom'>[] = ['morning', 'noon', 'evening'];

const DEFAULT_SLOT_LABELS: Record<Exclude<JournalSlotType, 'custom'>, string> = {
  morning: 'Matin',
  noon: 'Midi',
  evening: 'Soir',
};

export const slotLabel = (slotType: JournalSlotType, slotName?: string | null): string => {
  if (slotType === 'custom') return slotName ?? '';
  return DEFAULT_SLOT_LABELS[slotType];
};

export const SCORE_LABELS: Record<JournalScore, string> = {
  green: 'Vert',
  orange: 'Orange',
  red: 'Rouge',
};

export const UNSCORED_LABEL = 'Non scoré';

export const SCORE_COLORS: Record<JournalScore, string> = {
  green: 'bg-green-500',
  orange: 'bg-orange-400',
  red: 'bg-red-500',
};

export type ProductStatus = JournalScore | 'unscored';

export const productStatus = (counts: { red: number; orange: number; green: number }): ProductStatus => {
  if (counts.red > 0) return 'red';
  if (counts.orange > 0) return 'orange';
  if (counts.green > 0) return 'green';
  return 'unscored';
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  ...SCORE_LABELS,
  unscored: UNSCORED_LABEL,
};

const SLOT_ORDER: Record<JournalSlotType, number> = {
  morning: 0,
  noon: 1,
  evening: 2,
  custom: 3,
};

export const compareSlots = (
  a: { slot_type: JournalSlotType; created_at: string },
  b: { slot_type: JournalSlotType; created_at: string },
): number =>
  SLOT_ORDER[a.slot_type] - SLOT_ORDER[b.slot_type] || a.created_at.localeCompare(b.created_at);
