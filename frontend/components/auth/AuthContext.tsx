'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { logoutUser, getUserProfile } from '@/lib/api/client';

interface User {
  id: string;
  email: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // login accepts an optional `remember` flag; when true user is stored in localStorage, otherwise sessionStorage
  login: (user: User, remember?: boolean) => void;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const login = (userData: User, remember = false) => {
    setUser(userData);
    try {
      // If user chose "remember", persist in localStorage; otherwise use sessionStorage
      if (remember) {
        localStorage.setItem('auth_user', JSON.stringify(userData));
      } else {
        sessionStorage.setItem('auth_user', JSON.stringify(userData));
      }
    } catch (err) {
      // Storage may be unavailable in some environments; ignore failures but log for debugging
      /* eslint-disable-next-line no-console */
      console.warn('Could not persist auth_user:', err);
    }
  };

  const clearUser = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem('auth_user');
      sessionStorage.removeItem('auth_user');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      // ignore
    }
  }, []);

  const logout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      /* eslint-disable-next-line no-console */
      console.error('Logout error:', error);
    } finally {
      clearUser();
    }
  };

  const refreshAuth = async () => {
    try {
      // Prefer sessionStorage (session-limited). If not present, fall back to localStorage.
      const s = sessionStorage.getItem('auth_user');
      const l = localStorage.getItem('auth_user');
      const stored = s ?? l;

      if (stored) {
        const userData = JSON.parse(stored);
        setUser(userData);

        // Validate the session against the backend (best-effort).
        // If the backend rejects (401), clear the stale local data.
        try {
          const profile = await getUserProfile();
          if (profile?.id) {
            // Update with authoritative backend data
            const verified: User = {
              id: profile.id,
              email: profile.email,
              created_at: profile.created_at,
            };
            setUser(verified);
            // Re-persist the verified data
            if (s) sessionStorage.setItem('auth_user', JSON.stringify(verified));
            if (l) localStorage.setItem('auth_user', JSON.stringify(verified));
          }
        } catch {
          // Backend unreachable or session invalid — keep showing stored user
          // but don't clear it (the backend may just be offline in static mode)
        }
      }
    } catch (error) {
      /* eslint-disable-next-line no-console */
      console.error('Error refreshing auth:', error);
      clearUser();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for 401 events from the API client to auto-clear stale sessions
  useEffect(() => {
    const handleSessionExpired = () => clearUser();
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [clearUser]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
