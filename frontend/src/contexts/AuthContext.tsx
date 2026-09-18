import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/apiClient';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  profile_image: string | null;
  is_admin: boolean;
  student_id?: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (googleCredential: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    try {
      const data = await api.get<{ authenticated: boolean; user: AuthUser }>('/api/auth/me');
      if (data.authenticated && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        setIsAdmin(!!data.user.is_admin);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    
    // Listen for custom event to trigger refresh across tabs/components
    const handleAuthChange = () => {
      checkAuth();
    };
    window.addEventListener('auth-change', handleAuthChange);
    
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  const login = async (googleCredential: string) => {
    setIsLoading(true);
    try {
      const data = await api.post<{ status: string; user?: AuthUser; message?: string }>('/api/auth/google', {
        id_token: googleCredential,
      });
      if (data.status === 'success' && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        setIsAdmin(!!data.user.is_admin);
        window.dispatchEvent(new Event('auth-change'));
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Best-effort — clear the HttpOnly cookie server-side
      await api.post('/api/auth/logout');
    } catch (_) {
      // Ignore backend errors — we still log out locally
    } finally {
      // Always clear local auth state
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setIsLoading(false);
      window.dispatchEvent(new Event('auth-change'));
      // Hard reload to home so Google One Tap resets and no stale state remains
      window.location.href = '/';
    }
  };

  const refreshAuth = async () => {
    setIsLoading(true);
    await checkAuth();
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isAdmin, isLoading, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
