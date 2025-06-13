"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { auth } from "@/lib/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { useUserAdsAccountsStore } from "@/lib/store/user-ads-accounts-store";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const {
    user,
    setUser,
    setRouter,
    checkSubscriptionStatus,
    handlePostAuthNavigation,
    userDoc,
  } = useAuthStore();
  const fetchUserAdsAccounts = useUserAdsAccountsStore(
    (state) => state.fetchUserAdsAccounts
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set router instance in auth store
    setRouter(router);

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Update user in store
        setUser(firebaseUser);

        // Check subscription status and handle navigation
        await checkSubscriptionStatus(firebaseUser.uid);
        const currentUserDoc = useAuthStore.getState().userDoc;
        console.log("currentUserDoc from auth layout", currentUserDoc);
        if (currentUserDoc) {
          await fetchUserAdsAccounts(currentUserDoc);
        }
        await handlePostAuthNavigation();
      }
      setIsLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [
    router,
    setRouter,
    setUser,
    checkSubscriptionStatus,
    handlePostAuthNavigation,
    fetchUserAdsAccounts,
  ]);

  // Show nothing while checking auth state
  if (isLoading) {
    return null;
  }

  return <>{children}</>;
}
