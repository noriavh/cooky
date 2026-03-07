import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  adminToken: string | null;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ADMIN_TOKEN_KEY = 'admin_session_token';
const ADMIN_EXPIRES_KEY = 'admin_session_expires';

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  // Check existing session on mount
  useEffect(() => {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    const expiresAt = sessionStorage.getItem(ADMIN_EXPIRES_KEY);

    if (token && expiresAt) {
      const expiry = parseInt(expiresAt, 10);
      if (Date.now() < expiry) {
        setAdminToken(token);
        setIsAdminAuthenticated(true);
      } else {
        // Token expired, clean up
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        sessionStorage.removeItem(ADMIN_EXPIRES_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { password },
      });

      if (error) {
        return { success: false, error: 'Erreur de connexion' };
      }

      if (data.error) {
        return { success: false, error: data.error === 'Invalid password' ? 'Mot de passe incorrect' : data.error };
      }

      if (data.success && data.token) {
        sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token);
        sessionStorage.setItem(ADMIN_EXPIRES_KEY, String(data.expiresAt));
        setAdminToken(data.token);
        setIsAdminAuthenticated(true);
        return { success: true };
      }

      return { success: false, error: 'Erreur inattendue' };
    } catch (err) {
      console.error('Admin login error:', err);
      return { success: false, error: 'Erreur de connexion au serveur' };
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_EXPIRES_KEY);
    setAdminToken(null);
    setIsAdminAuthenticated(false);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ isAdminAuthenticated, isLoading, login, logout, adminToken }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
