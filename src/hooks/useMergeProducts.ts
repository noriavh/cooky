import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MergeProductsParams {
  sourceId: string;
  masterId: string;
}

export const useMergeProducts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sourceId, masterId }: MergeProductsParams) => {
      // 1. Update all ingredients that reference the source product to use the master
      const { error: ingredientsError } = await supabase
        .from('ingredients')
        .update({ product_id: masterId })
        .eq('product_id', sourceId);

      if (ingredientsError) {
        throw new Error(`Erreur lors de la mise à jour des ingrédients: ${ingredientsError.message}`);
      }

      // 2. Update all shopping list items that reference the source product to use the master
      const { error: shoppingError } = await supabase
        .from('shopping_list_items')
        .update({ product_id: masterId })
        .eq('product_id', sourceId);

      if (shoppingError) {
        throw new Error(`Erreur lors de la mise à jour des listes de courses: ${shoppingError.message}`);
      }

      // 3. Delete the source product
      const { error: deleteError } = await supabase
        .from('shopping_products')
        .delete()
        .eq('id', sourceId);

      if (deleteError) {
        throw new Error(`Erreur lors de la suppression du produit: ${deleteError.message}`);
      }

      return { sourceId, masterId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-products'] });
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
      toast.success('Produits fusionnés avec succès');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
