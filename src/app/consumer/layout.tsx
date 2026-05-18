"use client";

import type { ReactNode } from "react";

import { ConsumerAuthGate, ConsumerConsoleShell } from "@/features/consumer";

interface ConsumerLayoutProps {
  children: ReactNode;
}

export default function ConsumerLayout({ children }: ConsumerLayoutProps) {
  return (
    <ConsumerAuthGate>
      <ConsumerConsoleShell>{children}</ConsumerConsoleShell>
    </ConsumerAuthGate>
  );
}
