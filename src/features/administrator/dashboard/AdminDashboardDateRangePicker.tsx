"use client";

import * as React from "react";
import { format, subDays } from "date-fns";
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
  const to = new Date();
  const from = subDays(to, 6);
  return { from, to };
}

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
      <PopoverContent align="end" className="w-auto p-0" sideOffset={8}>
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
      </PopoverContent>
    </Popover>
  );
}

export { defaultRange as defaultAdminDashboardRange };
