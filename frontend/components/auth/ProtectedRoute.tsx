'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { useBackendStatus } from '@/lib/api/backendStatus';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ children, redirectTo = '/auth' }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const backendStatus = useBackendStatus();
  const offline = backendStatus === 'offline';

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