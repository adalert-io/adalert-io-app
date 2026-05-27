"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  CheckCircle2,
  Clock3,
  Headphones,
  Inbox,
  LifeBuoy,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { ConsumerHelpNewTicketDialog } from "./ConsumerHelpNewTicketDialog";
import { ConsumerHelpTicketDetailSheet } from "./ConsumerHelpTicketDetailSheet";
import { ConsumerHelpTicketsTable } from "./ConsumerHelpTicketsTable";
import { SUPPORT_CATEGORIES } from "./helpers";
import { MOCK_SUPPORT_TICKETS } from "./mock-tickets";
import type { NewSupportTicketForm, SupportTicket, SupportTicketFilter } from "./types";

const FILTER_OPTIONS: { value: SupportTicketFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting", label: "Awaiting reply" },
  { value: "resolved", label: "Resolved" },
];

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

export function ConsumerHelpView() {
  const [tickets, setTickets] = useState<SupportTicket[]>(MOCK_SUPPORT_TICKETS);
  const [filter, setFilter] = useState<SupportTicketFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
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

  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicketId(ticket.id);
    setIsDetailOpen(true);
  };

  const handleSubmitTicket = async (form: NewSupportTicketForm) => {
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
    setFilter("open");
    setIsSubmitting(false);
    setIsNewTicketOpen(false);
    setIsDetailOpen(true);

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
              Track support requests and open a new ticket when you need assistance.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Button
              type="button"
              onClick={() => setIsNewTicketOpen(true)}
              className="h-11 gap-2 rounded-xl bg-[#015AFD] px-5 font-semibold text-white shadow-sm hover:bg-[#0146ca]"
            >
              <Plus className="size-4" aria-hidden />
              Submit a ticket
            </Button>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white/80 px-4 py-2.5 text-[12px] text-slate-600 backdrop-blur-sm">
              <Headphones className="size-4 shrink-0 text-[#015AFD]" aria-hidden />
              <span>Mon–Fri, 9am–6pm PT</span>
            </div>
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

      <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Your tickets</h2>
            <p className="text-[13px] text-slate-500">
              {filteredTickets.length} ticket{filteredTickets.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
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

        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 pb-4 sm:px-6">
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

        <div className="p-4 sm:p-6">
          <ConsumerHelpTicketsTable
            tickets={filteredTickets}
            selectedTicketId={selectedTicketId}
            onSelectTicket={handleSelectTicket}
          />
        </div>
      </section>

      <ConsumerHelpNewTicketDialog
        open={isNewTicketOpen}
        onOpenChange={setIsNewTicketOpen}
        onSubmit={handleSubmitTicket}
        isSubmitting={isSubmitting}
      />

      <ConsumerHelpTicketDetailSheet
        ticket={selectedTicket}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  );
}
