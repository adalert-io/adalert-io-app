'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

export function AuthStateHandler() {
  const router = useRouter();
  const {
    setUser,
    setRouter,
    checkSubscriptionStatus,
    handlePostAuthNavigation,
  } = useAuthStore();

  useEffect(() => {
    // Set router instance in auth store
    setRouter(router);

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // console.log("firebaseUser", firebaseUser);
      if (firebaseUser) {
        // Update user in store
        setUser(firebaseUser);

        // Check subscription status and handle navigation
        // This will also fetch user ads accounts
        await checkSubscriptionStatus(firebaseUser.uid);
        await handlePostAuthNavigation();
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [
    router,
    setRouter,
    setUser,
    checkSubscriptionStatus,
    handlePostAuthNavigation,
  ]);

  // This component doesn't render anything
  return null;
}
