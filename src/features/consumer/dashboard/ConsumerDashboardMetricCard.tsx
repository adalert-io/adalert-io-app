"use client";

import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ConsumerDashboardMetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  Icon: LucideIcon;
  accentClassName?: string;
  /** 2px bottom accent — matches classic dashboard severity colors */
  bottomBorderColor?: string;
}

export function ConsumerDashboardMetricCard({
  title,
  value,
  subtitle,
  Icon,
  accentClassName,
  bottomBorderColor,
}: ConsumerDashboardMetricCardProps) {
  return (
    <Card
      className={cn(
        "flex min-h-[132px] justify-center gap-0 rounded-xl border border-slate-200 bg-white py-0 shadow-sm",
        bottomBorderColor && "border-b-2",
      )}
      style={bottomBorderColor ? { borderBottomColor: bottomBorderColor } : undefined}
    >
      <CardContent className="flex flex-1 items-center justify-between gap-4 px-6 py-5">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="truncate text-[28px] font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {subtitle ? (
            <p className="text-[13px] font-medium text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-full",
            accentClassName ?? "bg-[#3b82f6]/10 text-[#3b82f6]",
          )}
        >
          <Icon className="size-6" strokeWidth={1.85} aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}
