import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useUserRole = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // No role found means regular user
        if (error.code === 'PGRST116') {
          return 'user';
        }
        throw error;
      }
      return data?.role || 'user';
    },
    enabled: !!user,
  });
};

export const useIsAdmin = () => {
  const { data: role, isLoading } = useUserRole();
  return {
    isAdmin: role === 'admin',
    isLoading,
  };
};

// Check if user can manage admins (only benoit.valkenberg@gmail.com)
export const useCanManageAdmins = () => {
  const { user } = useAuth();
  return user?.email === 'benoit.valkenberg@gmail.com';
};

// Check if a specific user is admin
export const useCheckUserIsAdmin = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-role', userId],
    queryFn: async () => {
      if (!userId) return false;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!userId,
  });
};

// Get admin status for multiple users
export const useUsersAdminStatus = (userIds: string[]) => {
  return useQuery({
    queryKey: ['users-admin-status', userIds],
    queryFn: async () => {
      if (!userIds.length) return new Map<string, boolean>();

      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)
        .eq('role', 'admin');

      if (error) throw error;

      const adminMap = new Map<string, boolean>();
      userIds.forEach(id => adminMap.set(id, false));
      data?.forEach(row => adminMap.set(row.user_id, true));
      
      return adminMap;
    },
    enabled: userIds.length > 0,
  });
};

// Promote user to admin
export const usePromoteToAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['user-role'] });
      queryClient.invalidateQueries({ queryKey: ['users-admin-status'] });
      toast.success('Utilisateur promu admin');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Cet utilisateur est déjà admin');
      } else {
        toast.error('Erreur lors de la promotion');
      }
    },
  });
};

// Demote user from admin
export const useDemoteFromAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-role'] });
      queryClient.invalidateQueries({ queryKey: ['users-admin-status'] });
      toast.success('Droits admin retirés');
    },
    onError: () => {
      toast.error('Erreur lors du retrait des droits');
    },
  });
};
