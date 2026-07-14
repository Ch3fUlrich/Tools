'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { isBackendOffline } from '@/lib/api/backendStatus';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ children, redirectTo = '/auth' }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Check if offline status changes
    setOffline(isBackendOffline());
    
    // Periodically recheck offline status for reactive UI if needed, 
    // but the main check is at mount/render.
    const interval = setInterval(() => setOffline(isBackendOffline()), 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !offline) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo, offline]);

  if (isLoading && !offline) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated && !offline) {
    return null;
  }

  return <>{children}</>;
}