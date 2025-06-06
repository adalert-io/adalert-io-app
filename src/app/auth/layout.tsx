"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { auth } from "@/lib/firebase/config";
import { onAuthStateChanged } from "firebase/auth";

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
  } = useAuthStore();
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
  ]);

  // Show nothing while checking auth state
  if (isLoading) {
    return null;
  }

  return <>{children}</>;
}
