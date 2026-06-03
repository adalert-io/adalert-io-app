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
  const iconStyle = bottomBorderColor
    ? {
        color: bottomBorderColor,
        backgroundColor: `${bottomBorderColor}22`,
      }
    : undefined;

  const iconClass = cn(
    "flex shrink-0 items-center justify-center rounded-full",
    !bottomBorderColor && (accentClassName ?? "bg-[#3b82f6]/10 text-[#3b82f6]"),
  );

  return (
    <Card
      className={cn(
        "gap-0 rounded-xl border border-slate-200 bg-white py-0 shadow-sm",
        bottomBorderColor && "border-b-2",
      )}
      style={bottomBorderColor ? { borderBottomColor: bottomBorderColor } : undefined}
    >
      <CardContent className="px-2.5 py-2.5 sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium leading-tight text-muted-foreground sm:text-sm">
            {title}
          </p>
          <div className="mt-1 flex items-center justify-between gap-2 sm:mt-0.5">
            <p className="truncate text-[22px] font-bold leading-none tracking-tight text-slate-900 sm:text-[28px]">
              {value}
            </p>
            <span
              className={cn("size-8 sm:hidden", iconClass)}
              style={iconStyle}
            >
              <Icon className="size-4" strokeWidth={1.85} aria-hidden />
            </span>
          </div>
          {subtitle ? (
            <p className="mt-1 hidden text-[13px] font-medium leading-snug text-slate-500 sm:block">
              {subtitle}
            </p>
          ) : null}
        </div>
        <span
          className={cn("hidden size-12 sm:flex", iconClass)}
          style={iconStyle}
        >
          <Icon className="size-6" strokeWidth={1.85} aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}
