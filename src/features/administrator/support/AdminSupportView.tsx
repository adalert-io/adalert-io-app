"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleCheckBig,
  Clock,
  Filter,
  LayoutGrid,
  List,
  MoreHorizontal,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Smile,
  Ticket,
  User,
  Eye,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { AdminDashboardDateRangePicker } from "../dashboard/AdminDashboardDateRangePicker";

type TicketWorkflowStatus =
  | "open"
  | "in_progress"
  | "pending_customer"
  | "resolved";

type TicketPriority = "high" | "medium" | "low";

interface TicketThreadMessage {
  id: string;
  author: "customer" | "agent";
  authorName: string;
  timeLabel: string;
  body: string;
}

interface SupportTicketRow {
  id: string;
  ticketCode: string;
  subject: string;
  companyName: string;
  email: string;
  initials: string;
  avatarToneIndex: number;
  status: TicketWorkflowStatus;
  priority: TicketPriority;
  lastUpdatedLabel: string;
  categoryLabel: string;
  createdAtLabel: string;
  notesBody: string;
  historySnippet: string;
  thread: TicketThreadMessage[];
}

interface AdminSupportApiTicket {
  id: string;
  ticketCode: string;
  subject: string;
  companyName: string;
  email: string;
  status: TicketWorkflowStatus;
  priority: TicketPriority;
  categoryLabel: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminTicketMessageDto {
  id: string;
  authorType: "customer" | "agent";
  authorName: string;
  body: string;
  visibility: "public" | "internal";
  createdAt: string;
}

const COMPANY_POOL = [
  "McGrath Kavinoky LLP",
  "Lakeside Boutique",
  "Nexus AI Labs",
  "Sunrise Catering Co.",
  "PixelForge Studios",
  "Acme Diagnostics LLC",
  "Harbor Media Group",
  "Northwind Collective",
];

const AVATAR_BG = [
  "bg-[#3b82f6]",
  "bg-[#6366f1]",
  "bg-[#0ea5e9]",
  "bg-[#475569]",
  "bg-[#8b5cf6]",
];

const SUBJECT_LINES = [
  "Unable to connect Google Ads account",
  "Webhook deliveries failing intermittently",
  "Request access to consolidated billing breakdown",
  "Alert emails stopped after domain change",
  "Need SSO enforcement for Viewer roles",
];

const LAST_UPDATES = [
  "May 15, 2025 10:24 AM",
  "May 15, 2025 06:52 AM",
  "May 14, 2025 04:41 PM",
  "May 14, 2025 11:06 AM",
  "May 13, 2025 02:18 PM",
];

const CATEGORY_ROTATION = [
  "Account Connection",
  "Technical",
  "Billing",
  "Notifications",
];

const PAGE_SIZE = 10;

function formatDateLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function initialsFromName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const f = words[0]?.[0];
  const s = words.length > 1 ? words[1]?.[0] : words[0]?.[1];
  return `${f ?? "?"}${s ?? "?"}`.toUpperCase().slice(0, 2);
}

function slugifyCompany(name: string): string {
  return name.toLowerCase().replace(/[^\w]/g, ".").slice(0, 24);
}

function statusFromIndex(idx: number): TicketWorkflowStatus {
  const r = idx % 11;
  if (r <= 4) return "open";
  if (r <= 6) return "in_progress";
  if (r === 8) return "resolved";
  return "pending_customer";
}

function priorityFromIndex(idx: number): TicketPriority {
  if (idx % 27 === 0) return "low";
  if (idx % 5 === 0) return "high";
  return "medium";
}

