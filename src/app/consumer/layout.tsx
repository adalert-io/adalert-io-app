"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { ConsumerAuthGate, ConsumerConsoleShell } from "@/features/consumer";

interface ConsumerLayoutProps {
  children: ReactNode;
}

export default function ConsumerLayout({ children }: ConsumerLayoutProps) {
  const pathname = usePathname();
  const isPreviewGate =
    pathname === "/consumer/preview-gate" ||
    pathname?.startsWith("/consumer/preview-gate/");

  if (isPreviewGate) {
    return <ConsumerAuthGate>{children}</ConsumerAuthGate>;
  }

  return (
    <ConsumerAuthGate>
      <ConsumerConsoleShell>{children}</ConsumerConsoleShell>
    </ConsumerAuthGate>
  );
}
