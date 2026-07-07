import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  JournalMeal,
  useGetOrCreateJournalMeal,
  useAddJournalItems,
  useRemoveJournalItem,
  useUpdateJournalMeal,
  useDeleteJournalMeal,
} from '@/hooks/useFoodJournal';
import { JournalScore, JournalSlotType, slotLabel } from '@/lib/journal';
import MealScorePicker from './MealScorePicker';
import AddIngredientRow from './AddIngredientRow';
import RecipeIngredientsPickDialog, { PickedIngredient } from './RecipeIngredientsPickDialog';
import { toast } from 'sonner';

interface MealSlotCardProps {
  date: string;
  slotType: JournalSlotType;
  slotName?: string | null;
  meal: JournalMeal | null;
}

const MealSlotCard = ({ date, slotType, slotName, meal }: MealSlotCardProps) => {
  const [note, setNote] = useState(meal?.note ?? '');
  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const getOrCreateMeal = useGetOrCreateJournalMeal();
  const addItems = useAddJournalItems();
  const removeItem = useRemoveJournalItem();
  const updateMeal = useUpdateJournalMeal();
  const deleteMeal = useDeleteJournalMeal();

  useEffect(() => {
    setNote(meal?.note ?? '');
  }, [meal?.note]);

  const ensureMeal = async (): Promise<JournalMeal> => {
    if (meal) return meal;
    return getOrCreateMeal.mutateAsync({ date, slotType, slotName: slotName ?? undefined });
  };

  const handleAddProduct = async (productId: string) => {
    const target = await ensureMeal();
    await addItems.mutateAsync({ mealId: target.id, items: [{ productId }] });
  };

  const handleAddFromRecipe = async (picked: PickedIngredient[]) => {
    if (picked.length === 0) return;
    try {
      const target = await ensureMeal();
      await addItems.mutateAsync({
        mealId: target.id,
        items: picked.map((p) => ({ productId: p.productId, sourceRecipeId: p.sourceRecipeId })),
      });
      toast.success(`${picked.length} ingrédient${picked.length > 1 ? 's' : ''} ajouté${picked.length > 1 ? 's' : ''}`);
    } catch {
      toast.error("Erreur lors de l'ajout des ingrédients");
    }
  };

  const handleScoreChange = async (score: JournalScore | null) => {
    try {
      const target = await ensureMeal();
      await updateMeal.mutateAsync({ id: target.id, score });
    } catch {
      toast.error("Erreur lors de l'enregistrement du score");
    }
  };

  const handleNoteBlur = async () => {
    const trimmed = note.trim();
    if (trimmed === (meal?.note ?? '')) return;
    if (!meal && !trimmed) return;
    try {
      const target = await ensureMeal();
      await updateMeal.mutateAsync({ id: target.id, note: trimmed || null });
    } catch {
      toast.error("Erreur lors de l'enregistrement de la note");
    }
  };

  const handleDelete = () => {
    if (!meal) return;
    deleteMeal.mutate(meal.id, {
      onSuccess: () => {
        toast.success(slotType === 'custom' ? 'Créneau supprimé' : 'Repas vidé');
      },
      onError: () => {
        toast.error('Erreur lors de la suppression');
      },
    });
    setIsDeleteDialogOpen(false);
  };

  const items = meal?.journal_meal_items ?? [];
  const isCustom = slotType === 'custom';

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4">
        <CardTitle className="text-base font-semibold">
          {slotLabel(slotType, slotName)}
        </CardTitle>
        <div className="flex items-center gap-2">
          <MealScorePicker
            value={meal?.score ?? null}
            onChange={handleScoreChange}
            disabled={updateMeal.isPending || getOrCreateMeal.isPending}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            title="Ajouter depuis une recette"
            aria-label="Ajouter depuis une recette"
            onClick={() => setIsRecipeDialogOpen(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
          {meal && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              title={isCustom ? 'Supprimer le créneau' : 'Vider le repas'}
              aria-label={isCustom ? 'Supprimer le créneau' : 'Vider le repas'}
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4 pb-4 pt-0 flex-1">
        {items.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {items.map((item) => (
              <Badge
                key={item.id}
                variant="secondary"
                className="pl-2 pr-1 py-0.5 gap-1 font-normal"
                title={item.recipes ? `Recette : ${item.recipes.title}` : undefined}
              >
                {item.shopping_products?.name ?? 'Produit inconnu'}
                <button
                  type="button"
                  className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                  onClick={() => removeItem.mutate(item.id)}
                  aria-label="Retirer l'ingrédient"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <AddIngredientRow onAdd={handleAddProduct} />

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={handleNoteBlur}
          placeholder="Note (symptômes, remarques...)"
          rows={1}
          className="min-h-[2.25rem] text-sm resize-none"
        />
      </CardContent>

      <RecipeIngredientsPickDialog
        open={isRecipeDialogOpen}
        onOpenChange={setIsRecipeDialogOpen}
        existingProductIds={items.map((i) => i.product_id)}
        onConfirm={handleAddFromRecipe}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isCustom ? 'Supprimer le créneau ?' : 'Vider le repas ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Les ingrédients, le score et la note de ce repas seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default MealSlotCard;
