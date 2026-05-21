"use client";

import { Button } from "@/components/ui/button";

interface ConsumerSettingsListFooterProps {
  start: number;
  pageSize: number;
  total: number;
  safePage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  itemLabel?: string;
}

export function ConsumerSettingsListFooter({
  start,
  pageSize,
  total,
  safePage,
  totalPages,
  onPrev,
  onNext,
  itemLabel = "items",
}: ConsumerSettingsListFooterProps) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-600 sm:flex-row">
      <span className="text-center sm:text-left">
        Showing {total === 0 ? 0 : start + 1}-
        {Math.min(start + pageSize, total)} of {total} {itemLabel}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-lg"
          disabled={safePage <= 1}
          onClick={onPrev}
        >
          Prev
        </Button>
        <span className="text-xs tabular-nums">
          Page {safePage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-lg"
          disabled={safePage >= totalPages}
          onClick={onNext}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
