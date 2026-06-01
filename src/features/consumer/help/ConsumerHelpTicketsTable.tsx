"use client";

import { Inbox } from "lucide-react";

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
    <Table containerClassName="rounded-xl border border-slate-200/90">
      <TableHeader>
        <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
          <TableHead className="font-semibold text-slate-700">Ticket</TableHead>
          <TableHead className="hidden font-semibold text-slate-700 md:table-cell">
            Category
          </TableHead>
          <TableHead className="font-semibold text-slate-700">Status</TableHead>
          <TableHead className="hidden font-semibold text-slate-700 sm:table-cell">
            Priority
          </TableHead>
          <TableHead className="hidden text-end font-semibold text-slate-700 lg:table-cell">
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
              className={cn("cursor-pointer transition-colors hover:bg-slate-50/80")}
            >
              <TableCell className="max-w-[220px] py-3.5">
                <p className="font-mono text-[11px] font-medium text-slate-400">
                  {ticket.id}
                </p>
                <p className="mt-0.5 truncate font-semibold text-slate-900">
                  {ticket.subject}
                </p>
                <p className="mt-1 line-clamp-1 text-[12px] text-slate-500 md:hidden">
                  {ticket.category}
                </p>
              </TableCell>
              <TableCell className="hidden text-[13px] text-slate-600 md:table-cell">
                {ticket.category}
              </TableCell>
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
              <TableCell className="hidden text-[13px] text-slate-600 sm:table-cell">
                {priorityLabel(ticket.priority)}
              </TableCell>
              <TableCell className="hidden text-end text-[13px] text-slate-500 lg:table-cell">
                {formatTicketRelative(ticket.updatedAt)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
