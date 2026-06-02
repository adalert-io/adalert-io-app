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

const PRESETS: Array<{ label: string; days: number }> = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

function formatDashboardRangeLabel(range: DateRange | undefined): string {
  if (!range?.from) {
    return "Select a date range";
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
  const [internalRange, setInternalRange] = React.useState<DateRange | undefined>(defaultRange);

  const range = value ?? internalRange;

  const applyPreset = (days: number) => {
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
            "h-10 shrink-0 gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50",
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
      <PopoverContent align="end" className="w-[min(96vw,760px)] p-0" sideOffset={8}>
        <div className="flex flex-col gap-0 lg:flex-row">
          <div className="border-b border-slate-200 p-3 lg:w-[180px] lg:border-r lg:border-b-0">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Quick ranges
            </p>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  className="h-9 justify-start rounded-lg border-slate-200 px-3 text-xs font-semibold"
                  onClick={() => applyPreset(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="p-2">
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
