"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  CheckCircle2,
  Clock3,
  Headphones,
  Inbox,
  LifeBuoy,
  MessageSquarePlus,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  formatTicketDate,
  formatTicketRelative,
  priorityLabel,
  statusBadgeClass,
  statusLabel,
  SUPPORT_CATEGORIES,
} from "./helpers";
import { MOCK_SUPPORT_TICKETS } from "./mock-tickets";
import type {
  NewSupportTicketForm,
  SupportTicket,
  SupportTicketFilter,
} from "./types";

const FILTER_OPTIONS: { value: SupportTicketFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting", label: "Awaiting reply" },
  { value: "resolved", label: "Resolved" },
];

const EMPTY_FORM: NewSupportTicketForm = {
  subject: "",
  category: SUPPORT_CATEGORIES[0].value,
  priority: "medium",
  description: "",
};

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accentClass,
}: {
  label: string;
  value: number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  accentClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
          <p className="mt-1 text-[13px] text-slate-500">{hint}</p>
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            accentClass,
          )}
        >
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}

function TicketRow({
  ticket,
  isSelected,
  onSelect,
}: {
  ticket: SupportTicket;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border px-4 py-3 text-left transition-colors",
        isSelected
          ? "border-[#015AFD]/40 bg-[#015AFD]/5 shadow-sm"
          : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/80",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {ticket.id}
          </p>
          <p className="mt-0.5 truncate text-[14px] font-semibold text-slate-900">
            {ticket.subject}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
            statusBadgeClass(ticket.status),
          )}
        >
          {statusLabel(ticket.status)}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-slate-600">
        {ticket.lastMessagePreview}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500">
        <span>{ticket.category}</span>
        <span aria-hidden>·</span>
        <span>{priorityLabel(ticket.priority)} priority</span>
        <span aria-hidden>·</span>
        <span>Updated {formatTicketRelative(ticket.updatedAt)}</span>
      </div>
    </button>
  );
}

