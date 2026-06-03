"use client";

import { ChevronRight, Inbox } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import {
  formatTicketRelative,
  priorityLabel,
  statusBadgeClass,
  statusLabel,
} from "./helpers";
import type { SupportTicket } from "./types";

export interface ConsumerHelpTicketsTableProps {
  tickets: SupportTicket[];
  onSelectTicket: (ticket: SupportTicket) => void;
}

export function ConsumerHelpTicketsTable({
  tickets,
  onSelectTicket,
}: ConsumerHelpTicketsTableProps) {
  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
        <Inbox className="mb-3 size-10 text-slate-300" aria-hidden />
        <p className="font-medium text-slate-700">No tickets found</p>
        <p className="mt-1 text-[13px] text-slate-500">
          Try another filter or submit a new request.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-3 md:hidden" aria-label="Support tickets">
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <button
              type="button"
              onClick={() => onSelectTicket(ticket)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border border-slate-200/90 bg-white p-4 text-start shadow-sm transition-colors",
                "active:bg-slate-50 hover:bg-slate-50/80",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] font-medium text-slate-400">
                  {ticket.id}
                </p>
                <p className="mt-1 font-semibold leading-snug text-slate-900">
                  {ticket.subject}
                </p>
                <p className="mt-1 text-[13px] text-slate-500">{ticket.category}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                      statusBadgeClass(ticket.status),
                    )}
                  >
                    {statusLabel(ticket.status)}
                  </span>
                  <span className="text-[12px] text-slate-500">
                    {priorityLabel(ticket.priority)}
                  </span>
                  <span className="text-[12px] text-slate-400">
                    · {formatTicketRelative(ticket.updatedAt)}
                  </span>
                </div>
              </div>
              <ChevronRight
                className="mt-1 size-5 shrink-0 text-slate-300"
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>

      <Table
        containerClassName="hidden rounded-xl border border-slate-200/90 md:block"
      >
      <TableHeader>
        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
          <TableHead className="w-[36%] font-semibold text-slate-700">Ticket</TableHead>
          <TableHead className="w-[18%] font-semibold text-slate-700">Category</TableHead>
          <TableHead className="w-[14%] font-semibold text-slate-700">Status</TableHead>
          <TableHead className="w-[12%] font-semibold text-slate-700">Priority</TableHead>
          <TableHead className="w-[20%] text-end font-semibold text-slate-700">
            Updated
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((ticket) => {
          return (
            <TableRow
              key={ticket.id}
              tabIndex={0}
              role="button"
              onClick={() => onSelectTicket(ticket)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectTicket(ticket);
                }
              }}
              className={cn(
                "cursor-pointer transition-colors hover:bg-[#015AFD]/[0.03]",
              )}
            >
              <TableCell className="py-4">
                <p className="font-mono text-[11px] font-medium text-slate-400">
                  {ticket.id}
                </p>
                <p className="mt-0.5 truncate font-semibold text-slate-900">
                  {ticket.subject}
                </p>
              </TableCell>
              <TableCell className="text-[13px] text-slate-600">{ticket.category}</TableCell>
              <TableCell>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                    statusBadgeClass(ticket.status),
                  )}
                >
                  {statusLabel(ticket.status)}
                </span>
              </TableCell>
              <TableCell className="text-[13px] text-slate-600">
                {priorityLabel(ticket.priority)}
              </TableCell>
              <TableCell className="text-end text-[13px] text-slate-500">
                {formatTicketRelative(ticket.updatedAt)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </>
  );
}
