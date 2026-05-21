"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { ConsumerAuthGate, ConsumerConsoleShell } from "@/features/consumer";
import { intercomService } from "@/lib/intercom";

interface ConsumerLayoutProps {
  children: ReactNode;
}

export default function ConsumerLayout({ children }: ConsumerLayoutProps) {
  const pathname = usePathname();

  useEffect(() => {
    document.body.dataset.consumerShell = "true";
    intercomService.hide();
    intercomService.shutdown();

    return () => {
      delete document.body.dataset.consumerShell;
    };
  }, []);

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
