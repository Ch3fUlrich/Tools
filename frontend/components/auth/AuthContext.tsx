'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { logoutUser } from '@/lib/api/client';

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

  const logout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      /* eslint-disable-next-line no-console */
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      try {
        localStorage.removeItem('auth_user');
        sessionStorage.removeItem('auth_user');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        // ignore
      }
    }
  };

  const refreshAuth = async () => {
    // This would typically make an API call to verify the current session
    // For now, we'll just check localStorage
    try {
      // Prefer sessionStorage (session-limited). If not present, fall back to localStorage.
      const s = sessionStorage.getItem('auth_user');
      const l = localStorage.getItem('auth_user');
      const stored = s ?? l;
      if (stored) {
        const userData = JSON.parse(stored);
        setUser(userData);
      }
    } catch (error) {
      /* eslint-disable-next-line no-console */
      console.error('Error refreshing auth:', error);
      try {
        localStorage.removeItem('auth_user');
        sessionStorage.removeItem('auth_user');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        // ignore
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

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