function seedTickets(): SupportTicketRow[] {
  return Array.from({ length: 156 }, (_, idx) => {
    const company = COMPANY_POOL[idx % COMPANY_POOL.length];
    const slug = slugifyCompany(company);
    const subjectIdx = idx % SUBJECT_LINES.length;
    let status = statusFromIndex(idx);
    let priority = priorityFromIndex(idx);
    if (idx === 0) {
      status = "open";
      priority = "high";
    }

    const created =
      idx === 0
        ? "May 14, 2025 4:58 PM"
        : `Apr ${Math.max(1, 25 - ((idx >> 3) % 22))}, 2025 ${8 + ((idx >> 5) % 8)}:${String((idx * 37) % 60).padStart(2, "0")} AM`;

    const baseThread: TicketThreadMessage[] =
      idx === 0
        ? [
            {
              id: "msg-1",
              author: "customer",
              authorName: `${company.split(" ")[0]} team`,
              timeLabel: "May 15, 2025 • 09:52 AM",
              body: "OAuth keeps failing during Google Ads onboarding even after refreshing admin consent screens. Billing shows zero spend meanwhile.",
            },
            {
              id: "msg-2",
              author: "agent",
              authorName: "AdAlert Support • Priya Shah",
              timeLabel: "May 15, 2025 • 10:06 AM",
              body: "Thanks for the detail—can you paste the OAuth error banner text? We’re also resetting the advertiser token on our side.",
            },
          ]
        : [
            {
              id: `${idx}-a`,
              author: "customer",
              authorName: "Customer",
              timeLabel: LAST_UPDATES[idx % LAST_UPDATES.length],
              body: `Following up regarding ${SUBJECT_LINES[subjectIdx].toLowerCase()}. Priority is impacting release cadence this week.`,
            },
            {
              id: `${idx}-b`,
              author: "agent",
              authorName: "Support • Avery Kim",
              timeLabel: LAST_UPDATES[(idx + 3) % LAST_UPDATES.length],
              body: "Acknowledged. We’re escalating to onboarding engineering and should have an ETA within hours.",
            },
          ];

    return {
      id: `tic-${String(idx + 1).padStart(3, "0")}`,
      ticketCode: `TKT-2025-${String(idx + 1).padStart(4, "0")}`,
      subject: SUBJECT_LINES[subjectIdx],
      companyName: company,
      email: `helpdesk.${slug}.${idx % 20}@${idx % 2 === 0 ? "firm.co" : "mail.io"}`,
      initials: initialsFromName(company),
      avatarToneIndex: idx % AVATAR_BG.length,
      status,
      priority,
      lastUpdatedLabel:
        LAST_UPDATES[idx % LAST_UPDATES.length] ??
        LAST_UPDATES[0],
      categoryLabel: CATEGORY_ROTATION[idx % CATEGORY_ROTATION.length],
      createdAtLabel: created,
      notesBody:
        "[Internal]\nReminder: verify SCIM rollout status before closing.\n\nNext steps for CSAT follow-up scripted on template #44.",
      historySnippet: `${created} → Ticket logged\n${LAST_UPDATES[(idx + 1) % LAST_UPDATES.length]} → Routed to onboarding pod\n${LAST_UPDATES[(idx + 2) % LAST_UPDATES.length]} → Customer acknowledged`,
      thread: baseThread,
    };
  });
}

const ALL_TICKETS = seedTickets();

function payoutSlots(
  currentPage: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }
  const last = totalPages;
  if (currentPage <= 4) return [1, 2, 3, 4, 5, "ellipsis", last];
  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis", last - 4, last - 3, last - 2, last - 1, last];
  }
  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    last,
  ];
}

