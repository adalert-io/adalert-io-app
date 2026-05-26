"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

import { ConsumerAuthGate, ConsumerConsoleShell } from "@/features/consumer";
import { intercomService } from "@/lib/intercom";

interface ConsumerLayoutProps {
  children: ReactNode;
}

export default function ConsumerLayout({ children }: ConsumerLayoutProps) {
  useEffect(() => {
    document.body.dataset.consumerShell = "true";
    intercomService.hide();
    intercomService.shutdown();

    return () => {
      delete document.body.dataset.consumerShell;
    };
  }, []);

  return (
    <ConsumerAuthGate>
      <ConsumerConsoleShell>{children}</ConsumerConsoleShell>
    </ConsumerAuthGate>
  );
}
