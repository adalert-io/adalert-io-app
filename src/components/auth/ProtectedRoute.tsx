'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isFullAccess, loading, isInitializing } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Avoid redirecting while auth state is still being resolved
    if (loading || isInitializing) return;

    // If not authenticated, send to login page
    if (!user) {
      router.push('/auth');
      return;
    }

    // If authenticated but without full access, send to billing
    if (!isFullAccess) {
      router.push('/settings/account/billing');
    }
  }, [user, isFullAccess, loading, isInitializing, router]);

  return <>{children}</>;
}
