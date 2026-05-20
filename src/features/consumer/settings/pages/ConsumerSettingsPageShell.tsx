"use client";

import type { ReactNode } from "react";

import { consumerSettingsPageWidth } from "@/features/consumer/settings/consumer-settings-styles";
import { cn } from "@/lib/utils";

interface ConsumerSettingsPageShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function ConsumerSettingsPageShell({
  title,
  description,
  children,
}: ConsumerSettingsPageShellProps) {
  return (
    <div className={cn(consumerSettingsPageWidth, "flex flex-1 flex-col gap-6 pb-8")}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-2">
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 sm:text-[30px]">
            {title}
          </h1>
          <p className="text-[15px] text-[#7A7D9C]">{description}</p>
        </div>
      </header>

      <section>{children}</section>
    </div>
  );
}