export function ConsumerHelpView() {
  const [tickets, setTickets] = useState<SupportTicket[]>(MOCK_SUPPORT_TICKETS);
  const [form, setForm] = useState<NewSupportTicketForm>(EMPTY_FORM);
  const [filter, setFilter] = useState<SupportTicketFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    MOCK_SUPPORT_TICKETS[0]?.id ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status === "open").length;
    const active = tickets.filter(
      (t) => t.status === "in_progress" || t.status === "waiting",
    ).length;
    const resolved = tickets.filter((t) => t.status === "resolved").length;
    return { open, active, resolved, total: tickets.length };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesFilter = filter === "all" || ticket.status === filter;
      if (!matchesFilter) return false;
      if (!query) return true;
      return (
        ticket.subject.toLowerCase().includes(query) ||
        ticket.id.toLowerCase().includes(query) ||
        ticket.category.toLowerCase().includes(query)
      );
    });
  }, [tickets, filter, searchQuery]);

  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedTicketId) ?? null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error("Please add a subject and description.");
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    const categoryLabel =
      SUPPORT_CATEGORIES.find((item) => item.value === form.category)?.label ??
      "Other";

    const newTicket: SupportTicket = {
      id: `TKT-${1100 + tickets.length}`,
      subject: form.subject.trim(),
      category: categoryLabel,
      status: "open",
      priority: form.priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessagePreview:
        "Thanks — we've received your request and will respond by email.",
    };

    setTickets((prev) => [newTicket, ...prev]);
    setSelectedTicketId(newTicket.id);
    setForm(EMPTY_FORM);
    setFilter("open");
    setIsSubmitting(false);
    toast.success("Support ticket submitted", {
      description: `${newTicket.id} is now in your queue.`,
    });
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1480px] space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-2xl border border-[#015AFD]/15 bg-gradient-to-br from-[#015AFD]/12 via-white to-slate-50 p-6 shadow-sm sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[#015AFD]/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#015AFD]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#015AFD]">
              <LifeBuoy className="size-3.5" aria-hidden />
              Help center
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              How can we help?
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-600">
              Submit a new support ticket or track updates on existing requests.
              Our team typically replies within one business day.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200/90 bg-white/80 px-4 py-3 text-[13px] text-slate-600 backdrop-blur-sm">
            <Headphones className="size-4 shrink-0 text-[#015AFD]" aria-hidden />
            <span>
              <span className="font-semibold text-slate-900">Support hours:</span>{" "}
              Mon–Fri, 9am–6pm PT
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open"
          value={stats.open}
          hint="Waiting for our team"
          icon={Inbox}
          accentClass="bg-[#015AFD]/10 text-[#015AFD]"
        />
        <StatCard
          label="Active"
          value={stats.active}
          hint="In progress or awaiting you"
          icon={Clock3}
          accentClass="bg-amber-50 text-amber-700"
        />
        <StatCard
          label="Resolved"
          value={stats.resolved}
          hint="Closed in the last 30 days"
          icon={CheckCircle2}
          accentClass="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          label="Total"
          value={stats.total}
          hint="All tickets on your account"
          icon={Sparkles}
          accentClass="bg-slate-100 text-slate-700"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#015AFD]/10 text-[#015AFD]">
              <MessageSquarePlus className="size-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">New ticket</h2>
              <p className="text-[13px] text-slate-500">
                Tell us what you need help with
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="ticket-subject">Subject</Label>
              <Input
                id="ticket-subject"
                value={form.subject}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, subject: event.target.value }))
                }
                placeholder="Brief summary of your issue"
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ticket-category">Category</Label>
                <select
                  id="ticket-category"
                  value={form.category}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, category: event.target.value }))
                  }
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:border-[#015AFD] focus-visible:ring-2 focus-visible:ring-[#015AFD]/20"
                >
                  {SUPPORT_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket-priority">Priority</Label>
                <select
                  id="ticket-priority"
                  value={form.priority}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      priority: event.target.value as NewSupportTicketForm["priority"],
                    }))
                  }
                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:border-[#015AFD] focus-visible:ring-2 focus-visible:ring-[#015AFD]/20"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High — blocking work</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticket-description">Description</Label>
              <Textarea
                id="ticket-description"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Include steps to reproduce, account IDs, screenshots, or error messages…"
                rows={6}
                className="min-h-[140px] resize-y rounded-xl border-slate-200"
              />
            </div>

            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-[12px] text-slate-500">
              Attachments and live chat will be available when support is connected
              to your ticketing system.
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full gap-2 rounded-xl bg-[#015AFD] font-semibold text-white hover:bg-[#0146ca] sm:w-auto sm:px-8"
            >
              <Send className="size-4" aria-hidden />
              {isSubmitting ? "Submitting…" : "Submit ticket"}
            </Button>
          </form>
        </section>

        <section className="flex min-h-[520px] flex-col rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Your tickets</h2>
                <p className="text-[13px] text-slate-500">
                  {filteredTickets.length} shown
                </p>
              </div>
              <div className="relative w-full sm:max-w-[240px]">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search tickets…"
                  className="rounded-xl border-slate-200 pl-9"
                  aria-label="Search tickets"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                    filter === option.value
                      ? "bg-[#015AFD] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-2">
            <div className="flex flex-col gap-2 overflow-y-auto border-b border-slate-100 p-4 lg:border-b-0 lg:border-r">
              {filteredTickets.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
                  <Inbox className="mb-3 size-10 text-slate-300" aria-hidden />
                  <p className="font-medium text-slate-700">No tickets found</p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    Try another filter or submit a new request.
                  </p>
                </div>
              ) : (
                filteredTickets.map((ticket) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    isSelected={ticket.id === selectedTicketId}
                    onSelect={() => setSelectedTicketId(ticket.id)}
                  />
                ))
              )}
            </div>

            <div className="flex flex-col p-4 sm:p-5">
              {selectedTicket ? (
                <>
                  <div className="mb-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="rounded-lg border-slate-200 font-mono text-[11px] text-slate-600"
                      >
                        {selectedTicket.id}
                      </Badge>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                          statusBadgeClass(selectedTicket.status),
                        )}
                      >
                        {statusLabel(selectedTicket.status)}
                      </span>
                    </div>
                    <h3 className="text-[17px] font-bold leading-snug text-slate-900">
                      {selectedTicket.subject}
                    </h3>
                    <p className="text-[13px] text-slate-500">
                      {selectedTicket.category} ·{" "}
                      {priorityLabel(selectedTicket.priority)} priority
                    </p>
                  </div>

                  <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex justify-between gap-4 text-[12px]">
                      <span className="text-slate-500">Created</span>
                      <span className="font-medium text-slate-800">
                        {formatTicketDate(selectedTicket.createdAt)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 text-[12px]">
                      <span className="text-slate-500">Last update</span>
                      <span className="font-medium text-slate-800">
                        {formatTicketRelative(selectedTicket.updatedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex-1 rounded-xl border border-slate-200/90 bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Latest update
                    </p>
                    <p className="mt-2 text-[14px] leading-relaxed text-slate-700">
                      {selectedTicket.lastMessagePreview}
                    </p>
                  </div>

                  <p className="mt-4 text-[12px] text-slate-400">
                    Threaded replies and status changes from support will appear
                    here once connected.
                  </p>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center text-center text-slate-500">
                  <p className="text-sm">Select a ticket to view details</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
