"use client";

import type { ReactNode } from "react";

import { usePathname } from "next/navigation";

import { AdminConsoleShell } from "@/features/administrator/AdminConsoleShell";

interface AdministratorLayoutProps {
  children: ReactNode;
}

export default function AdministratorLayout({ children }: AdministratorLayoutProps) {
  const pathname = usePathname();

  if (pathname?.startsWith("/administrator/login")) {
    return children;
  }

  return <AdminConsoleShell>{children}</AdminConsoleShell>;
}
