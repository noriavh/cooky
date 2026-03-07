import { useState, useMemo } from 'react';
import { X, Plus, Tag, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTags } from '@/hooks/useRecipes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface RecipeTagManagerProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
}

const RecipeTagManager = ({ selectedTagIds, onTagsChange }: RecipeTagManagerProps) => {
  const { data: tags, isLoading: loadingTags } = useTags();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const selectedTags = useMemo(() => {
    if (!tags) return [];
    return tags.filter(tag => selectedTagIds.includes(tag.id));
  }, [tags, selectedTagIds]);

  const filteredTags = useMemo(() => {
    if (!tags) return [];
    const query = searchQuery.toLowerCase().trim();
    return tags
      .filter(tag => !selectedTagIds.includes(tag.id))
      .filter(tag => !query || tag.name.toLowerCase().includes(query));
  }, [tags, selectedTagIds, searchQuery]);

  const canCreateTag = useMemo(() => {
    if (!searchQuery.trim()) return false;
    const query = searchQuery.toLowerCase().trim();
    return !tags?.some(tag => tag.name.toLowerCase() === query);
  }, [tags, searchQuery]);

  const handleAddTag = (tagId: string) => {
    onTagsChange([...selectedTagIds, tagId]);
    setSearchQuery('');
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTagIds.filter(id => id !== tagId));
  };

  const handleCreateTag = async () => {
    if (!user || !searchQuery.trim()) return;
    
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert({ name: searchQuery.trim(), created_by: user.id })
        .select()
        .single();

      if (error) throw error;

      // Invalidate tags query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      
      // Add the new tag to selection
      onTagsChange([...selectedTagIds, data.id]);
      setSearchQuery('');
      
      toast({
        title: 'Tag créé',
        description: `Le tag "${data.name}" a été créé.`,
      });
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le tag.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Tags
      </label>
      
      <div className="flex flex-wrap items-center gap-2">
        {/* Selected tags */}
        <AnimatePresence mode="popLayout">
          {selectedTags.map(tag => (
            <motion.div
              key={tag.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Badge variant="secondary" className="gap-1 pr-1">
                <Tag className="h-3 w-3" />
                {tag.name}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add tag button with popover */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
            >
              <Plus className="h-3 w-3" />
              Ajouter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-2">
              <Input
                placeholder="Rechercher ou créer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
              
              <div className="max-h-48 overflow-y-auto space-y-1">
                {loadingTags ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Create new tag option */}
                    {canCreateTag && (
                      <button
                        type="button"
                        onClick={handleCreateTag}
                        disabled={isCreating}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-primary/10 text-primary text-sm text-left"
                      >
                        {isCreating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                        Créer "{searchQuery.trim()}"
                      </button>
                    )}
                    
                    {/* Existing tags */}
                    {filteredTags.length > 0 ? (
                      filteredTags.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleAddTag(tag.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-sm text-left"
                        >
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          {tag.name}
                        </button>
                      ))
                    ) : !canCreateTag && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        {searchQuery ? 'Aucun tag trouvé' : 'Aucun tag disponible'}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default RecipeTagManager;
