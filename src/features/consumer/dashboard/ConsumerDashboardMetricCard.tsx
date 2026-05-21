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
        "flex min-h-[108px] justify-center gap-0 rounded-xl border border-slate-200 bg-white py-0 shadow-sm sm:min-h-[132px]",
        bottomBorderColor && "border-b-2",
      )}
      style={bottomBorderColor ? { borderBottomColor: bottomBorderColor } : undefined}
    >
      <CardContent className="flex flex-1 flex-col justify-between gap-2 px-2.5 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6 sm:py-5">
        <div className="min-w-0 space-y-0.5 sm:space-y-1">
          <p className="text-[10px] font-medium leading-tight text-muted-foreground sm:text-sm">
            {title}
          </p>
          <p className="truncate text-[22px] font-bold leading-none tracking-tight text-slate-900 sm:text-[28px]">
            {value}
          </p>
          {subtitle ? (
            <p className="line-clamp-2 text-[9px] font-medium leading-snug text-slate-500 sm:line-clamp-none sm:text-[13px]">
              {subtitle}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center self-end rounded-full sm:size-12 sm:self-auto",
            !bottomBorderColor &&
              (accentClassName ?? "bg-[#3b82f6]/10 text-[#3b82f6]"),
          )}
          style={
            bottomBorderColor
              ? {
                  color: bottomBorderColor,
                  backgroundColor: `${bottomBorderColor}22`,
                }
              : undefined
          }
        >
          <Icon className="size-4 sm:size-6" strokeWidth={1.85} aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}
