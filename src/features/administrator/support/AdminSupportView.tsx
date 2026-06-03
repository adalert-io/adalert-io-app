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
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  User,
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
  adminUnread: boolean;
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
  adminUnread: boolean;
}

interface AdminTicketMessageDto {
  id: string;
  authorType: "customer" | "agent";
  authorName: string;
  body: string;
  visibility: "public" | "internal" | "note";
  attachment?: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  } | null;
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
              authorName: "adAlert Support • Priya Shah",
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
      adminUnread: idx % 4 === 0,
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
        Awaiting Reply
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
  /** Panel header mirrors consumer status wording. */
  if (status === "pending_customer") {
    return (
      <span className="inline-flex rounded-full bg-orange-400/14 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#c2410c] ring-1 ring-orange-300/55">
        Awaiting Reply
      </span>
    );
  }
  return <StatusBadge status={status} />;
}

const SELECT_CLASS =
  "min-w-[128px] appearance-none rounded-lg border border-gray-200 bg-white py-2.5 ps-4 pe-9 text-[13px] font-medium text-gray-700 shadow-xs transition-colors focus-visible:border-[#015AFD] focus-visible:ring-2 focus-visible:ring-[#015AFD]/25";

interface PendingAttachment {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64: string;
}

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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read attachment"));
        return;
      }
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 ?? "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read attachment"));
    reader.readAsDataURL(file);
  });
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
  const [composerMode, setComposerMode] = useState<"reply" | "note" | "internal">(
    "reply",
  );
  const [replyDraft, setReplyDraft] = useState("");
  const [rawMessages, setRawMessages] = useState<AdminTicketMessageDto[]>([]);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(
    null,
  );
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [nextStatus, setNextStatus] = useState<TicketWorkflowStatus>(row.status);
  const [nextPriority, setNextPriority] = useState<TicketPriority>(row.priority);

  const conversationMessages = useMemo(() => {
    return rawMessages.filter((message) => message.visibility === "public");
  }, [rawMessages]);

  const customerNotes = useMemo(() => {
    return rawMessages.filter((message) => message.visibility === "note");
  }, [rawMessages]);

  const teamInternalNotes = useMemo(() => {
    return rawMessages.filter((message) => message.visibility === "internal");
  }, [rawMessages]);

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
          if (response.status === 404) {
            if (!isUnmounted) setRawMessages([]);
            return;
          }
          throw new Error(payload.error || "Failed to load messages");
        }

        if (!isUnmounted) {
          setRawMessages(payload.messages ?? []);
        }
      } catch (error) {
        console.error("Failed to load ticket messages:", error);
        if (!isUnmounted) {
          setRawMessages([]);
        }
      } finally {
        if (!isUnmounted) setIsLoadingMessages(false);
      }
    }

    void loadMessages();
    return () => {
      isUnmounted = true;
    };
  }, [row.id]);

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
                  <option value="pending_customer">Awaiting Reply</option>
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
                ) : conversationMessages.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-4 text-[13px] text-gray-600">
                    No messages in this thread yet.
                  </div>
                ) : (
                  conversationMessages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "rounded-xl border px-4 py-3 shadow-xs",
                        m.authorType === "customer"
                          ? "border-[#bae6fd] bg-[#f0f9ff]"
                          : "border-[#bbf7d0] bg-[#f0fdf4]",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                            m.authorType === "customer" ? "bg-[#0369a1]" : "bg-emerald-600",
                          )}
                        >
                          {m.authorType === "customer" ? row.initials : "SU"}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-gray-900">
                            {m.authorName}
                          </p>
                          <p className="text-[12px] text-gray-600">
                            {formatDateLabel(m.createdAt)}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-[13px] leading-relaxed text-gray-800">
                        {m.body}
                      </p>
                      {m.attachment ? (
                        <p className="mt-2 text-[12px] font-medium text-[#015AFD]">
                          Attachment: {m.attachment.fileName}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            ) : panelTab === "notes" ? (
              <div className="space-y-6">
                <div>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
                    Customer notes
                  </p>
                  {customerNotes.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-gray-200 p-4 text-[13px] text-gray-600">
                      No customer-facing notes yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {customerNotes.map((note) => (
                        <div
                          key={note.id}
                          className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3"
                        >
                          <p className="text-[12px] text-amber-900/70">
                            {formatDateLabel(note.createdAt)}
                          </p>
                          <p className="mt-2 text-[13px] leading-relaxed text-amber-950">
                            {note.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-gray-500">
                    Team internal
                  </p>
                  {teamInternalNotes.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-gray-200 p-4 text-[13px] text-gray-600">
                      No internal notes yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {teamInternalNotes.map((note) => (
                        <div
                          key={note.id}
                          className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                        >
                          <p className="text-[12px] text-gray-500">
                            {formatDateLabel(note.createdAt)} · Internal
                          </p>
                          <p className="mt-2 text-[13px] leading-relaxed text-gray-800">
                            {note.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap rounded-xl border border-dashed border-gray-200 p-4 text-[13px] leading-relaxed text-gray-700">
                {row.historySnippet}
              </pre>
            )}
          </div>
        </div>

        <SheetFooter className="border-t border-gray-100 bg-white p-4">
          <div className="w-full space-y-3">
            <div className="flex rounded-lg bg-gray-100 p-1 text-[12px] font-semibold">
              {(
                [
                  ["reply", "Reply"],
                  ["note", "Customer note"],
                  ["internal", "Team internal"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={cn(
                    "flex-1 rounded-md px-1 py-1.5",
                    composerMode === mode
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-600",
                  )}
                  onClick={() => {
                    setComposerMode(mode);
                    if (mode !== "reply") setPendingAttachment(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <Textarea
              rows={4}
              className="resize-none rounded-xl border-gray-200"
              placeholder={
                composerMode === "reply"
                  ? "Type your reply..."
                  : composerMode === "note"
                    ? "Add a note the customer can read (they will be emailed)..."
                    : "Add a team-only internal note..."
              }
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
            />
            {pendingAttachment ? (
              <p className="text-[12px] text-gray-600">
                Attached: {pendingAttachment.fileName}
                <button
                  type="button"
                  className="ms-2 text-[#015AFD] hover:underline"
                  onClick={() => setPendingAttachment(null)}
                >
                  Remove
                </button>
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                {composerMode === "reply" ? (
                  <>
                    <input
                      id={`attach-${row.id}`}
                      type="file"
                      className="sr-only"
                      accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        if (file.size > 15 * 1024 * 1024) {
                          toast.error("Attachment must be 15 MB or smaller.");
                          return;
                        }
                        try {
                          const contentBase64 = await fileToBase64(file);
                          setPendingAttachment({
                            fileName: file.name,
                            mimeType: file.type || "application/octet-stream",
                            sizeBytes: file.size,
                            contentBase64,
                          });
                        } catch {
                          toast.error("Couldn't read attachment.");
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="text-gray-500"
                      onClick={() => document.getElementById(`attach-${row.id}`)?.click()}
                      aria-label="Attach file"
                    >
                      <Paperclip className="size-5" aria-hidden />
                    </Button>
                  </>
                ) : null}
              </div>
              <Button
                type="button"
                disabled={isSendingMessage || !replyDraft.trim()}
                className="rounded-xl bg-[#015AFD] font-semibold shadow-sm hover:bg-[#014bcc]"
                onClick={async () => {
                  const body = replyDraft.trim();
                  if (!body) return;

                  const visibility =
                    composerMode === "internal"
                      ? "internal"
                      : composerMode === "note"
                        ? "note"
                        : "public";
                  setIsSendingMessage(true);
                  try {
                    const response = await fetch(
                      `/api/admin/support/tickets/${row.id}/messages`,
                      {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          body,
                          visibility,
                          attachment:
                            visibility === "public" && pendingAttachment
                              ? pendingAttachment
                              : undefined,
                        }),
                      },
                    );
                    const payload = (await response.json()) as {
                      message?: AdminTicketMessageDto;
                      error?: string;
                    };
                    if (!response.ok || !payload.message) {
                      throw new Error(payload.error || "Failed to send message");
                    }

                    setRawMessages((prev) => [...prev, payload.message!]);
                    setReplyDraft("");
                    setPendingAttachment(null);
                    setPanelTab(visibility === "public" ? "messages" : "notes");
                    if (visibility === "public") {
                      onAfterPublicReply(row.id);
                    }
                    toast.success(
                      visibility === "public"
                        ? "Reply sent to customer"
                        : visibility === "note"
                          ? "Customer note saved and emailed"
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
                  : composerMode === "reply"
                    ? "Send Reply"
                    : "Save Note"}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function AdminSupportView() {
  const [rows, setRows] = useState<SupportTicketRow[]>([]);
  const [isArchivedView, setIsArchivedView] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    TicketWorkflowStatus | "all"
  >("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">(
    "all",
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const [newSubject, setNewSubject] = useState("");
  const [newCustomer, setNewCustomer] = useState(COMPANY_POOL[0]);
  const [newPriority, setNewPriority] = useState<TicketPriority>("medium");
  const [newBody, setNewBody] = useState("");
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);
  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null);

  const loadAdminTickets = useCallback(async () => {
    let isUnmounted = false;
    async function load() {
      setIsLoadingRows(true);
      try {
        const response = await fetch(`/api/admin/support/tickets?archived=${isArchivedView ? "1" : "0"}`, {
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
            adminUnread: ticket.adminUnread,
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
        setSelected(new Set());
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
    await load();
    return () => {
      isUnmounted = true;
    };
  }, [isArchivedView]);

  useEffect(() => {
    void loadAdminTickets();
  }, [loadAdminTickets]);

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
    return list;
  }, [rows, search, statusFilter, priorityFilter]);

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

  const markTicketsRead = useCallback(async (ticketIds: string[]) => {
    if (ticketIds.length === 0) return;
    setIsMarkingRead(true);
    try {
      const response = await fetch("/api/admin/support/tickets/mark-read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticketIds }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to mark tickets as read");
      }
      setRows((prev) =>
        prev.map((row) =>
          ticketIds.includes(row.id) ? { ...row, adminUnread: false } : row,
        ),
      );
    } catch (error) {
      console.error("Failed to mark tickets read:", error);
      toast.error("Couldn't mark tickets as read");
    } finally {
      setIsMarkingRead(false);
    }
  }, []);

  const updateArchiveState = useCallback(
    async (ticketIds: string[], archived: boolean) => {
      if (ticketIds.length === 0) return;
      setIsMarkingRead(true);
      try {
        await Promise.all(
          ticketIds.map(async (ticketId) => {
            const response = await fetch(`/api/admin/support/tickets/${ticketId}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ archived }),
            });
            const payload = (await response.json()) as { error?: string };
            if (!response.ok) {
              throw new Error(payload.error || "Failed to update archive state");
            }
          }),
        );
        toast.success(archived ? "Tickets archived" : "Tickets restored");
        setSelected(new Set());
        await loadAdminTickets();
      } catch (error) {
        toast.error((error as Error).message || "Couldn't update archive state");
      } finally {
        setIsMarkingRead(false);
      }
    },
    [loadAdminTickets],
  );

  const deleteTicketPermanently = useCallback(
    async (ticketId: string) => {
      setIsMarkingRead(true);
      try {
        const response = await fetch(`/api/admin/support/tickets/${ticketId}`, {
          method: "DELETE",
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to delete ticket");
        }
        toast.success("Ticket deleted permanently");
        setDeleteTicketId(null);
        await loadAdminTickets();
      } catch (error) {
        toast.error((error as Error).message || "Couldn't delete ticket");
      } finally {
        setIsMarkingRead(false);
      }
    },
    [loadAdminTickets],
  );

  const handleOpenTicket = useCallback((t: SupportTicketRow) => {
    setActiveTicketId(t.id);
    setDetailOpen(true);
    void markTicketsRead([t.id]);
  }, [markTicketsRead]);

  const detailRow =
    activeTicketId === null ? null : rows.find((r) => r.id === activeTicketId) ?? null;
  const deleteTicketRow =
    deleteTicketId === null ? null : rows.find((r) => r.id === deleteTicketId) ?? null;

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
      adminUnread: true,
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
              : isArchivedView
                ? "Review archived tickets, restore them, or delete permanently"
                : "Manage customer support tickets and inquiries"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant={isArchivedView ? "default" : "outline"}
            className={cn(
              "gap-2 rounded-xl border-[#e5e5e5] bg-white shadow-sm",
              isArchivedView && "text-black hover:text-black",
            )}
            onClick={() => {
              setIsArchivedView((prev) => !prev);
              setPage(1);
            }}
          >
            {isArchivedView ? "See Active" : "See Archived"}
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

      <Dialog open={deleteTicketId !== null} onOpenChange={(open) => !open && setDeleteTicketId(null)}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete archived ticket permanently?</DialogTitle>
            <DialogDescription>
              {deleteTicketRow
                ? `This will permanently delete ${deleteTicketRow.ticketCode} and its messages. This action cannot be undone.`
                : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTicketId(null)}>
              Cancel
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              disabled={!deleteTicketId || isMarkingRead}
              onClick={() => {
                if (!deleteTicketId) return;
                void deleteTicketPermanently(deleteTicketId);
              }}
            >
              {isMarkingRead ? "Deleting..." : "Delete Permanently"}
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
          title="Awaiting Reply"
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
              <option value="pending_customer">Awaiting Reply</option>
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
        </div>

        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#015AFD]/25 bg-[#eaf3ff]/60 px-4 py-3">
            <p className="text-[13px] font-semibold text-gray-800">
              {selected.size} ticket{selected.size === 1 ? "" : "s"} selected
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg bg-white"
              disabled={isMarkingRead}
              onClick={() => {
                void updateArchiveState(Array.from(selected), !isArchivedView);
              }}
            >
              {isMarkingRead
                ? "Updating..."
                : isArchivedView
                  ? "Restore Selected"
                  : "Archive Selected"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-lg"
              onClick={() => setSelected(new Set())}
            >
              Clear selection
            </Button>
          </div>
        ) : null}

        {filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#e5e5e5] bg-white py-24 text-center text-gray-600">
              No tickets match filters.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white">
              <div
                className={cn(
                  isArchivedView ? "w-full overflow-hidden" : "overflow-x-auto",
                )}
              >
                <table
                  className={cn(
                    "w-full text-[13px]",
                    isArchivedView ? "table-fixed" : "table-fixed min-w-[1080px]",
                  )}
                >
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="w-12 px-3 py-3">
                        <Checkbox
                          aria-label="Select page"
                          checked={headerChecked}
                          onCheckedChange={() => toggleHeader()}
                        />
                      </th>
                      <th
                        className={cn(
                          "py-3 text-start font-semibold",
                          isArchivedView ? "w-[108px] ps-2 pe-2" : "ps-2 pe-3",
                        )}
                      >
                        Ticket ID
                      </th>
                      <th
                        className={cn(
                          "py-3 text-start font-semibold",
                          isArchivedView ? "w-[28%]" : "min-w-[260px]",
                        )}
                      >
                        Subject
                      </th>
                      <th
                        className={cn(
                          "py-3 text-start font-semibold",
                          isArchivedView ? "w-[24%]" : "min-w-[230px]",
                        )}
                      >
                        Customer
                      </th>
                      {!isArchivedView ? (
                        <th className="w-[130px] py-3 text-start font-semibold">
                          Status
                        </th>
                      ) : null}
                      {!isArchivedView ? (
                        <th className="w-[100px] py-3 text-start font-semibold">
                          Priority
                        </th>
                      ) : null}
                      <th
                        className={cn(
                          "py-3 text-start font-semibold",
                          isArchivedView ? "w-[132px]" : "w-[160px]",
                        )}
                      >
                        Last Updated
                      </th>
                      <th
                        className={cn(
                          "py-3 text-center font-semibold",
                          isArchivedView ? "w-[148px]" : "w-[100px]",
                        )}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pageRows.map((t, ri) => {
                      const bg =
                        AVATAR_BG[t.avatarToneIndex % AVATAR_BG.length] ??
                        AVATAR_BG[0];
                      return (
                        <tr
                          key={t.id}
                          className={cn(
                            "group cursor-pointer hover:bg-gray-50",
                            t.adminUnread && "bg-[#f0f7ff]/90",
                            ri % 2 === 1 && !t.adminUnread && "bg-gray-50/40",
                          )}
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
                          <td
                            className={cn(
                              "align-middle font-mono font-bold text-[#015AFD]",
                              isArchivedView ? "truncate ps-2 pe-2" : "ps-2 pe-3",
                            )}
                          >
                            <button
                              type="button"
                              className="max-w-full truncate text-start hover:underline"
                              onClick={() => handleOpenTicket(t)}
                            >
                              {t.ticketCode}
                            </button>
                          </td>
                          <td className="truncate py-3 pe-4 text-gray-900">
                            <div className="flex min-w-0 items-center gap-2">
                              {t.adminUnread ? (
                                <span
                                  className="size-2 shrink-0 rounded-full bg-[#015AFD]"
                                  aria-label="Unread"
                                />
                              ) : null}
                              <span className={cn("truncate", t.adminUnread && "font-bold")}>
                                {t.subject}
                              </span>
                            </div>
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
                          {!isArchivedView ? (
                            <td className="py-3">
                              <StatusBadge status={t.status} />
                            </td>
                          ) : null}
                          {!isArchivedView ? (
                            <td className="py-3">
                              <PriorityText priority={t.priority} />
                            </td>
                          ) : null}
                          <td className="truncate py-3 text-gray-700 tabular-nums">
                            {t.lastUpdatedLabel}
                          </td>
                          <td
                            className="py-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              className={cn(
                                "flex items-center justify-center gap-1",
                                isArchivedView
                                  ? "flex-wrap"
                                  : "opacity-0 transition-opacity group-hover:opacity-100",
                              )}
                            >
                              {!isArchivedView ? (
                                <button
                                  type="button"
                                  className="rounded-lg px-2 py-1 text-[12px] font-semibold text-amber-700 hover:bg-amber-100"
                                  onClick={() => void updateArchiveState([t.id], true)}
                                >
                                  Archive
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="rounded-lg px-1.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                                    onClick={() => void updateArchiveState([t.id], false)}
                                  >
                                    Unarchive
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-lg px-1.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                                    onClick={() => setDeleteTicketId(t.id)}
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
