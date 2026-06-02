"use client";

import * as React from "react";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { CalendarDays, ChevronDown } from "lucide-react";

import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function defaultRange(): DateRange {
  const to = endOfDay(new Date());
  const from = startOfDay(subDays(to, 6));
  return { from, to };
}

const PRESETS: Array<{ label: string; days: number | "all" }> = [
  { label: "All Time", days: "all" },
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
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
  const [isOpen, setIsOpen] = React.useState(false);
  const [internalRange, setInternalRange] = React.useState<DateRange | undefined>(undefined);

  const range = value ?? internalRange;

  const applyPreset = (days: number | "all") => {
    if (days === "all") {
      applyRange(undefined);
      setIsOpen(false);
      return;
    }
    const to = endOfDay(new Date());
    const from = startOfDay(subDays(to, days - 1));
    applyRange({ from, to });
    setIsOpen(false);
  };

  const applyRange = (next: DateRange | undefined) => {
    if (onChange) {
      onChange(next);
    } else {
      setInternalRange(next);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 shrink-0 gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50",
            className,
          )}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          type="button"
        >
          <CalendarDays className="size-4 text-slate-500" aria-hidden />
          <span className="tabular-nums">{formatDashboardRangeLabel(range)}</span>
          <ChevronDown className="size-4 text-slate-500" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(96vw,680px)] p-0" sideOffset={8}>
        <div className="flex flex-col gap-0 md:flex-row">
          <div className="border-b border-slate-200 p-2 md:w-[150px] md:border-r md:border-b-0">
            <div className="grid grid-cols-2 gap-1.5 md:grid-cols-1">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant={preset.days === "all" && !range?.from ? "default" : "outline"}
                  className="h-8 justify-start rounded-md border-slate-200 px-2.5 text-xs font-semibold"
                  onClick={() => applyPreset(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="p-1.5">
            <Calendar
              mode="range"
              defaultMonth={range?.from}
              selected={range}
              onSelect={(next) => {
                applyRange(next);
                if (next?.from && next?.to) {
                  setIsOpen(false);
                }
              }}
              numberOfMonths={2}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { defaultRange as defaultAdminDashboardRange };
