"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  Headphones,
  Inbox,
  LifeBuoy,
  HelpCircle,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";

import { ConsumerHelpNewTicketDialog } from "./ConsumerHelpNewTicketDialog";
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
  const router = useRouter();
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filter, setFilter] = useState<SupportTicketFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  const loadTickets = async () => {
    if (!user) return;

    setIsLoadingTickets(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/support/tickets", {
        method: "GET",
        headers: {
          authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load tickets (${response.status})`);
      }

      const data = (await response.json()) as { tickets?: SupportTicket[] };
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
    } catch (error) {
      console.error("Failed to load support tickets:", error);
      setTickets(MOCK_SUPPORT_TICKETS);
      toast.error("Couldn't load tickets yet", {
        description: "Showing sample tickets while we reconnect.",
      });
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

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

  const handleSelectTicket = (ticket: SupportTicket) => {
    const ticketRouteId = ticket.documentId || ticket.id;
    router.push(`/consumer/help/${encodeURIComponent(ticketRouteId)}`);
  };

  const handleSubmitTicket = async (form: NewSupportTicketForm) => {
    if (!form.subject.trim() || !form.description.trim() || !form.attachment) {
      toast.error("Please add subject, description, and one attachment.");
      return;
    }

    if (!user) {
      toast.error("Please sign in to submit a ticket.");
      return;
    }

    setIsSubmitting(true);
    const categoryLabel =
      SUPPORT_CATEGORIES.find((item) => item.value === form.category)?.label ??
      "Other";
    try {
      const idToken = await user.getIdToken();
      const payload = new FormData();
      payload.set("subject", form.subject.trim());
      payload.set("category", categoryLabel);
      payload.set("priority", form.priority);
      payload.set("description", form.description.trim());
      payload.set("attachment", form.attachment);

      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          authorization: `Bearer ${idToken}`,
        },
        body: payload,
      });

      const data = (await response.json()) as { ticket?: SupportTicket; error?: string };
      if (!response.ok || !data.ticket) {
        throw new Error(data.error || `Failed to submit ticket (${response.status})`);
      }

      setTickets((prev) => [data.ticket!, ...prev]);
      setFilter("open");
      setIsNewTicketOpen(false);

      toast.success("Support ticket submitted", {
        description: `${data.ticket.id} is now in your queue.`,
      });
      const ticketRouteId = data.ticket.documentId || data.ticket.id;
      router.push(`/consumer/help/${encodeURIComponent(ticketRouteId)}`);
    } catch (error) {
      console.error("Failed to submit support ticket:", error);
      toast.error("Couldn't submit your ticket", {
        description: "Please try again in a moment.",
      });
    } finally {
      setIsSubmitting(false);
    }
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
              size="sm"
              onClick={() => setIsNewTicketOpen(true)}
              className="h-9 gap-1.5 rounded-lg bg-[#015AFD] px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0146ca]"
            >
              <HelpCircle className="size-3.5" aria-hidden />
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
              {isLoadingTickets
                ? "Loading…"
                : `${filteredTickets.length} ticket${filteredTickets.length === 1 ? "" : "s"}`}
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
              disabled={isLoadingTickets}
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
    </div>
  );
}
