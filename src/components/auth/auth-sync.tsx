"use client";

import { useAuthSync } from "@/lib/hooks/use-auth-sync";

export function AuthSync({ children }: { children: React.ReactNode }) {
  useAuthSync();
  return <>{children}</>;
}
