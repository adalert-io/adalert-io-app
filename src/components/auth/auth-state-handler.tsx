'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { resetSessionStores } from '@/lib/store/reset-session-stores';

export function AuthStateHandler() {
  const router = useRouter();
  const {
    setUser,
    setUserDoc,
    setSubscription,
    setRouter,
    checkSubscriptionStatus,
    handlePostAuthNavigation,
  } = useAuthStore();

  useEffect(() => {
    // Set router instance in auth store
    setRouter(router);

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const previousUid = useAuthStore.getState().user?.uid;

      if (!firebaseUser) {
        resetSessionStores();
        setUser(null);
        setUserDoc(null);
        setSubscription(null);
        return;
      }

      // Different user signed in without a full page reload — drop prior session data
      if (previousUid && previousUid !== firebaseUser.uid) {
        resetSessionStores();
      }

      setUser(firebaseUser);
      await checkSubscriptionStatus(firebaseUser.uid);
      await handlePostAuthNavigation();
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [
    router,
    setRouter,
    setUser,
    setUserDoc,
    setSubscription,
    checkSubscriptionStatus,
    handlePostAuthNavigation,
  ]);

  // This component doesn't render anything
  return null;
}
