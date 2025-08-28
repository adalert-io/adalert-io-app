'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { SUBSCRIPTION_STATUS } from '@/lib/constants';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isFullAccess } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isFullAccess) {
      router.push('/settings/account/billing');
    }
  }, [isFullAccess, router]);

  return <>{children}</>;
}
