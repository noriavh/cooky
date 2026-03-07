import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

export type Family = Tables<'families'>;
export type FamilyMember = Tables<'family_members'> & {
  profile?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
};
export type FamilyInvitation = Tables<'family_invitations'> & {
  profile?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
  family?: Family | null;
};

// Get user's family (if any)
export const useUserFamily = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-family', user?.id],
    queryFn: async (): Promise<Family | null> => {
      if (!user) return null;

      // Check if user is in a family
      const { data: membership, error: membershipError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership) return null;

      // Get family details
      const { data: family, error: familyError } = await supabase
        .from('families')
        .select('*')
        .eq('id', membership.family_id)
        .single();

      if (familyError) throw familyError;
      return family as Family;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Get family members
export const useFamilyMembers = (familyId: string | undefined) => {
  return useQuery({
    queryKey: ['family-members', familyId],
    queryFn: async () => {
      if (!familyId) return [];

      const { data: members, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', familyId);

      if (error) throw error;

      // Get profiles for all members
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      return members.map(member => ({
        ...member,
        profile: profiles?.find(p => p.id === member.user_id) || null,
      })) as FamilyMember[];
    },
    enabled: !!familyId,
  });
};

// Get pending family invitations for current user
export const usePendingFamilyInvitations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['family-invitations', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: invitations, error } = await supabase
        .from('family_invitations')
        .select('*')
        .eq('invited_user_id', user.id);

      if (error) throw error;

      if (!invitations || invitations.length === 0) return [];

      // Get inviter profiles and family info
      const inviterIds = invitations.map(i => i.invited_by);
      const familyIds = invitations.map(i => i.family_id);

      const [profilesResult, familiesResult] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_url').in('id', inviterIds),
        supabase.from('families').select('*').in('id', familyIds),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (familiesResult.error) throw familiesResult.error;

      return invitations.map(invitation => ({
        ...invitation,
        profile: profilesResult.data?.find(p => p.id === invitation.invited_by) || null,
        family: familiesResult.data?.find(f => f.id === invitation.family_id) || null,
      })) as FamilyInvitation[];
    },
    enabled: !!user,
  });
};

// Create a new family
export const useCreateFamily = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Not authenticated');

      // Create the family
      const { data: family, error: familyError } = await supabase
        .from('families')
        .insert({ name, created_by: user.id })
        .select()
        .single();

      if (familyError) throw familyError;

      // Add the creator as a member
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({ family_id: family.id, user_id: user.id });

      if (memberError) throw memberError;

      // Transfer user's data to family
      await transferDataToFamily(user.id, family.id);

      return family;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-family'] });
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe-lists'] });
      queryClient.invalidateQueries({ queryKey: ['shopping-products'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Famille créée avec succès !');
    },
    onError: () => {
      toast.error('Erreur lors de la création de la famille');
    },
  });
};

// Transfer user's data to family
const transferDataToFamily = async (userId: string, familyId: string) => {
  // Transfer recipes
  await supabase
    .from('recipes')
    .update({ family_id: familyId })
    .eq('owner_id', userId)
    .is('family_id', null);

  // Transfer recipe lists
  await supabase
    .from('recipe_lists')
    .update({ family_id: familyId })
    .eq('owner_id', userId)
    .is('family_id', null);

  // Transfer shopping products
  await supabase
    .from('shopping_products')
    .update({ family_id: familyId })
    .eq('user_id', userId)
    .is('family_id', null);

  // Transfer tags
  await supabase
    .from('tags')
    .update({ family_id: familyId })
    .eq('created_by', userId)
    .is('family_id', null);

  // Delete shopping list items (they're lost when joining family)
  await supabase
    .from('shopping_list_items')
    .delete()
    .eq('user_id', userId);

  // Delete meal plans (they're lost when joining family)
  await supabase
    .from('meal_plans')
    .delete()
    .eq('user_id', userId);
};

// Invite user to family
export const useInviteToFamily = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ familyId, invitedUserId }: { familyId: string; invitedUserId: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('family_invitations')
        .insert({
          family_id: familyId,
          invited_by: user.id,
          invited_user_id: invitedUserId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-invitations'] });
      toast.success('Invitation envoyée !');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Cet utilisateur a déjà été invité');
      } else {
        toast.error('Erreur lors de l\'envoi de l\'invitation');
      }
    },
  });
};

