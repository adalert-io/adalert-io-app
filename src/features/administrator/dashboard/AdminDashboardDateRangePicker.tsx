"use client";

import * as React from "react";
import { endOfDay, format, startOfDay, subDays, subMonths } from "date-fns";

import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function defaultRange(): DateRange {
  const to = endOfDay(new Date());
  const from = startOfDay(subMonths(to, 7));
  return { from, to };
}

const PRESETS: Array<{ label: string; value: string; days: number | "all" }> = [
  { label: "Last 7 months", value: "7m", days: 210 },
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 14 days", value: "14d", days: 14 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 90 days", value: "90d", days: 90 },
  { label: "All Time", value: "all", days: "all" },
];

function formatDashboardRangeLabel(range: DateRange | undefined): string {
  if (!range?.from) {
    return "All Time";
  }

  const { from, to } = range;

  if (!to) {
    return format(from, "LLL d, yyyy");
  }

  if (
    from.getMonth() === to.getMonth() &&
    from.getFullYear() === to.getFullYear()
  ) {
    return `${format(from, "LLL d")} - ${format(to, "LLL d, yyyy")}`;
  }

  return `${format(from, "LLL d, yyyy")} - ${format(to, "LLL d, yyyy")}`;
}

function isSameRange(left: DateRange | undefined, right: DateRange | undefined): boolean {
  if (!left?.from || !left?.to || !right?.from || !right?.to) return false;
  return (
    left.from.toDateString() === right.from.toDateString() &&
    left.to.toDateString() === right.to.toDateString()
  );
}

export interface AdminDashboardDateRangePickerProps {
  className?: string;
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
}

export function AdminDashboardDateRangePicker({
  className,
  value,
  onChange,
}: AdminDashboardDateRangePickerProps) {
  const [internalRange, setInternalRange] = React.useState<DateRange | undefined>(defaultRange);
  const [selectedPreset, setSelectedPreset] = React.useState<string>("7m");

  const range = value ?? internalRange;

  const applyPreset = (days: number | "all", presetValue: string) => {
    if (days === "all") {
      applyRange(undefined);
      setSelectedPreset(presetValue);
      return;
    }
    const to = endOfDay(new Date());
    const from = startOfDay(subDays(to, days - 1));
    applyRange({ from, to });
    setSelectedPreset(presetValue);
  };

  const applyRange = (next: DateRange | undefined) => {
    if (onChange) {
      onChange(next);
    } else {
      setInternalRange(next);
    }
  };

  React.useEffect(() => {
    if (!range?.from || !range?.to) {
      setSelectedPreset("all");
      return;
    }
    const matched = PRESETS.find((preset) => {
      if (preset.days === "all") return false;
      const to = endOfDay(new Date());
      const from = startOfDay(subDays(to, preset.days - 1));
      return isSameRange(range, { from, to });
    });
    if (matched) setSelectedPreset(matched.value);
  }, [range]);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {PRESETS.map((preset) => (
        <Button
          key={preset.value}
          type="button"
          variant={selectedPreset === preset.value ? "default" : "outline"}
          className="h-8 rounded-md px-2.5 text-xs font-semibold"
          onClick={() => applyPreset(preset.days, preset.value)}
          title={preset.label}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}

export { defaultRange as defaultAdminDashboardRange };
