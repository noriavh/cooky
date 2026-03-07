import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useRecipeLists,
  useCreateRecipeList,
  useDeleteRecipeList,
} from '@/hooks/useRecipeLists';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const Lists = () => {
  const { data: lists, isLoading } = useRecipeLists();
  const createList = useCreateRecipeList();
  const deleteList = useDeleteRecipeList();

  const [newListName, setNewListName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      toast.error('Veuillez entrer un nom pour la liste');
      return;
    }

    try {
      await createList.mutateAsync(newListName.trim());
      toast.success('Liste créée avec succès');
      setNewListName('');
      setDialogOpen(false);
    } catch (error) {
      toast.error('Erreur lors de la création de la liste');
    }
  };

  const handleDeleteList = async (id: string) => {
    try {
      await deleteList.mutateAsync(id);
      toast.success('Liste supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Mes listes</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-warm text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle liste
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une nouvelle liste</DialogTitle>
              <DialogDescription>
                Donnez un nom à votre liste pour organiser vos recettes.
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
      </div>

      {/* Lists grid */}
      {lists && lists.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list, index) => (
            <motion.div
              key={list.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group hover:shadow-hover transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <Link to={`/lists/${list.id}`} className="flex-1">
                      <CardTitle className="text-lg hover:text-primary transition-colors">
                        {list.name}
                      </CardTitle>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer la liste ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. La liste "{list.name}" sera
                            définitivement supprimée.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteList(list.id)}>
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link to={`/lists/${list.id}`}>
                    <p className="text-sm text-muted-foreground">
                      {list.recipe_list_items?.length || 0} recette
                      {(list.recipe_list_items?.length || 0) > 1 ? 's' : ''}
                    </p>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Aucune liste</h2>
          <p className="text-muted-foreground mb-6">
            Créez des listes pour organiser vos recettes par thème, occasion ou saison.
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Créer ma première liste
          </Button>
        </Card>
      )}
    </div>
  );
};

export default Lists;
