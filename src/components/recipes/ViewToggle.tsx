import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const ViewToggle = ({ viewMode, onViewModeChange }: ViewToggleProps) => {
  return (
    <div className="flex items-center bg-muted rounded-lg p-1">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-md",
          viewMode === 'grid' && "bg-background shadow-sm"
        )}
        onClick={() => onViewModeChange('grid')}
        title="Vue grille"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 rounded-md",
          viewMode === 'list' && "bg-background shadow-sm"
        )}
        onClick={() => onViewModeChange('list')}
        title="Vue liste"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ViewToggle;
