"use client";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import {
  formatTicketDate,
  formatTicketRelative,
  priorityLabel,
  statusBadgeClass,
  statusLabel,
} from "./helpers";
import type { SupportTicket } from "./types";

export interface ConsumerHelpTicketDetailSheetProps {
  ticket: SupportTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsumerHelpTicketDetailSheet({
  ticket,
  open,
  onOpenChange,
}: ConsumerHelpTicketDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-slate-200 p-0 sm:max-w-md"
      >
        {ticket ? (
          <>
            <SheetHeader className="border-b border-slate-100 px-6 py-5 text-start">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-lg border-slate-200 font-mono text-[11px] text-slate-600"
                >
                  {ticket.id}
                </Badge>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                    statusBadgeClass(ticket.status),
                  )}
                >
                  {statusLabel(ticket.status)}
                </span>
              </div>
              <SheetTitle className="mt-3 text-left text-lg font-bold leading-snug text-slate-900">
                {ticket.subject}
              </SheetTitle>
              <SheetDescription className="text-left text-[13px] text-slate-500">
                {ticket.category} · {priorityLabel(ticket.priority)} priority
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex justify-between gap-4 text-[13px]">
                  <span className="text-slate-500">Created</span>
                  <span className="font-medium text-slate-800">
                    {formatTicketDate(ticket.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between gap-4 text-[13px]">
                  <span className="text-slate-500">Last update</span>
                  <span className="font-medium text-slate-800">
                    {formatTicketRelative(ticket.updatedAt)}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200/90 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Latest update
                </p>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-700">
                  {ticket.lastMessagePreview}
                </p>
              </div>

              <p className="mt-4 text-[12px] text-slate-400">
                Full conversation history will appear here once support is
                connected.
              </p>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
