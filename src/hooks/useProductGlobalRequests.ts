import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from './useUserRole';
import type { ShoppingProduct } from './useShoppingProducts';
import { toast } from 'sonner';

export type ProductGlobalRequest = {
  id: string;
  product_id: string;
  requested_by: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  product?: {
    id: string;
    name: string;
    unit_id: string | null;
    aisle_id: string | null;
    user_id: string | null;
    family_id: string | null;
    aisles?: { id: string; name: string; icon: string | null } | null;
    units?: { id: string; name: string; abbreviation: string | null } | null;
  } | null;
  requester_profile?: { username: string | null };
};

export const usePendingGlobalRequests = () => {
  const { isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ['product-global-requests', 'pending'],
    queryFn: async () => {
      const { data: requests, error } = await supabase
        .from('product_global_requests')
        .select(`
          *,
          product:shopping_products (
            *,
            aisles (*),
            units (*)
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(requests?.map(r => r.requested_by) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return (requests || []).map(r => ({
        ...r,
        requester_profile: profileMap.get(r.requested_by) || { username: null },
      })) as ProductGlobalRequest[];
    },
    enabled: isAdmin,
  });
};

export const useMyGlobalRequests = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['product-global-requests', 'my', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('product_global_requests')
        .select('*')
        .eq('requested_by', user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useRequestProductGlobal = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('product_global_requests')
        .insert({
          product_id: productId,
          requested_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-global-requests'] });
      toast.success('Demande envoyée');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Une demande existe déjà pour ce produit');
      } else {
        toast.error('Erreur lors de la demande');
      }
    },
  });
};

export const useCancelGlobalRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('product_global_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-global-requests'] });
      toast.success('Demande annulée');
    },
  });
};

export const useApproveGlobalRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (request: ProductGlobalRequest) => {
      if (!user || !request.product) throw new Error('Invalid request');

      // 1. Create the global product
      const { data: globalProduct, error: createError } = await supabase
        .from('shopping_products')
        .insert({
          name: request.product.name,
          unit_id: request.product.unit_id,
          aisle_id: request.product.aisle_id,
          user_id: null,
          family_id: null,
        })
        .select()
        .single();

      if (createError) throw createError;

      // 2. Update ingredients referencing the local product to use global
      const { error: ingredientError } = await supabase
        .from('ingredients')
        .update({ product_id: globalProduct.id })
        .eq('product_id', request.product_id);

      if (ingredientError) console.error('Error updating ingredients:', ingredientError);

      // 3. Update shopping list items referencing the local product to use global
      const { error: shoppingError } = await supabase
        .from('shopping_list_items')
        .update({ product_id: globalProduct.id })
        .eq('product_id', request.product_id);

      if (shoppingError) console.error('Error updating shopping items:', shoppingError);

      // 4. Delete the local product (this will cascade delete the request)
      const { error: deleteError } = await supabase
        .from('shopping_products')
        .delete()
        .eq('id', request.product_id);

      if (deleteError) throw deleteError;

      return globalProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-global-requests'] });
      queryClient.invalidateQueries({ queryKey: ['shopping-products'] });
      toast.success('Produit ajouté en global');
    },
    onError: (error: Error) => {
      console.error('Error approving request:', error);
      toast.error('Erreur lors de l\'approbation');
    },
  });
};

export const useRejectGlobalRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('product_global_requests')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: user.id,
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-global-requests'] });
      toast.success('Demande refusée');
    },
  });
};

// Convert a local/family product directly to global (for admins only)
export const useConvertToGlobal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: { id: string; name: string; unit_id: string | null; aisle_id: string | null }) => {
      // 1. Create the global product
      const { data: globalProduct, error: createError } = await supabase
        .from('shopping_products')
        .insert({
          name: product.name,
          unit_id: product.unit_id,
          aisle_id: product.aisle_id,
          user_id: null,
          family_id: null,
        })
        .select()
        .single();

      if (createError) throw createError;

      // 2. Update ingredients referencing the local product to use global
      const { error: ingredientError } = await supabase
        .from('ingredients')
        .update({ product_id: globalProduct.id })
        .eq('product_id', product.id);

      if (ingredientError) console.error('Error updating ingredients:', ingredientError);

      // 3. Update shopping list items referencing the local product to use global
      const { error: shoppingError } = await supabase
        .from('shopping_list_items')
        .update({ product_id: globalProduct.id })
        .eq('product_id', product.id);

      if (shoppingError) console.error('Error updating shopping items:', shoppingError);

      // 4. Delete the local product
      const { error: deleteError } = await supabase
        .from('shopping_products')
        .delete()
        .eq('id', product.id);

      if (deleteError) throw deleteError;

      return globalProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-products'] });
      toast.success('Produit converti en global');
    },
    onError: (error: Error) => {
      console.error('Error converting to global:', error);
      toast.error('Erreur lors de la conversion');
    },
  });
};
