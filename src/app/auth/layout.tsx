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
    userDoc,
    isInitializing,
    isGoogleOAuthRedirect,
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
        // This will also fetch user ads accounts
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

  // Show loading while checking auth state or initializing
  // Don't show loading during Google OAuth redirect to prevent overriding redirect page
  if (isLoading || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafbfe]">
        <div className="bg-white rounded-2xl shadow-lg px-12 py-10 flex flex-col items-center w-full max-w-md">
          <div className="flex items-center mb-8">
            <img
              src="/images/adalert-logo.avif"
              alt="adAlert.io logo"
              width={48}
              height={48}
              className="mr-3"
            />
            <span className="text-2xl font-semibold text-[#1a2e49] tracking-tight">
              adAlert.io
            </span>
          </div>
          <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mb-6"></div>
          <p className="text-lg text-gray-500 text-center">
            {isGoogleOAuthRedirect ? 'Completing Google sign-in...' : 
             isInitializing ? 'Setting up your account...' : 'Loading...'}
          </p>
          {(isInitializing || isGoogleOAuthRedirect) && (
            <div className="mt-4 text-sm text-gray-400 text-center">
              Please wait while we prepare your dashboard
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
