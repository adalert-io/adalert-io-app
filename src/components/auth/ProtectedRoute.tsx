"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { SUBSCRIPTION_STATUS } from "@/lib/constants";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { subscription } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (subscription) {
      const status = subscription["User Status"];
      const isExpired =
        status === SUBSCRIPTION_STATUS.TRIAL_ENDED ||
        status === SUBSCRIPTION_STATUS.CANCELED ||
        status === SUBSCRIPTION_STATUS.PAYMENT_FAILED;

      if (isExpired) {
        router.push("/settings/account/billing");
      }
    }
  }, [subscription, router]);

  return <>{children}</>;
}
