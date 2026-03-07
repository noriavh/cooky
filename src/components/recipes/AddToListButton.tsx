import { useState } from 'react';
import { ListPlus, Check, Plus } from 'lucide-react';
import {
  useRecipeLists,
  useAddRecipeToList,
  useRemoveRecipeFromList,
  useCreateRecipeList,
} from '@/hooks/useRecipeLists';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface AddToListButtonProps {
  recipeId: string;
}

const AddToListButton = ({ recipeId }: AddToListButtonProps) => {
  const { data: lists } = useRecipeLists();
  const addToList = useAddRecipeToList();
  const removeFromList = useRemoveRecipeFromList();
  const createList = useCreateRecipeList();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');

  const isInList = (listId: string) => {
    const list = lists?.find((l) => l.id === listId);
    return list?.recipe_list_items?.some(
      (item) => item.recipes.id === recipeId
    );
  };

  const handleToggleList = async (listId: string) => {
    try {
      if (isInList(listId)) {
        await removeFromList.mutateAsync({ listId, recipeId });
        toast.success('Recette retirée de la liste');
      } else {
        await addToList.mutateAsync({ listId, recipeId });
        toast.success('Recette ajoutée à la liste');
      }
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.info('Cette recette est déjà dans la liste');
      } else {
        toast.error('Erreur lors de la modification');
      }
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      toast.error('Veuillez entrer un nom pour la liste');
      return;
    }

    try {
      const newList = await createList.mutateAsync(newListName.trim());
      await addToList.mutateAsync({ listId: newList.id, recipeId });
      toast.success(`Liste "${newListName}" créée et recette ajoutée`);
      setNewListName('');
      setDialogOpen(false);
    } catch (error) {
      toast.error('Erreur lors de la création de la liste');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <ListPlus className="h-4 w-4 mr-2" />
            Ajouter à une liste
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {lists && lists.length > 0 ? (
            <>
              {lists.map((list) => (
                <DropdownMenuItem
                  key={list.id}
                  onClick={() => handleToggleList(list.id)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{list.name}</span>
                    {isInList(list.id) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem
            onClick={() => setDialogOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer une nouvelle liste
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une nouvelle liste</DialogTitle>
            <DialogDescription>
              La recette sera automatiquement ajoutée à cette liste.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nom de la liste"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateList} disabled={createList.isPending}>
              {createList.isPending ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddToListButton;
