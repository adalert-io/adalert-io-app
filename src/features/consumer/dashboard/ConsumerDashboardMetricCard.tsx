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
        "h-auto gap-0 rounded-xl border border-slate-200 bg-white py-0 shadow-sm",
        bottomBorderColor && "border-b-2",
      )}
      style={bottomBorderColor ? { borderBottomColor: bottomBorderColor } : undefined}
    >
      <CardContent className="flex items-center justify-between gap-1.5 px-2 py-2 sm:gap-4 sm:px-6 sm:py-5">
        <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1">
          <p className="text-[10px] font-medium leading-tight text-muted-foreground sm:text-sm">
            {title}
          </p>
          <p className="truncate text-[20px] font-bold leading-none tracking-tight text-slate-900 sm:text-[28px]">
            {value}
          </p>
          {subtitle ? (
            <p className="hidden text-[13px] font-medium leading-snug text-slate-500 sm:block">
              {subtitle}
            </p>
          ) : null}
        </div>
        <span
          className={cn("size-7 shrink-0 sm:size-12", iconClass)}
          style={iconStyle}
        >
          <Icon
            className="size-3.5 sm:size-6"
            strokeWidth={1.85}
            aria-hidden
          />
        </span>
      </CardContent>
    </Card>
  );
}