// Remove cookier relationships between a user and all family members
const removeCookierRelationshipsWithFamily = async (userId: string, familyId: string) => {
  // Get all family members
  const { data: familyMembers, error: membersError } = await supabase
    .from('family_members')
    .select('user_id')
    .eq('family_id', familyId);

  if (membersError) throw membersError;

  const familyMemberIds = familyMembers?.map(m => m.user_id) || [];

  if (familyMemberIds.length === 0) return;

  // Delete all cookier relationships between the new member and existing family members
  // Case 1: User is user_id and family member is cookier_id
  await supabase
    .from('cookiers')
    .delete()
    .eq('user_id', userId)
    .in('cookier_id', familyMemberIds);

  // Case 2: User is cookier_id and family member is user_id
  await supabase
    .from('cookiers')
    .delete()
    .eq('cookier_id', userId)
    .in('user_id', familyMemberIds);
};

// Accept family invitation
export const useAcceptFamilyInvitation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Get invitation details
      const { data: invitation, error: invError } = await supabase
        .from('family_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (invError) throw invError;

      // Remove cookier relationships between user and family members
      await removeCookierRelationshipsWithFamily(user.id, invitation.family_id);

      // Add user to family
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({ family_id: invitation.family_id, user_id: user.id });

      if (memberError) throw memberError;

      // Transfer user's data to family
      await transferDataToFamily(user.id, invitation.family_id);

      // Delete the invitation
      await supabase.from('family_invitations').delete().eq('id', invitationId);

      return invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-family'] });
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      queryClient.invalidateQueries({ queryKey: ['family-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe-lists'] });
      queryClient.invalidateQueries({ queryKey: ['shopping-products'] });
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
      queryClient.invalidateQueries({ queryKey: ['meal-plans'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['cookiers'] });
      toast.success('Vous avez rejoint la famille !');
    },
    onError: () => {
      toast.error('Erreur lors de l\'acceptation de l\'invitation');
    },
  });
};

// Reject family invitation
export const useRejectFamilyInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('family_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-invitations'] });
      toast.success('Invitation refusée');
    },
    onError: () => {
      toast.error('Erreur lors du refus de l\'invitation');
    },
  });
};

// Remove member from family
export const useRemoveFamilyMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, userId }: { memberId: string; userId: string }) => {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      toast.success('Membre retiré de la famille');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du membre');
    },
  });
};

// Leave family (with data copy)
export const useLeaveFamily = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (familyId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Get family's data to copy
      const [recipesResult, listsResult, productsResult, tagsResult] = await Promise.all([
        supabase.from('recipes').select('*').eq('family_id', familyId),
        supabase.from('recipe_lists').select('*').eq('family_id', familyId),
        supabase.from('shopping_products').select('*').eq('family_id', familyId),
        supabase.from('tags').select('*').eq('family_id', familyId),
      ]);

      // Copy recipes
      if (recipesResult.data && recipesResult.data.length > 0) {
        const recipesCopy = recipesResult.data.map(({ id, family_id, ...r }) => ({
          ...r,
          owner_id: user.id,
          family_id: null,
        }));
        await supabase.from('recipes').insert(recipesCopy);
      }

      // Copy recipe lists
      if (listsResult.data && listsResult.data.length > 0) {
        const listsCopy = listsResult.data.map(({ id, family_id, ...l }) => ({
          ...l,
          owner_id: user.id,
          family_id: null,
        }));
        await supabase.from('recipe_lists').insert(listsCopy);
      }

      // Copy shopping products
      if (productsResult.data && productsResult.data.length > 0) {
        const productsCopy = productsResult.data.map(({ id, family_id, ...p }) => ({
          ...p,
          user_id: user.id,
          family_id: null,
        }));
        await supabase.from('shopping_products').insert(productsCopy);
      }

      // Copy tags
      if (tagsResult.data && tagsResult.data.length > 0) {
        const tagsCopy = tagsResult.data.map(({ id, family_id, ...t }) => ({
          ...t,
          created_by: user.id,
          family_id: null,
        }));
        await supabase.from('tags').insert(tagsCopy);
      }

      // Remove user from family
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('family_id', familyId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-family'] });
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe-lists'] });
      queryClient.invalidateQueries({ queryKey: ['shopping-products'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Vous avez quitté la famille. Vos données ont été copiées.');
    },
    onError: () => {
      toast.error('Erreur lors du départ de la famille');
    },
  });
};

// Update family name
export const useUpdateFamilyName = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ familyId, name }: { familyId: string; name: string }) => {
      const { data, error } = await supabase
        .from('families')
        .update({ name })
        .eq('id', familyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-family'] });
      toast.success('Nom de la famille modifié');
    },
    onError: () => {
      toast.error('Erreur lors de la modification');
    },
  });
};
