import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function fetchAdminData<T>(resource: string, token: string): Promise<T[]> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/admin-data?resource=${resource}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'x-admin-token': token,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch data');
  }

  const result = await response.json();
  return result.data || [];
}

async function adminMutation(action: string, data: Record<string, unknown>, token: string): Promise<void> {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/admin-data`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'x-admin-token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...data }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to perform action');
  }
}

export interface AdminRecipe {
  id: string;
  title: string;
  image_url: string | null;
  price_level: string | null;
  difficulty: string | null;
  diet: string | null;
  owner_id: string;
  family_id: string | null;
  origin: { id: string; name: string; emoji: string | null } | null;
  tags: Array<{ tag: { id: string; name: string } }>;
}

export interface AdminProduct {
  id: string;
  name: string;
  user_id: string | null;
  family_id: string | null;
  aisle: { id: string; name: string; icon: string | null } | null;
  unit: { id: string; name: string; abbreviation: string | null } | null;
}

export interface AdminUser {
  id: string;
  username: string | null;
  email: string | null;
  diet: string | null;
  avatar_url: string | null;
  family: { id: string; name: string } | null;
}

export interface AdminProfile {
  id: string;
  username: string | null;
}

export interface AdminFamily {
  id: string;
  name: string;
}

export interface AdminOrigin {
  id: string;
  name: string;
  emoji: string | null;
}

export interface AdminTag {
  id: string;
  name: string;
}

export interface AdminAisle {
  id: string;
  name: string;
  icon: string | null;
}

export interface AdminUnit {
  id: string;
  name: string;
  abbreviation: string | null;
}

export const useAdminRecipes = () => {
  const { adminToken } = useAdminAuth();
  
  return useQuery({
    queryKey: ['admin-recipes'],
    queryFn: () => fetchAdminData<AdminRecipe>('recipes', adminToken!),
    enabled: !!adminToken,
  });
};

export const useAdminProducts = () => {
  const { adminToken } = useAdminAuth();
  
  return useQuery({
    queryKey: ['admin-products'],
    queryFn: () => fetchAdminData<AdminProduct>('products', adminToken!),
    enabled: !!adminToken,
  });
};

export const useAdminUsers = () => {
  const { adminToken } = useAdminAuth();
  
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: () => fetchAdminData<AdminUser>('users', adminToken!),
    enabled: !!adminToken,
  });
};

export const useAdminProfiles = () => {
  const { adminToken } = useAdminAuth();
  
  return useQuery({
    queryKey: ['admin-profiles'],
    queryFn: () => fetchAdminData<AdminProfile>('profiles', adminToken!),
    enabled: !!adminToken,
  });
};

export const useAdminFamilies = () => {
  const { adminToken } = useAdminAuth();
  
  return useQuery({
    queryKey: ['admin-families'],
    queryFn: () => fetchAdminData<AdminFamily>('families', adminToken!),
    enabled: !!adminToken,
  });
};

export const useAdminOrigins = () => {
  const { adminToken } = useAdminAuth();
  
  return useQuery({
    queryKey: ['admin-origins'],
    queryFn: () => fetchAdminData<AdminOrigin>('origins', adminToken!),
    enabled: !!adminToken,
  });
};

export const useAdminTags = () => {
  const { adminToken } = useAdminAuth();
  
  return useQuery({
    queryKey: ['admin-tags'],
    queryFn: () => fetchAdminData<AdminTag>('tags', adminToken!),
    enabled: !!adminToken,
  });
};

export const useAdminAisles = () => {
  const { adminToken } = useAdminAuth();
  
  return useQuery({
    queryKey: ['admin-aisles'],
    queryFn: () => fetchAdminData<AdminAisle>('aisles', adminToken!),
    enabled: !!adminToken,
  });
};

export const useAdminUnits = () => {
  const { adminToken } = useAdminAuth();
  
  return useQuery({
    queryKey: ['admin-units'],
    queryFn: () => fetchAdminData<AdminUnit>('units', adminToken!),
    enabled: !!adminToken,
  });
};

// Mutation: Convert product to global
export const useAdminConvertToGlobal = () => {
  const { adminToken } = useAdminAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => adminMutation('convertToGlobal', { productId }, adminToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Produit converti en global');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la conversion');
    },
  });
};

// Mutation: Update product
export const useAdminUpdateProduct = () => {
  const { adminToken } = useAdminAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { productId: string; name: string; aisle_id: string | null; unit_id: string | null }) => 
      adminMutation('updateProduct', data, adminToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Produit mis à jour');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });
};

export interface AdminSeasonalProduct {
  id: string;
  name: string;
  aisle: { id: string; name: string; icon: string | null } | null;
  product_seasons: { month: number }[];
}

export const useAdminSeasonalProducts = () => {
  const { adminToken } = useAdminAuth();
  
  return useQuery({
    queryKey: ['admin-seasonal-products'],
    queryFn: () => fetchAdminData<AdminSeasonalProduct>('seasonalProducts', adminToken!),
    enabled: !!adminToken,
  });
};

// Mutation: Update product seasons
export const useAdminUpdateProductSeasons = () => {
  const { adminToken } = useAdminAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { productId: string; months: number[] }) => 
      adminMutation('updateProductSeasons', data, adminToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seasonal-products'] });
      toast.success('Mois de saison mis à jour');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });
};
