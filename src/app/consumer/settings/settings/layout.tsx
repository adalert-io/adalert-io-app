import type { ReactNode } from "react";

/** Full-width content; each org settings view supplies its own cards (matches Summary/Dashboard). */
export default function ConsumerOrganizationSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="w-full min-w-0">{children}</div>;
}
