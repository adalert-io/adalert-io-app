"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuthStore } from "@/lib/store/auth-store";

import {
  CONSUMER_BILLING_HREF,
  isConsumerPathAllowedWithoutFullAccess,
} from "./consumer-subscription-access";

interface ConsumerAuthGateProps {
  children: React.ReactNode;
}

/**
 * Requires sign-in. Without full access (expired trial, etc.), only billing is
 * reachable — same behavior as classic `ProtectedRoute` + settings layout.
 */
export function ConsumerAuthGate({ children }: ConsumerAuthGateProps) {
  const { user, loading, isInitializing, isFullAccess } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname() ?? "";

  useEffect(() => {
    if (loading || isInitializing) return;

    if (!user) {
      router.push("/auth");
      return;
    }

    if (!isFullAccess && !isConsumerPathAllowedWithoutFullAccess(pathname)) {
      router.replace(CONSUMER_BILLING_HREF);
    }
  }, [user, loading, isInitializing, isFullAccess, pathname, router]);

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

  if (!isFullAccess && !isConsumerPathAllowedWithoutFullAccess(pathname)) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#f8fafc] text-sm text-muted-foreground">
        Redirecting to billing…
      </div>
    );
  }

  return <>{children}</>;
}