function DashboardMetricCard({
  title,
  value,
  trend,
  trendTone,
  Icon,
  accentClassName,
}: {
  title: ReactNode;
  value: string;
  trend: string;
  trendTone: "positive" | "negative";
  Icon: LucideIcon;
  accentClassName?: string;
}) {
  const trendCn =
    trendTone === "positive" ? "text-[#22c55e]" : "text-[#ef4444]";
  return (
    <Card className="flex min-h-[140px] justify-center gap-0 rounded-xl border border-slate-200 bg-white py-0 shadow-sm">
      <CardContent className="flex flex-1 items-center justify-between gap-4 px-6 py-6">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="truncate text-[28px] font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className={cn("text-sm font-medium", trendCn)}>{trend}</p>
        </div>
        <span
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-full text-[#3b82f6]",
            accentClassName ?? "bg-[#3b82f6]/10",
          )}
        >
          <Icon className="size-6" strokeWidth={1.85} aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: TicketWorkflowStatus }) {
  if (status === "open") {
    return (
      <span className="inline-flex rounded-full bg-[#22c55e]/14 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#15803d] ring-1 ring-[#22c55e]/28">
        Open
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex rounded-full bg-[#3b82f6]/12 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#1d4ed8] ring-1 ring-[#bfdbfe]">
        In Progress
      </span>
    );
  }
  if (status === "pending_customer") {
    return (
      <span className="inline-flex rounded-full bg-orange-400/14 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#c2410c] ring-1 ring-orange-300/55">
        Pending Customer
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[#22c55e]/16 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#15803d] ring-1 ring-[#22c55e]/38">
      Resolved
    </span>
  );
}

function PriorityText({ priority }: { priority: TicketPriority }) {
  const cls =
    priority === "high"
      ? "font-semibold text-[#dc2626]"
      : priority === "medium"
        ? "font-semibold text-[#ea580c]"
        : "font-semibold text-[#16a34a]";
  const label =
    priority === "high" ? "High" : priority === "medium" ? "Medium" : "Low";
  return <span className={cls}>{label}</span>;
}

function DetailStatusBadge({ status }: { status: TicketWorkflowStatus }) {
  /** Panel header uses succinct labels (Pending vs Pending Customer in table). */
  if (status === "pending_customer") {
    return (
      <span className="inline-flex rounded-full bg-orange-400/14 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#c2410c] ring-1 ring-orange-300/55">
        Pending Customer
      </span>
    );
  }
  return <StatusBadge status={status} />;
}

const SELECT_CLASS =
  "min-w-[128px] appearance-none rounded-lg border border-gray-200 bg-white py-2.5 ps-4 pe-9 text-[13px] font-medium text-gray-700 shadow-xs transition-colors focus-visible:border-[#015AFD] focus-visible:ring-2 focus-visible:ring-[#015AFD]/25";

interface TicketSheetProps {
  row: SupportTicketRow;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  isUpdating: boolean;
  onUpdateTicket: (args: {
    ticketId: string;
    status: TicketWorkflowStatus;
    priority: TicketPriority;
  }) => Promise<void>;
  onAfterPublicReply: (ticketId: string) => void;
}

function TicketSheet({
  row,
  open,
  onOpenChange,
  isUpdating,
  onUpdateTicket,
  onAfterPublicReply,
}: TicketSheetProps) {
  const [panelTab, setPanelTab] = useState<"messages" | "notes" | "history">(
    "messages",
  );
  const [composerMode, setComposerMode] = useState<"reply" | "internal">(
    "reply",
  );
  const [replyDraft, setReplyDraft] = useState("");
  const [messages, setMessages] = useState<TicketThreadMessage[]>(row.thread);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [nextStatus, setNextStatus] = useState<TicketWorkflowStatus>(row.status);
  const [nextPriority, setNextPriority] = useState<TicketPriority>(row.priority);

  useEffect(() => {
    setNextStatus(row.status);
    setNextPriority(row.priority);
  }, [row.id, row.status, row.priority]);

  useEffect(() => {
    let isUnmounted = false;

    async function loadMessages() {
      setIsLoadingMessages(true);
      try {
        const response = await fetch(`/api/admin/support/tickets/${row.id}/messages`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          messages?: AdminTicketMessageDto[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load messages");
        }

        const mapped = (payload.messages ?? []).map((message) => ({
          id: message.id,
          author: message.authorType,
          authorName:
            message.visibility === "internal"
              ? `${message.authorName} (Internal)`
              : message.authorName,
          timeLabel: formatDateLabel(message.createdAt),
          body: message.body,
        })) satisfies TicketThreadMessage[];

        if (!isUnmounted) {
          setMessages(mapped.length > 0 ? mapped : row.thread);
        }
      } catch (error) {
        console.error("Failed to load ticket messages:", error);
        if (!isUnmounted) {
          setMessages(row.thread);
          toast.error("Couldn't load full conversation yet");
        }
      } finally {
        if (!isUnmounted) setIsLoadingMessages(false);
      }
    }

    void loadMessages();
    return () => {
      isUnmounted = true;
    };
  }, [row.id, row.thread]);

  const hasTicketChanges = nextStatus !== row.status || nextPriority !== row.priority;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton
        className="flex w-full max-w-xl flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b border-gray-100 p-6 text-start">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[13px] font-bold tracking-tight text-[#015AFD]">
              {row.ticketCode}
            </span>
            <DetailStatusBadge status={row.status} />
          </div>
          <SheetTitle className="text-start text-xl font-bold leading-snug tracking-tight text-gray-900">
            {row.subject}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <dl className="space-y-3 border-b border-gray-100 pb-6 text-[13px]">
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-gray-500">Customer</dt>
              <dd className="flex items-center gap-1 font-semibold text-gray-900">
                <span className="text-end">{row.companyName}</span>
                <span className="text-[#015AFD]" aria-hidden>
                  ↗
                </span>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-gray-500">Contact</dt>
              <dd className="text-end font-medium text-gray-900">{row.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-gray-500">Priority</dt>
              <dd>
                <PriorityText priority={row.priority} />
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-gray-500">Category</dt>
              <dd className="text-end font-semibold text-gray-900">
                {row.categoryLabel}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-gray-500">Created At</dt>
              <dd className="text-end text-gray-800">{row.createdAtLabel}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-gray-500">Last Updated</dt>
              <dd className="text-end text-gray-800">{row.lastUpdatedLabel}</dd>
            </div>
          </dl>

          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-gray-500">
              Triage controls
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <Label htmlFor={`status-${row.id}`} className="mb-1 block text-xs text-gray-600">
                  Status
                </Label>
                <select
                  id={`status-${row.id}`}
                  className={cn(SELECT_CLASS, "w-full")}
                  value={nextStatus}
                  disabled={isUpdating}
                  onChange={(e) => setNextStatus(e.target.value as TicketWorkflowStatus)}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="pending_customer">Pending Customer</option>
                  <option value="resolved">Resolved</option>
                </select>
                <ChevronDown
                  className="pointer-events-none absolute end-3 top-9 size-4 -translate-y-1/2 text-gray-500"
                  aria-hidden
                />
              </div>
              <div className="relative">
                <Label htmlFor={`priority-${row.id}`} className="mb-1 block text-xs text-gray-600">
                  Priority
                </Label>
                <select
                  id={`priority-${row.id}`}
                  className={cn(SELECT_CLASS, "w-full")}
                  value={nextPriority}
                  disabled={isUpdating}
                  onChange={(e) => setNextPriority(e.target.value as TicketPriority)}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <ChevronDown
                  className="pointer-events-none absolute end-3 top-9 size-4 -translate-y-1/2 text-gray-500"
                  aria-hidden
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                disabled={!hasTicketChanges || isUpdating}
                className="rounded-xl bg-[#015AFD] font-semibold shadow-sm hover:bg-[#014bcc]"
                onClick={() =>
                  onUpdateTicket({
                    ticketId: row.id,
                    status: nextStatus,
                    priority: nextPriority,
                  })
                }
              >
                {isUpdating ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>

          <div className="mt-6 flex gap-2 border-b border-gray-100 pb-0">
            {(
              [
                ["messages", "Messages"],
                ["notes", "Notes"],
                ["history", "History"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPanelTab(key)}
                className={cn(
                  "relative pb-3 text-[13px] font-semibold transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:rounded-full",
                  panelTab === key
                    ? "text-[#015AFD] after:bg-[#015AFD]"
                    : "text-gray-500 after:bg-transparent hover:text-gray-900",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-6 min-h-[200px]">
            {panelTab === "messages" ? (
              <div className="space-y-4">
                {isLoadingMessages ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-4 text-[13px] text-gray-600">
                    Loading conversation...
                  </div>
                ) : messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-xl border px-4 py-3 shadow-xs",
                      m.author === "customer"
                        ? "border-[#bae6fd] bg-[#f0f9ff]"
                        : "border-[#bbf7d0] bg-[#f0fdf4]",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                          m.author === "customer" ? "bg-[#0369a1]" : "bg-emerald-600",
                        )}
                      >
                        {m.author === "customer" ? row.initials : "SU"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900">
                          {m.authorName}
                        </p>
                        <p className="text-[12px] text-gray-600">{m.timeLabel}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-[13px] leading-relaxed text-gray-800">
                      {m.body}
                    </p>
                  </div>
                ))}
              </div>
            ) : panelTab === "notes" ? (
              <pre className="whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-[13px] leading-relaxed text-gray-700">
                {row.notesBody}
              </pre>
            ) : (
              <pre className="whitespace-pre-wrap rounded-xl border border-dashed border-gray-200 p-4 text-[13px] leading-relaxed text-gray-700">
                {row.historySnippet}
              </pre>
            )}
          </div>
        </div>

        <SheetFooter className="border-t border-gray-100 bg-white p-4">
          <div className="w-full space-y-3">
            <div className="flex rounded-lg bg-gray-100 p-1 text-[13px] font-semibold">
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-md py-1.5",
                  composerMode === "reply"
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-600",
                )}
                onClick={() => setComposerMode("reply")}
              >
                Reply
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-md py-1.5",
                  composerMode === "internal"
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-600",
                )}
                onClick={() => setComposerMode("internal")}
              >
                Internal Note
              </button>
            </div>
            <Textarea
              rows={4}
              className="resize-none rounded-xl border-gray-200"
              placeholder={
                composerMode === "reply"
                  ? "Type your reply..."
                  : "Add an internal-only note..."
              }
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" type="button" className="text-gray-500">
                  <Paperclip className="size-5" aria-hidden />
                </Button>
                <Button variant="ghost" size="icon" type="button" className="text-gray-500">
                  <Smile className="size-5" aria-hidden />
                </Button>
              </div>
              <Button
                type="button"
                disabled={isSendingMessage || !replyDraft.trim()}
                className="rounded-xl bg-[#015AFD] font-semibold shadow-sm hover:bg-[#014bcc]"
                onClick={async () => {
                  const body = replyDraft.trim();
                  if (!body) return;

                  const visibility = composerMode === "internal" ? "internal" : "public";
                  setIsSendingMessage(true);
                  try {
                    const response = await fetch(
                      `/api/admin/support/tickets/${row.id}/messages`,
                      {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ body, visibility }),
                      },
                    );
                    const payload = (await response.json()) as {
                      message?: AdminTicketMessageDto;
                      error?: string;
                    };
                    if (!response.ok || !payload.message) {
                      throw new Error(payload.error || "Failed to send message");
                    }

                    setMessages((prev) => [
                      ...prev,
                      {
                        id: payload.message!.id,
                        author: "agent",
                        authorName:
                          visibility === "internal"
                            ? "AdAlert Support (Internal)"
                            : "AdAlert Support",
                        timeLabel: formatDateLabel(payload.message!.createdAt),
                        body: payload.message!.body,
                      },
                    ]);
                    setReplyDraft("");
                    setPanelTab("messages");
                    if (visibility === "public") {
                      onAfterPublicReply(row.id);
                    }
                    toast.success(
                      visibility === "public"
                        ? "Reply sent to ticket"
                        : "Internal note saved",
                    );
                  } catch (error) {
                    console.error("Failed to send ticket reply:", error);
                    toast.error("Couldn't send message", {
                      description: "Please try again.",
                    });
                  } finally {
                    setIsSendingMessage(false);
                  }
                }}
              >
                {isSendingMessage
                  ? "Sending..."
                  : composerMode === "internal"
                    ? "Save Note"
                    : "Send Reply"}
                <ChevronDown className="size-4 ms-2" aria-hidden />
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function AdminSupportView() {
  const [rows, setRows] = useState<SupportTicketRow[]>(ALL_TICKETS);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    TicketWorkflowStatus | "all"
  >("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">(
    "all",
  );
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [detailId, setDetailId] = useState<string | null>(ALL_TICKETS[0]?.id ?? null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const [newSubject, setNewSubject] = useState("");
  const [newCustomer, setNewCustomer] = useState(COMPANY_POOL[0]);
  const [newPriority, setNewPriority] = useState<TicketPriority>("medium");
  const [newBody, setNewBody] = useState("");
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);

  useEffect(() => {
    let isUnmounted = false;

    async function loadAdminTickets() {
      setIsLoadingRows(true);
      try {
        const response = await fetch("/api/admin/support/tickets", {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          tickets?: AdminSupportApiTicket[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load admin support tickets");
        }

        const mappedRows = (payload.tickets ?? []).map((ticket, idx) => {
          const displayName = ticket.companyName || "Customer";
          const createdAtLabel = formatDateLabel(ticket.createdAt);
          const updatedAtLabel = formatDateLabel(ticket.updatedAt);

          return {
            id: ticket.id,
            ticketCode: ticket.ticketCode,
            subject: ticket.subject,
            companyName: displayName,
            email: ticket.email || "unknown@customer",
            initials: initialsFromName(displayName),
            avatarToneIndex: idx % AVATAR_BG.length,
            status: ticket.status,
            priority: ticket.priority,
            lastUpdatedLabel: updatedAtLabel,
            categoryLabel: ticket.categoryLabel,
            createdAtLabel,
            notesBody:
              "[Internal]\nNo notes yet. Add triage notes here for the support team.",
            historySnippet: `${createdAtLabel} → Ticket created\n${updatedAtLabel} → Latest activity`,
            thread: [
              {
                id: `${ticket.id}-init`,
                author: "customer",
                authorName: displayName,
                timeLabel: createdAtLabel,
                body:
                  ticket.description.trim() ||
                  "No description was provided by the customer.",
              },
            ],
          } satisfies SupportTicketRow;
        });

        if (isUnmounted) return;
        setRows(mappedRows);
      } catch (error) {
        console.error("Failed to load admin support tickets:", error);
        if (!isUnmounted) {
          toast.error("Couldn't load live support tickets", {
            description: "Showing preview data while we reconnect.",
          });
        }
      } finally {
        if (!isUnmounted) setIsLoadingRows(false);
      }
    }

    void loadAdminTickets();

    return () => {
      isUnmounted = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.ticketCode.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.companyName.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter);
    if (priorityFilter !== "all") {
      list = list.filter((t) => t.priority === priorityFilter);
    }
    if (customerFilter !== "all") {
      list = list.filter((t) => t.companyName === customerFilter);
    }
    return list;
  }, [rows, search, statusFilter, priorityFilter, customerFilter]);

  useEffect(() => {
    if (filtered.length === 0) {
      setDetailId(null);
      return;
    }
    setDetailId((prev) =>
      prev && filtered.some((x) => x.id === prev)
        ? prev
        : (filtered[0]?.id ?? null),
    );
  }, [filtered]);

  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  useEffect(() => setPage((p) => Math.min(p, totalPages)), [totalPages]);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const sliceStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(sliceStart, sliceStart + PAGE_SIZE);

  const pageIdsOnPage = useMemo(() => pageRows.map((r) => r.id), [pageRows]);
  const allPageSelected =
    pageIdsOnPage.length > 0 && pageIdsOnPage.every((id) => selected.has(id));
  const somePageSelected = pageIdsOnPage.some((id) => selected.has(id));
  const headerChecked: boolean | "indeterminate" = allPageSelected
    ? true
    : somePageSelected
      ? "indeterminate"
      : false;
  const slots = payoutSlots(safePage, totalPages);

  const toggleRow = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleHeader = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) for (const id of pageIdsOnPage) next.delete(id);
      else for (const id of pageIdsOnPage) next.add(id);
      return next;
    });
  }, [allPageSelected, pageIdsOnPage]);

  const handleOpenTicket = useCallback((t: SupportTicketRow) => {
    setDetailId(t.id);
    setDetailOpen(true);
  }, []);

  const detailRow =
    detailId === null ? null : rows.find((r) => r.id === detailId) ?? null;

  const aggregated = useMemo(() => ({
    total: rows.length,
    open: rows.filter((t) => t.status === "open").length,
    in_progress: rows.filter((t) => t.status === "in_progress").length,
    pending: rows.filter((t) => t.status === "pending_customer").length,
    resolved: rows.filter((t) => t.status === "resolved").length,
  }), [rows]);

  const resetNewTicket = () => {
    setNewSubject("");
    setNewCustomer(COMPANY_POOL[0]);
    setNewPriority("medium");
    setNewBody("");
  };

  const submitNewTicket = () => {
    const nextCode = rows.length + 1;
    const subject =
      newSubject.trim() ||
      `New inbound request (${newCustomer.split(" ").slice(-1)})`;
    const slug = slugifyCompany(newCustomer);
    const nt: SupportTicketRow = {
      id: `tic-new-${Date.now()}`,
      ticketCode: `TKT-2025-${String(nextCode).padStart(4, "0")}`,
      subject,
      companyName: newCustomer,
      email: `open-ticket.${slug}@firm.co`,
      initials: initialsFromName(newCustomer),
      avatarToneIndex: nextCode % AVATAR_BG.length,
      status: "open",
      priority: newPriority,
      lastUpdatedLabel: LAST_UPDATES[0],
      categoryLabel: CATEGORY_ROTATION[0],
      createdAtLabel: LAST_UPDATES[0],
      notesBody: newBody.trim().length ? newBody.trim() : "No notes yet.",
      historySnippet: `${LAST_UPDATES[0]} → Ticket logged via console`,
      thread: [
        {
          id: "msg-new",
          author: "customer",
          authorName: newCustomer.split(" ")[0] ?? newCustomer,
          timeLabel: LAST_UPDATES[0],
          body: newBody.trim() || "Queued request pending triage narrative.",
        },
      ],
    };
    setRows((prev) => [nt, ...prev]);
    setNewOpen(false);
    resetNewTicket();
    setPage(1);
  };

  const handleUpdateTicket = async ({
    ticketId,
    status,
    priority,
  }: {
    ticketId: string;
    status: TicketWorkflowStatus;
    priority: TicketPriority;
  }) => {
    setUpdatingTicketId(ticketId);
    try {
      const response = await fetch(`/api/admin/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, priority }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update ticket");
      }

      const nowLabel = formatDateLabel(new Date().toISOString());
      setRows((prev) =>
        prev.map((row) =>
          row.id === ticketId
            ? {
                ...row,
                status,
                priority,
                lastUpdatedLabel: nowLabel,
              }
            : row,
        ),
      );
      toast.success("Ticket updated");
    } catch (error) {
      console.error("Failed to update admin ticket:", error);
      toast.error("Couldn't update ticket", {
        description: "Please try again.",
      });
    } finally {
      setUpdatingTicketId(null);
    }
  };

  const handleAfterPublicReply = (ticketId: string) => {
    const nowLabel = formatDateLabel(new Date().toISOString());
    setRows((prev) =>
      prev.map((row) =>
        row.id === ticketId
          ? {
              ...row,
              status: "pending_customer",
              lastUpdatedLabel: nowLabel,
            }
          : row,
      ),
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 pb-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 sm:text-[30px]">
            Support
          </h1>
          <p className="text-[15px] text-[#7A7D9C]">
            {isLoadingRows
              ? "Loading live support tickets..."
              : "Manage customer support tickets and inquiries"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdminDashboardDateRangePicker />
          <Button
            variant="outline"
            type="button"
            className="gap-2 rounded-xl border-[#e5e5e5] bg-white shadow-sm"
          >
            <Filter className="size-4 text-gray-700" aria-hidden />
            Filters
          </Button>
          <Button
            type="button"
            className="gap-2 rounded-xl bg-[#015AFD] font-semibold shadow-sm hover:bg-[#014bcc]"
            onClick={() => {
              resetNewTicket();
              setNewOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden /> New Ticket
          </Button>
        </div>
      </header>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-[480px] gap-6">
          <DialogHeader className="text-start">
            <DialogTitle>New support ticket</DialogTitle>
            <DialogDescription className="text-[14px] text-[#64748b]">
              Capture the basics—assignment rules will route automatically from
              your queue policies.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticket-subject">Subject</Label>
              <Input
                id="ticket-subject"
                value={newSubject}
                placeholder="Brief summary..."
                onChange={(e) => setNewSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-customer">Customer</Label>
              <div className="relative">
                <select
                  id="ticket-customer"
                  className={cn(SELECT_CLASS, "w-full")}
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                >
                  {COMPANY_POOL.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" aria-hidden />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-priority">Priority</Label>
              <div className="relative">
                <select
                  id="ticket-priority"
                  className={cn(SELECT_CLASS, "w-full")}
                  value={newPriority}
                  onChange={(e) =>
                    setNewPriority(e.target.value as TicketPriority)
                  }
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" aria-hidden />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-body">Message</Label>
              <Textarea
                id="ticket-body"
                rows={4}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="What is the customer seeing?"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" type="button" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#015AFD] font-semibold text-white hover:bg-[#014bcc]"
              onClick={submitNewTicket}
            >
              Create ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <DashboardMetricCard
          title="Total Tickets"
          value={String(aggregated.total)}
          trend="↑ 18% vs last 7 days"
          trendTone="positive"
          Icon={Ticket}
          accentClassName="bg-[#3b82f6]/12 text-[#2563eb]"
        />
        <DashboardMetricCard
          title="Open"
          value={String(aggregated.open)}
          trend="↑ 12% vs last 7 days"
          trendTone="positive"
          Icon={Clock}
          accentClassName="bg-[#dcfce7] text-emerald-700"
        />
        <DashboardMetricCard
          title="In Progress"
          value={String(aggregated.in_progress)}
          trend="↓ 8% vs last 7 days"
          trendTone="negative"
          Icon={RefreshCw}
          accentClassName="bg-orange-50 text-orange-700"
        />
        <DashboardMetricCard
          title="Pending Customer"
          value={String(aggregated.pending)}
          trend="↑ 5% vs last 7 days"
          trendTone="positive"
          Icon={User}
          accentClassName="bg-amber-100 text-amber-800"
        />
        <DashboardMetricCard
          title="Resolved"
          value={String(aggregated.resolved)}
          trend="↑ 25% vs last 7 days"
          trendTone="positive"
          Icon={CircleCheckBig}
          accentClassName="bg-[#22c55e]/15 text-[#16a34a]"
        />
      </section>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-200">
            <Search className="size-5 shrink-0 text-[#015AFD]" aria-hidden />
            <input
              className="min-w-0 flex-1 border-none bg-transparent text-[13px] outline-none placeholder:text-gray-400"
              placeholder="Search tickets by ID, subject, customer or email..."
              value={search}
              aria-label="Search tickets"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search ? (
              <button
                type="button"
                aria-label="Clear search"
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="relative">
            <select
              className={SELECT_CLASS}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as TicketWorkflowStatus | "all");
                setPage(1);
              }}
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="pending_customer">Pending Customer</option>
              <option value="resolved">Resolved</option>
            </select>
            <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" aria-hidden />
          </div>

          <div className="relative">
            <select
              className={SELECT_CLASS}
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value as TicketPriority | "all");
                setPage(1);
              }}
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" aria-hidden />
          </div>

          <div className="relative">
            <select
              className={cn(SELECT_CLASS, "min-w-[160px]")}
              value={customerFilter}
              onChange={(e) => {
                setCustomerFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Customers</option>
              {COMPANY_POOL.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" aria-hidden />
          </div>

          <Button variant="outline" size="sm" type="button" className="gap-2">
            <Filter className="size-4 text-gray-700" aria-hidden />
            More Filters
          </Button>

          <div className="ms-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
              className={cn(
                "size-9 rounded-lg shadow-sm",
                viewMode === "list" &&
                  "border-[#0B1426] bg-[#0B1426] text-white hover:bg-[#152542]",
              )}
              title="List view"
              type="button"
            >
              <List className="size-4" aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-pressed={viewMode === "grid"}
              className={cn(
                "size-9 rounded-lg shadow-sm",
                viewMode === "grid" &&
                  "border-[#0B1426] bg-[#0B1426] text-white hover:bg-[#152542]",
              )}
              title="Grid view"
              type="button"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="size-4" aria-hidden />
            </Button>
          </div>
        </div>

        {viewMode === "list" ? (
          filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#e5e5e5] bg-white py-24 text-center text-gray-600">
              No tickets match filters.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-[1080px] w-full table-fixed text-[13px]">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="w-12 px-3 py-3">
                        <Checkbox
                          aria-label="Select page"
                          checked={headerChecked}
                          onCheckedChange={() => toggleHeader()}
                        />
                      </th>
                      <th className="ps-2 pe-3 py-3 text-start font-semibold">
                        Ticket ID
                      </th>
                      <th className="min-w-[260px] py-3 text-start font-semibold">
                        Subject
                      </th>
                      <th className="min-w-[230px] py-3 text-start font-semibold">
                        Customer
                      </th>
                      <th className="w-[130px] py-3 text-start font-semibold">
                        Status
                      </th>
                      <th className="w-[100px] py-3 text-start font-semibold">
                        Priority
                      </th>
                      <th className="w-[160px] py-3 text-start font-semibold">
                        Last Updated
                      </th>
                      <th className="w-[100px] py-3 text-center font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pageRows.map((t, ri) => {
                      const isSel = detailId === t.id;
                      const bg =
                        AVATAR_BG[t.avatarToneIndex % AVATAR_BG.length] ??
                        AVATAR_BG[0];
                      return (
                        <tr
                          key={t.id}
                          className={cn(
                            "cursor-pointer hover:bg-gray-50",
                            isSel &&
                              "bg-[#eaf3ff]/92 ring-2 ring-[#015AFD]/38 ring-inset",
                            ri % 2 === 1 && !isSel && "bg-gray-50/40",
                          )}
                          aria-selected={isSel ? true : undefined}
                          onClick={(e) => {
                            const tg = e.target as HTMLElement | null;
                            if (tg?.closest("[data-slot='checkbox'],button")) return;
                            handleOpenTicket(t);
                          }}
                        >
                          <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selected.has(t.id)}
                              onCheckedChange={() => toggleRow(t.id)}
                            />
                          </td>
                          <td className="ps-2 pe-3 align-middle font-mono font-bold text-[#015AFD]">
                            <button
                              type="button"
                              className="text-start hover:underline"
                              onClick={() => handleOpenTicket(t)}
                            >
                              {t.ticketCode}
                            </button>
                          </td>
                          <td className="truncate py-3 pe-4 font-semibold text-gray-900">
                            {t.subject}
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex gap-3">
                              <span
                                className={cn(
                                  "flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                                  bg,
                                )}
                              >
                                {t.initials}
                              </span>
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-gray-900">
                                  {t.companyName}
                                </div>
                                <div className="truncate text-[12px] text-gray-500">
                                  {t.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <StatusBadge status={t.status} />
                          </td>
                          <td className="py-3">
                            <PriorityText priority={t.priority} />
                          </td>
                          <td className="truncate py-3 text-gray-700 tabular-nums">
                            {t.lastUpdatedLabel}
                          </td>
                          <td
                            className="py-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                                onClick={() => handleOpenTicket(t)}
                                aria-label="View ticket"
                              >
                                <Eye className="size-4" />
                              </button>
                              <button
                                type="button"
                                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                              >
                                <MoreHorizontal className="size-4 rotate-90" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-[15px] text-muted-foreground">
            Compact ticket summaries for grid browsing will reuse this row data
            after operations signs off condensed cards.
          </div>
        )}

        <footer className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] font-medium text-gray-600">
            {totalRows === 0
              ? "No tickets match filters."
              : `Showing ${sliceStart + 1} to ${Math.min(totalRows, safePage * PAGE_SIZE)} of ${totalRows} tickets`}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0" disabled={safePage <= 1} onClick={() => setPage(1)}>
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="flex gap-1">
              {slots.map((s, idx) =>
                s === "ellipsis" ? (
                  <span key={`e-${idx}`} className="px-2 text-gray-400">…</span>
                ) : (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-9 min-w-9",
                      safePage === s &&
                        "border-[#0B1426] bg-[#0B1426] text-white hover:bg-[#152542]",
                    )}
                    onClick={() => setPage(s)}
                  >
                    {s}
                  </Button>
                ),
              )}
            </div>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="size-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}>
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </footer>
      </div>

      {detailRow ? (
        <TicketSheet
          row={detailRow}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          isUpdating={updatingTicketId === detailRow.id}
          onUpdateTicket={handleUpdateTicket}
          onAfterPublicReply={handleAfterPublicReply}
        />
      ) : null}
    </div>
  );
}
