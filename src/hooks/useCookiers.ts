import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CookierWithProfile {
  id: string;
  user_id: string;
  cookier_id: string;
  status: string;
  created_at: string;
  user_shares_recipes: boolean;
  cookier_shares_recipes: boolean;
  profile: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
  // Whether this cookier shares their recipes with me
  sharesRecipesWithMe: boolean;
  // Whether I share my recipes with this cookier
  iShareRecipesWithThem: boolean;
}

export const useCookiers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cookiers', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get accepted cookiers where I am the requester
      const { data: sentCookiers, error: sentError } = await supabase
        .from('cookiers')
        .select(`
          id,
          user_id,
          cookier_id,
          status,
          created_at,
          user_shares_recipes,
          cookier_shares_recipes
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (sentError) throw sentError;

      // Get accepted cookiers where I received the request
      const { data: receivedCookiers, error: receivedError } = await supabase
        .from('cookiers')
        .select(`
          id,
          user_id,
          cookier_id,
          status,
          created_at,
          user_shares_recipes,
          cookier_shares_recipes
        `)
        .eq('cookier_id', user.id)
        .eq('status', 'accepted');

      if (receivedError) throw receivedError;

      // Combine and get unique friend IDs
      const allCookiers = [...(sentCookiers || []), ...(receivedCookiers || [])];
      const friendIds = allCookiers.map(c => 
        c.user_id === user.id ? c.cookier_id : c.user_id
      );

      if (friendIds.length === 0) return [];

      // Fetch profiles for all friends
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', friendIds);

      if (profilesError) throw profilesError;

      // Map profiles to cookiers with sharing info
      return allCookiers.map(cookier => {
        const isRequester = cookier.user_id === user.id;
        return {
          ...cookier,
          profile: profiles?.find(p => 
            p.id === (isRequester ? cookier.cookier_id : cookier.user_id)
          ) || null,
          // If I'm the requester (user_id), the other person (cookier_id) shares via cookier_shares_recipes
          // If I'm the recipient (cookier_id), the other person (user_id) shares via user_shares_recipes
          sharesRecipesWithMe: isRequester ? cookier.cookier_shares_recipes : cookier.user_shares_recipes,
          // If I'm the requester, I share via user_shares_recipes
          // If I'm the recipient, I share via cookier_shares_recipes
          iShareRecipesWithThem: isRequester ? cookier.user_shares_recipes : cookier.cookier_shares_recipes,
        };
      }) as CookierWithProfile[];
    },
    enabled: !!user,
  });
};

export const usePendingRequests = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get pending requests where I am the recipient
      const { data: requests, error } = await supabase
        .from('cookiers')
        .select(`
          id,
          user_id,
          cookier_id,
          status,
          created_at
        `)
        .eq('cookier_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      if (!requests || requests.length === 0) return [];

      // Get profiles of requesters
      const requesterIds = requests.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', requesterIds);

      if (profilesError) throw profilesError;

      return requests.map(request => ({
        ...request,
        profile: profiles?.find(p => p.id === request.user_id) || null
      })) as CookierWithProfile[];
    },
    enabled: !!user,
  });
};

export const usePendingRequestsCount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-requests-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('cookiers')
        .select('*', { count: 'exact', head: true })
        .eq('cookier_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
};

export const useSearchUserByEmail = (email: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['search-user', email],
    queryFn: async () => {
      if (!email || !user) return null;

      // Search in auth.users is not possible, so we search by username in profiles
      // We'll need to check if the email matches exactly
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .neq('id', user.id);

      if (error) throw error;

      // Since we can't search by email directly, we return null
      // The user will need to search by exact email via a different approach
      return null;
    },
    enabled: false, // Disabled - we'll use a different approach
  });
};

export const useSendFriendRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (cookierId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('cookiers')
        .insert({
          user_id: user.id,
          cookier_id: cookierId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cookiers'] });
      toast.success('Demande envoyée !');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Une demande a déjà été envoyée à cet utilisateur');
      } else {
        toast.error('Erreur lors de l\'envoi de la demande');
      }
    },
  });
};

export const useAcceptFriendRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase
        .from('cookiers')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cookiers'] });
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-requests-count'] });
      toast.success('Demande acceptée !');
    },
    onError: () => {
      toast.error('Erreur lors de l\'acceptation');
    },
  });
};

export const useRejectFriendRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('cookiers')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-requests-count'] });
      toast.success('Demande refusée');
    },
    onError: () => {
      toast.error('Erreur lors du refus');
    },
  });
};

export const useRemoveCookier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cookierId: string) => {
      const { error } = await supabase
        .from('cookiers')
        .delete()
        .eq('id', cookierId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cookiers'] });
      toast.success('Cookier supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });
};

export const useToggleRecipeSharing = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ cookierRelationId, currentlySharing }: { cookierRelationId: string; currentlySharing: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      // First, get the cookier relation to know if I'm user_id or cookier_id
      const { data: relation, error: fetchError } = await supabase
        .from('cookiers')
        .select('user_id, cookier_id')
        .eq('id', cookierRelationId)
        .single();

      if (fetchError) throw fetchError;

      const isRequester = relation.user_id === user.id;
      const updateField = isRequester ? 'user_shares_recipes' : 'cookier_shares_recipes';

      const { error } = await supabase
        .from('cookiers')
        .update({ [updateField]: !currentlySharing })
        .eq('id', cookierRelationId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cookiers'] });
      toast.success(variables.currentlySharing ? 'Partage désactivé' : 'Partage activé');
    },
    onError: () => {
      toast.error('Erreur lors de la modification du partage');
    },
  });
};
