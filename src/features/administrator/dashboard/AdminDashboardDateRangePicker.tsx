"use client";

import * as React from "react";
import { format } from "date-fns";
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

const DEFAULT_RANGE_FROM = new Date(2025, 4, 9);
const DEFAULT_RANGE_TO = new Date(2025, 4, 15);

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
}

export function AdminDashboardDateRangePicker({
  className,
}: AdminDashboardDateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: DEFAULT_RANGE_FROM,
    to: DEFAULT_RANGE_TO,
  });

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
          <span className="tabular-nums">
            {formatDashboardRangeLabel(range)}
          </span>
          <ChevronDown className="size-4 text-slate-500" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0" sideOffset={8}>
        <Calendar
          mode="range"
          defaultMonth={range?.from}
          selected={range}
          onSelect={(next) => {
            setRange(next);
          }}
          numberOfMonths={1}
          className="p-3"
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
