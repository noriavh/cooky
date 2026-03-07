import { useState, useMemo, useEffect, useImperativeHandle, forwardRef } from 'react';
import { X, Search, List, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  useRecipeListMembership,
  useAvailableLists,
  useAddRecipeToListMutation,
  useRemoveRecipeFromListMutation,
} from '@/hooks/useRecipeListMembership';

interface RecipeList {
  id: string;
  name: string;
}

interface RecipeListManagerProps {
  recipeId?: string;
  onPendingListsChange?: (listIds: string[]) => void;
}

export interface RecipeListManagerRef {
  getPendingListIds: () => string[];
}

const RecipeListManager = forwardRef<RecipeListManagerRef, RecipeListManagerProps>(
  ({ recipeId, onPendingListsChange }, ref) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [pendingLists, setPendingLists] = useState<RecipeList[]>([]);

  const isCreateMode = !recipeId;

  const { data: memberLists = [], isLoading: loadingMembership } = useRecipeListMembership(recipeId);
  const { data: allLists = [], isLoading: loadingLists } = useAvailableLists();
  const addToList = useAddRecipeToListMutation();
  const removeFromList = useRemoveRecipeFromListMutation();

  // Expose pending list IDs to parent
  useImperativeHandle(ref, () => ({
    getPendingListIds: () => pendingLists.map(l => l.id),
  }));

  // Notify parent of pending lists changes
  useEffect(() => {
    onPendingListsChange?.(pendingLists.map(l => l.id));
  }, [pendingLists, onPendingListsChange]);

  const displayedLists = isCreateMode ? pendingLists : memberLists;

  const memberListIds = useMemo(() => 
    new Set(displayedLists.map(list => list?.id).filter(Boolean)),
    [displayedLists]
  );

  const filteredLists = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return allLists.filter(list => 
      !memberListIds.has(list.id) && 
      list.name.toLowerCase().includes(query)
    );
  }, [allLists, searchQuery, memberListIds]);

  const handleAddToList = async (listId: string, listName: string) => {
    if (isCreateMode) {
      // In create mode, just add to pending lists
      setPendingLists(prev => [...prev, { id: listId, name: listName }]);
      setSearchQuery('');
      toast({
        title: 'Liste sélectionnée',
        description: `"${listName}" sera ajoutée à la sauvegarde`,
      });
    } else {
      // In edit mode, make the API call
      try {
        await addToList.mutateAsync({ listId, recipeId: recipeId! });
        setSearchQuery('');
        toast({
          title: 'Recette ajoutée',
          description: `Ajoutée à "${listName}"`,
        });
      } catch (error) {
        toast({
          title: 'Erreur',
          description: "Impossible d'ajouter à la liste",
          variant: 'destructive',
        });
      }
    }
  };

  const handleRemoveFromList = async (listId: string, listName: string) => {
    if (isCreateMode) {
      // In create mode, just remove from pending lists
      setPendingLists(prev => prev.filter(l => l.id !== listId));
      toast({
        title: 'Liste retirée',
        description: `"${listName}" ne sera pas ajoutée`,
      });
    } else {
      // In edit mode, make the API call
      try {
        await removeFromList.mutateAsync({ listId, recipeId: recipeId! });
        toast({
          title: 'Recette retirée',
          description: `Retirée de "${listName}"`,
        });
      } catch (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de retirer de la liste',
          variant: 'destructive',
        });
      }
    }
  };

  const isLoading = !isCreateMode && (loadingMembership || loadingLists);

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <List className="w-4 h-4" />
        Listes de recettes
      </Label>

      {/* Current lists */}
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {isLoading ? (
          <span className="text-sm text-muted-foreground">Chargement...</span>
        ) : displayedLists.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            {isCreateMode 
              ? "Recherchez une liste pour l'ajouter"
              : "Cette recette n'appartient à aucune liste"
            }
          </span>
        ) : (
          <AnimatePresence mode="popLayout">
            {displayedLists.map((list) => list && (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                layout
              >
                <Badge 
                  variant="secondary" 
                  className="flex items-center gap-1.5 pr-1 py-1"
                >
                  <span>{list.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFromList(list.id, list.name)}
                    className="p-0.5 rounded-full hover:bg-muted-foreground/20 transition-colors"
                    disabled={!isCreateMode && removeFromList.isPending}
                  >
                    <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une liste..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          className="pl-9"
        />

        {/* Dropdown results */}
        <AnimatePresence>
          {isFocused && searchQuery.trim() && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto"
            >
              {filteredLists.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  Aucune liste trouvée
                </div>
              ) : (
                filteredLists.map((list) => (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => handleAddToList(list.id, list.name)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                    disabled={!isCreateMode && addToList.isPending}
                  >
                    <Plus className="w-4 h-4 text-muted-foreground" />
                    <span>{list.name}</span>
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

RecipeListManager.displayName = 'RecipeListManager';

export default RecipeListManager;
