"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/lib/store/auth-store";

interface ConsumerAuthGateProps {
  children: React.ReactNode;
}

/**
 * Requires a signed-in user only (no subscription / billing redirect).
 * Use for the consumer console so preview and limited-access users can browse.
 */
export function ConsumerAuthGate({ children }: ConsumerAuthGateProps) {
  const { user, loading, isInitializing } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (loading || isInitializing) return;
    if (!user) {
      router.push("/auth");
    }
  }, [user, loading, isInitializing, router]);

  if (loading || isInitializing) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#f8fafc] text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#f8fafc] text-sm text-muted-foreground">
        Redirecting to sign in…
      </div>
    );
  }

  return <>{children}</>;
}
