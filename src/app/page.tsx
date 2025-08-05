"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { auth } from "@/lib/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import Image from "next/image";

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FB]">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center mb-8">
          <Image
            src="/images/adalert-logo.avif"
            alt="adAlert.io logo"
            width={48}
            height={48}
            className="mr-3"
            priority
          />
          <span className="text-2xl font-semibold text-[#1a2e49] tracking-tight">
            adAlert.io
          </span>
        </div>
        <svg
          className="animate-spin h-8 w-8 text-blue-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8z"
          />
        </svg>
        <span className="text-lg text-[#7A7D9C] font-semibold">
          Loading your profile...
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const {
    user,
    setUser,
    setRouter,
    checkSubscriptionStatus,
    handlePostAuthNavigation,
    userDoc,
    loading,
  } = useAuthStore();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Set router instance in auth store
    setRouter(router);

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Home page - firebaseUser", firebaseUser);

      if (firebaseUser) {
        // Update user in store
        setUser(firebaseUser);

        // Check subscription status and handle navigation
        // This will also fetch user ads accounts
        await checkSubscriptionStatus(firebaseUser.uid);
        await handlePostAuthNavigation();
      } else {
        // No user is signed in, redirect to auth page
        router.push("/auth");
      }

      setIsCheckingAuth(false);
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

  // Show loading spinner while checking auth state
  if (isCheckingAuth || loading || (user && !userDoc)) {
    return <LoadingFallback />;
  }

  // This should never be reached since handlePostAuthNavigation will redirect
  // But just in case, show loading
  return <LoadingFallback />;
}
