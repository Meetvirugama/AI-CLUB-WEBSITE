/**
 * useAuth.ts
 * ----------
 * Shared hook that checks the current user's auth state by calling
 * GET /api/auth/me. Returns { user, isAuthenticated, isAdmin, isLoading }.
 *
 * This follows the same pattern already used by Navbar.tsx and AuthBarrier.tsx,
 * extracted into a reusable hook to avoid code duplication.
 */

import { useState, useEffect } from 'react';
import { getApiUrl } from '../lib/api';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  profile_image: string | null;
  is_admin: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isAdmin: false,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(getApiUrl('/api/auth/me'), {
          credentials: 'include',
          headers,
        });

        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setState({
              user: data.user,
              isAuthenticated: true,
              isAdmin: !!data.user.is_admin,
              isLoading: false,
            });
            return;
          }
        }
      } catch (_) {
        // Network error or unauthenticated — treat as logged out
      }

      if (!cancelled) {
        setState({ user: null, isAuthenticated: false, isAdmin: false, isLoading: false });
      }
    };

    checkAuth();
    return () => { cancelled = true; };
  }, []);

  return state;
}
