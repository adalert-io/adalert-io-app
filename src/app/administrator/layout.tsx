import type { ReactNode } from "react";

import { AdminConsoleShell } from "@/features/administrator/AdminConsoleShell";

interface AdministratorLayoutProps {
  children: ReactNode;
}

export default function AdministratorLayout({ children }: AdministratorLayoutProps) {
  return <AdminConsoleShell>{children}</AdminConsoleShell>;
}
