import { JournalScore, SCORE_LABELS } from '@/lib/journal';
import { cn } from '@/lib/utils';

interface MealScorePickerProps {
  value: JournalScore | null;
  onChange: (score: JournalScore | null) => void;
  disabled?: boolean;
}

const SCORE_STYLES: Record<JournalScore, { base: string; selected: string }> = {
  green: { base: 'border-green-500', selected: 'bg-green-500' },
  orange: { base: 'border-orange-400', selected: 'bg-orange-400' },
  red: { base: 'border-red-500', selected: 'bg-red-500' },
};

const SCORES: JournalScore[] = ['green', 'orange', 'red'];

const MealScorePicker = ({ value, onChange, disabled }: MealScorePickerProps) => {
  return (
    <div className="flex items-center gap-1.5">
      {SCORES.map((score) => {
        const isSelected = value === score;
        return (
          <button
            key={score}
            type="button"
            disabled={disabled}
            title={SCORE_LABELS[score]}
            aria-label={SCORE_LABELS[score]}
            aria-pressed={isSelected}
            onClick={() => onChange(isSelected ? null : score)}
            className={cn(
              'w-5 h-5 rounded-full border-2 transition-all',
              SCORE_STYLES[score].base,
              isSelected
                ? cn(SCORE_STYLES[score].selected, 'scale-110')
                : 'bg-transparent hover:scale-110',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          />
        );
      })}
    </div>
  );
};

export default MealScorePicker;
