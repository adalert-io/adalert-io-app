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
  ClipboardList,
  Clock,
  DollarSign,
  Download,
  Eye,
  Filter,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Search,
  X,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type SubscriptionDemoPlanKey = "professional" | "starter" | "trial";
type SubscriptionDemoStatus =
  | "active"
  | "trial"
  | "paused"
  | "past_due"
  | "canceled";

interface SubscriptionDemoBillingLine {
  dateLabel: string;
  amountLabel: string;
}

interface SubscriptionDemoRow {
  id: string;
  companyName: string;
  email: string;
  initials: string;
  avatarToneIndex: number;
  planKey: SubscriptionDemoPlanKey;
  status: SubscriptionDemoStatus;
  trialDaysLeft?: number;
  nextBillingLabel: string;
  mrr: number;
  subscriptionId: string;
  customerSinceLabel: string;
  cardLast4: string;
  cardExpiryLabel: string;
  billingHistory: SubscriptionDemoBillingLine[];
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

const PAGE_SIZE = 8;

function initialsFromName(name: string): string {
  const base = name.replace(/\s*\(\d+\)\s*$/, "").trim();
  const words = base
    .replace(/&/g, " ")
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const f = words[0]?.[0];
  const s = words.length > 1 ? words[1]?.[0] : words[0]?.[1];
  return `${f ?? "?"}${s ?? "?"}`.toUpperCase().slice(0, 2);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);
}

function monthlyPrice(planKey: SubscriptionDemoPlanKey): number {
  if (planKey === "professional") return 230;
  if (planKey === "starter") return 89;
  return 0;
}

function planLabel(planKey: SubscriptionDemoPlanKey): string {
  if (planKey === "professional") return "Professional";
  if (planKey === "starter") return "Starter";
  return "Trial";
}

/** Deterministic Stripe-like subscription id (~26 chars suffix). */
function fakeSubscriptionId(index: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let tail = "";
  let n = index * 94811 + 10007;
  for (let i = 0; i < 26; i++) {
    tail += alphabet[n % alphabet.length];
    n = Math.floor(n / alphabet.length) + i * 17;
  }
  return `sub_1NF5${tail}`;
}

function statusForIndex(i: number): SubscriptionDemoStatus {
  if (i >= 118) return "canceled";
  if (i % 31 === 0 && i !== 0) return "paused";
  if (i % 43 === 0 && i !== 0) return "past_due";
  if (i >= 112 && i < 118) return "trial";
  return "active";
}

function seedSubscriptions(): SubscriptionDemoRow[] {
  return Array.from({ length: 128 }, (_, rawI) => {
    const i = rawI;
    let name =
      COMPANY_POOL[i % COMPANY_POOL.length] +
      (i >= COMPANY_POOL.length ? ` (${1 + Math.floor(i / COMPANY_POOL.length)})` : "");
    const slug = slugify(name.replace(/\s*\(\d+\)\s*$/, ""));
    const email =
      i === 0
        ? "billing.mcgrath@firmco.com"
        : `subscriptions.${slug}.${i % 47}@${i % 2 === 0 ? "firmco.com" : "mail.io"}`;

    const planRoll: SubscriptionDemoPlanKey =
      i === 0
        ? "professional"
        : i % 7 === 0
          ? "trial"
          : i % 3 === 0
            ? "starter"
            : "professional";

    const status = statusForIndex(i);

    let planKey: SubscriptionDemoPlanKey = planRoll;
    if (status === "trial") planKey = "trial";

    const price = monthlyPrice(planKey);
    const year = 2025;
    const day = Math.max(10, Math.min(28, ((i % 18) || 15) + 9));
    const prevDay = Math.max(6, ((i % 11) || 10) + 4);

    const nextBillingLabel =
      i === 0 ? "May 15, 2025" : `${i % 2 === 0 ? "Jun" : "May"} ${day}, ${year}`;

    const history: SubscriptionDemoBillingLine[] =
      i === 0
        ? [
            { dateLabel: "May 09, 2025", amountLabel: "$230.00" },
            { dateLabel: "Apr 09, 2025", amountLabel: "$230.00" },
            { dateLabel: "Mar 09, 2025", amountLabel: "$230.00" },
          ]
        : [
            { dateLabel: `May ${Math.min(day, 26)}, ${year}`, amountLabel: `$${price.toFixed(2)}` },
            {
              dateLabel: `Apr ${Math.min(day + 3, 28)}, ${year}`,
              amountLabel: `$${price.toFixed(2)}`,
            },
            {
              dateLabel: `Mar ${prevDay}, ${year}`,
              amountLabel: `$${price.toFixed(2)}`,
            },
          ];

    return {
      id: `sub-row-${String(i + 1).padStart(3, "0")}`,
      companyName: name,
      email,
      initials: initialsFromName(name),
      avatarToneIndex: i % AVATAR_BG.length,
      planKey,
      status,
      trialDaysLeft: status === "trial" ? 4 + ((i * 11) % 18) : undefined,
      nextBillingLabel,
      mrr: price,
      subscriptionId:
        i === 0
          ? "sub_1NF5G2LkdIwhu7lXBaB7C9D1"
          : fakeSubscriptionId(i),
      customerSinceLabel: i === 0 ? "Apr 10, 2025" : `Jan ${prevDay}, 2024`,
      cardLast4: i === 0 ? "4242" : ["4242", "5513", "3782", "6011"][i % 4],
      cardExpiryLabel:
        i === 0 ? "04/28" : `${String(((i % 12) || 10) % 12 + 1).padStart(2, "0")}/${26 + ((i >> 3) % 4)}`,
      billingHistory: history,
    };
  });
}

const ALL_SUBSCRIPTIONS = seedSubscriptions();

function payoutSlots(
  currentPage: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const last = totalPages;

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", last];
  }

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

function SubscriptionStatusBadge({ row }: { row: SubscriptionDemoRow }) {
  if (row.status === "active") {
    return (
      <span className="inline-flex rounded-full bg-[#22c55e]/14 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#15803d] ring-1 ring-[#22c55e]/28">
        Active
      </span>
    );
  }
  if (row.status === "trial") {
    const days = row.trialDaysLeft ?? 14;
    return (
      <div className="space-y-1">
        <span className="inline-flex rounded-full bg-[#3b82f6]/14 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#1d4ed8] ring-1 ring-[#3b82f6]/30">
          Trial
        </span>
        <p className="text-[11px] font-medium text-[#64748b]">
          {days} days left
        </p>
      </div>
    );
  }
  if (row.status === "past_due") {
    return (
      <span className="inline-flex rounded-full bg-orange-400/14 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#c2410c] ring-1 ring-orange-300/55">
        Past Due
      </span>
    );
  }
  if (row.status === "paused") {
    return (
      <span className="inline-flex rounded-full bg-amber-200/55 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#92400e] ring-1 ring-amber-300/65">
        Paused
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-slate-200/55 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#57534e] ring-1 ring-slate-300/70">
      Canceled
    </span>
  );
}

function money(n: number) {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const SELECT_CLASS =
  "min-w-[128px] appearance-none rounded-lg border border-gray-200 bg-white py-2.5 ps-4 pe-9 text-[13px] font-medium text-gray-700 shadow-xs transition-colors focus-visible:border-[#015AFD] focus-visible:ring-2 focus-visible:ring-[#015AFD]/25";

interface DetailRowProps {
  label: string;
  children: ReactNode;
}

function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-6 text-[13px]">
      <span className="shrink-0 font-medium text-gray-500">{label}</span>
      <span className="min-w-0 text-end font-semibold leading-snug text-gray-900">
        {children}
      </span>
    </div>
  );
}

function VisaBadge() {
  return (
    <span
      aria-hidden
      className="inline-flex h-[22px] min-w-[40px] shrink-0 items-center justify-center rounded bg-[#1a1f71] px-2 text-[10px] font-black tracking-wider text-white"
    >
      VISA
    </span>
  );
}

interface SubscriptionDetailPanelProps {
  row: SubscriptionDemoRow;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

function SubscriptionDetailPanel({
  row,
  open,
  onOpenChange,
}: SubscriptionDetailPanelProps) {
  const planName = planLabel(row.planKey);
  const priceLine = `${money(monthlyPrice(row.planKey))} / month`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        showCloseButton
        side="right"
        className="gap-0 p-0 sm:max-w-[440px]"
      >
        <div className="flex h-full min-h-0 flex-col bg-white">
          <SheetHeader className="gap-3 border-b border-gray-100 p-6 text-start">
            <SheetTitle className="text-xl font-bold leading-snug tracking-tight text-gray-900">
              {row.companyName}
            </SheetTitle>
            <p className="text-[13px] font-medium leading-snug text-[#64748b]">
              {row.email}
            </p>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
            <section className="space-y-4">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#475569]">
                Subscription details
              </h3>
              <div className="space-y-3">
                <DetailRow label="Plan">{planName}</DetailRow>
                <div className="flex items-start justify-between gap-6 text-[13px]">
                  <span className="font-medium text-gray-500">Status</span>
                  <span className="flex items-center gap-2 font-semibold text-gray-900">
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        row.status === "active"
                          ? "bg-[#22c55e]"
                          : row.status === "trial"
                            ? "bg-[#3b82f6]"
                            : row.status === "paused"
                              ? "bg-amber-500"
                              : row.status === "past_due"
                                ? "bg-orange-500"
                                : "bg-slate-400",
                      )}
                      aria-hidden
                    />
                    {row.status === "active"
                      ? "Active"
                      : row.status === "trial"
                        ? "Trial"
                        : row.status === "paused"
                          ? "Paused"
                          : row.status === "past_due"
                            ? "Past Due"
                            : "Canceled"}
                  </span>
                </div>
                <DetailRow label="Billing cycle">Monthly</DetailRow>
                <DetailRow label="Price">{priceLine}</DetailRow>
                <DetailRow label="Quantity">1 Ad Account</DetailRow>
                <DetailRow label="Next billing">{row.nextBillingLabel}</DetailRow>
                <DetailRow label="MRR">{money(row.mrr)}</DetailRow>
                <DetailRow label="Subscription ID">
                  <span className="font-mono font-medium text-[12px] break-all">
                    {row.subscriptionId}
                  </span>
                </DetailRow>
                <DetailRow label="Customer since">{row.customerSinceLabel}</DetailRow>
              </div>
            </section>

            <section className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
              <h3 className="mb-4 text-[13px] font-semibold text-gray-900">
                Payment method
              </h3>
              <div className="flex flex-wrap items-center gap-4">
                <VisaBadge />
                <div className="min-w-0 space-y-0.5">
                  <p className="font-mono text-[13px] font-semibold text-gray-900">
                    **** {row.cardLast4}
                  </p>
                  <p className="text-[12px] text-gray-500">
                    Expires {row.cardExpiryLabel}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 rounded-lg border-[#015AFD] text-[#015AFD] hover:bg-blue-50"
              >
                Update
              </Button>
            </section>

            <section className="space-y-4">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#475569]">
                Billing history
              </h3>
              <ul className="space-y-4">
                {row.billingHistory.map((entry, entryIdx) => (
                  <li
                    key={`${row.subscriptionId}-${entryIdx}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">
                        {entry.amountLabel}
                      </p>
                      <p className="text-[12px] text-gray-500">{entry.dateLabel}</p>
                    </div>
                    <span className="inline-flex shrink-0 rounded-full bg-[#22c55e]/14 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#15803d] ring-1 ring-[#22c55e]/25">
                      Paid
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <SheetFooter className="border-t border-gray-100 p-6 sm:flex-col sm:space-x-0">
            <Button
              type="button"
              className="h-11 w-full rounded-xl bg-[#015AFD] font-semibold text-white hover:bg-[#014bcc]"
            >
              Manage subscription
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl border-[#fca5a5] font-semibold text-[#dc2626] hover:bg-[#fef2f2]"
            >
              Cancel subscription
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AdminSubscriptionsView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [statusFilter, setStatusFilter] = useState<
    SubscriptionDemoStatus | "all"
  >("all");
  const [planFilter, setPlanFilter] = useState<SubscriptionDemoPlanKey | "all">(
    "all",
  );
  const [detailRowId, setDetailRowId] = useState<string | null>(
    ALL_SUBSCRIPTIONS[0]?.id ?? null,
  );
  const [detailOpen, setDetailOpen] = useState(true);

  const filtered = useMemo(() => {
    let rows = ALL_SUBSCRIPTIONS;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          row.companyName.toLowerCase().includes(q) ||
          row.email.toLowerCase().includes(q) ||
          planLabel(row.planKey).toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "all") {
      rows = rows.filter((row) => row.status === statusFilter);
    }

    if (planFilter !== "all") {
      rows = rows.filter((row) => row.planKey === planFilter);
    }

    return rows;
  }, [search, statusFilter, planFilter]);

  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const safePage = Math.min(Math.max(1, page), totalPages);
  const sliceStart = (safePage - 1) * PAGE_SIZE;
  const pagedRows = filtered.slice(sliceStart, sliceStart + PAGE_SIZE);

  useEffect(() => {
    if (filtered.length === 0) {
      setDetailRowId(null);
      setDetailOpen(false);
      return;
    }

    setDetailRowId((prev) => {
      if (prev && filtered.some((r) => r.id === prev)) {
        return prev;
      }
      return filtered[0]?.id ?? null;
    });
  }, [filtered]);

  const pageIdsOnPage = useMemo(() => pagedRows.map((r) => r.id), [pagedRows]);
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
      if (allPageSelected) {
        for (const id of pageIdsOnPage) next.delete(id);
      } else {
        for (const id of pageIdsOnPage) next.add(id);
      }
      return next;
    });
  }, [allPageSelected, pageIdsOnPage]);

  const handleResetPaging = () => setPage(1);

  const detailRow =
    detailRowId === null
      ? null
      : (ALL_SUBSCRIPTIONS.find((r) => r.id === detailRowId) ?? null);

  const handleActivateRow = (row: SubscriptionDemoRow) => {
    setDetailRowId(row.id);
    setDetailOpen(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 pb-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl space-y-2">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 sm:text-[30px]">
            Subscriptions
          </h1>
          <p className="text-[15px] text-[#7A7D9C]">
            Manage all customer subscriptions and plans
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            type="button"
            className="gap-2 rounded-xl border-[#e5e5e5] bg-white shadow-sm"
          >
            <Filter className="size-4 text-gray-700" aria-hidden />
            Filters
          </Button>
          <Button
            variant="outline"
            type="button"
            className="gap-2 rounded-xl border-[#e5e5e5] bg-white shadow-sm"
          >
            <Download className="size-4 text-gray-700" aria-hidden />
            Export
          </Button>
        </div>
      </header>

      <section className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <DashboardMetricCard
          title="Total Subscriptions"
          value="128"
          trend="↑ 12% vs last 7 days"
          trendTone="positive"
          Icon={ClipboardList}
          accentClassName="bg-[#3b82f6]/10 text-[#2563eb]"
        />
        <DashboardMetricCard
          title="Active Subscriptions"
          value="102"
          trend="↑ 10% vs last 7 days"
          trendTone="positive"
          Icon={CircleCheckBig}
          accentClassName="bg-[#22c55e]/15 text-[#16a34a]"
        />
        <DashboardMetricCard
          title="Trial Subscriptions"
          value="8"
          trend="↓ 2% vs last 7 days"
          trendTone="negative"
          Icon={Clock}
          accentClassName="bg-orange-400/18 text-orange-700"
        />
        <DashboardMetricCard
          title="Canceled"
          value="18"
          trend="↑ 5% vs last 7 days"
          trendTone="positive"
          Icon={XCircle}
          accentClassName="bg-[#ef4444]/12 text-[#ef4444]"
        />
        <DashboardMetricCard
          title="Monthly Recurring Revenue"
          value="$24,350"
          trend="↑ 14% vs last 7 days"
          trendTone="positive"
          Icon={DollarSign}
          accentClassName="bg-emerald-400/18 text-emerald-700"
        />
      </section>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-200">
            <Search className="size-5 shrink-0 text-[#015AFD]" aria-hidden />
            <input
              className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
              placeholder="Search by customer, email or plan..."
              value={search}
              aria-label="Search subscriptions"
              onChange={(e) => {
                setSearch(e.target.value);
                handleResetPaging();
              }}
            />
            {search ? (
              <button
                type="button"
                aria-label="Clear search"
                className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                onClick={() => {
                  setSearch("");
                  handleResetPaging();
                }}
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="relative">
            <select
              className={SELECT_CLASS}
              aria-label="Filter by subscription status"
              value={statusFilter}
              onChange={(e) => {
                const v = e.target.value as SubscriptionDemoStatus | "all";
                setStatusFilter(v);
                handleResetPaging();
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="paused">Paused</option>
              <option value="past_due">Past Due</option>
              <option value="canceled">Canceled</option>
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
            />
          </div>

          <div className="relative">
            <select
              className={SELECT_CLASS}
              aria-label="Filter by plan"
              value={planFilter}
              onChange={(e) => {
                const v = e.target.value as SubscriptionDemoPlanKey | "all";
                setPlanFilter(v);
                handleResetPaging();
              }}
            >
              <option value="all">All Plans</option>
              <option value="professional">Professional</option>
              <option value="starter">Starter</option>
              <option value="trial">Trial</option>
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
            />
          </div>

          <div className="ms-auto flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-pressed={viewMode === "grid"}
              title="Grid view"
              onClick={() => setViewMode("grid")}
              className={cn(
                "size-9 rounded-lg border-[#e5e5e5] bg-white text-gray-600 shadow-sm",
                viewMode === "grid" &&
                  "border-[#0B1426] bg-[#0B1426] text-white hover:bg-[#152542] hover:text-white",
              )}
            >
              <LayoutGrid className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-pressed={viewMode === "list"}
              title="List view"
              onClick={() => setViewMode("list")}
              className={cn(
                "size-9 rounded-lg border-[#e5e5e5] bg-white text-gray-600 shadow-sm",
                viewMode === "list" &&
                  "border-[#0B1426] bg-[#0B1426] text-white hover:bg-[#152542] hover:text-white",
              )}
            >
              <List className="size-4" aria-hidden />
            </Button>
          </div>
        </div>

        {viewMode === "list" ? (
          filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#e5e5e5] bg-white py-24 text-center text-[14px] text-gray-600">
              No subscriptions match your filters.
            </div>
          ) : (
            <SubscriptionsTable
              rows={pagedRows}
              selected={selected}
              toggleRow={toggleRow}
              headerChecked={headerChecked}
              toggleHeader={toggleHeader}
              highlightedId={detailRowId}
              onActivateRow={handleActivateRow}
            />
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-[15px] text-muted-foreground">
            Subscription tiles in grid view can summarize plan, renewal, and churn
            alerts once UX signs off compact card primitives.
          </div>
        )}

        <footer className="flex flex-col items-center justify-between gap-4 px-2 sm:flex-row">
          <p className="text-[13px] font-medium text-gray-600">
            {totalRows === 0
              ? "No subscriptions match your filters."
              : `Showing ${sliceStart + 1} to ${Math.min(safePage * PAGE_SIZE, totalRows)} of ${totalRows} subscriptions`}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage(1)}
              className="h-9 w-9 p-0"
              aria-label="First page"
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-9 w-9 p-0"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <div className="flex items-center gap-1">
              {slots.map((item, idx) =>
                item === "ellipsis" ? (
                  <span
                    key={`e-${idx}`}
                    className="px-1.5 text-[13px] text-gray-400"
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={item}
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(item)}
                    aria-current={safePage === item ? "page" : undefined}
                    className={cn(
                      "h-9 min-w-9 px-2 text-[13px] font-medium",
                      safePage === item &&
                        "border-[#0B1426] bg-[#0B1426] text-white hover:bg-[#152542]",
                    )}
                  >
                    {item}
                  </Button>
                ),
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-9 w-9 p-0"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage(totalPages)}
              className="h-9 w-9 p-0"
              aria-label="Last page"
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </footer>
      </div>

      {detailRow ? (
        <SubscriptionDetailPanel
          row={detailRow}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      ) : null}
    </div>
  );
}

function SubscriptionsTable({
  rows,
  selected,
  toggleRow,
  headerChecked,
  toggleHeader,
  highlightedId,
  onActivateRow,
}: {
  rows: SubscriptionDemoRow[];
  selected: Set<string>;
  toggleRow: (id: string) => void;
  headerChecked: boolean | "indeterminate";
  toggleHeader: () => void;
  highlightedId: string | null;
  onActivateRow: (row: SubscriptionDemoRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-none">
      <div className="max-[1199px]:overflow-x-auto">
        <table className="min-w-[1120px] w-full table-fixed text-[13px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="w-[48px] px-3 py-3 text-start">
                <Checkbox
                  checked={headerChecked}
                  aria-label="Select all on this page"
                  onCheckedChange={() => toggleHeader()}
                />
              </th>
              <th className="min-w-[220px] ps-2 pe-4 py-3 text-start font-semibold text-gray-700">
                Customer
              </th>
              <th className="w-[200px] py-3 pe-4 text-start font-semibold text-gray-700">
                Plan
              </th>
              <th className="w-[148px] py-3 pe-4 text-start font-semibold text-gray-700">
                Status
              </th>
              <th className="w-[120px] py-3 pe-4 text-start font-semibold text-gray-700">
                Billing Cycle
              </th>
              <th className="w-[148px] py-3 pe-4 text-start font-semibold text-gray-700">
                Next Billing
              </th>
              <th className="w-[100px] py-3 pe-4 text-start font-semibold text-gray-700">
                MRR
              </th>
              <th className="w-[132px] py-3 px-4 text-center font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const bg =
                AVATAR_BG[row.avatarToneIndex % AVATAR_BG.length] ??
                "bg-[#3b82f6]";
              const isDetail = highlightedId === row.id;
              const planTitle = planLabel(row.planKey);
              const monthly = monthlyPrice(row.planKey);

              return (
                <tr
                  key={row.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-gray-50",
                    isDetail &&
                      "bg-[#eaf3ff]/90 ring-2 ring-[#015AFD]/38 ring-inset hover:bg-[#dfeaff]/92",
                  )}
                  aria-selected={isDetail ? true : undefined}
                  onClick={(e) => {
                    const t = e.target as HTMLElement | null;
                    if (t?.closest("[data-slot='checkbox'],button,a")) return;
                    onActivateRow(row);
                  }}
                >
                  <td
                    className="px-3 py-4 align-middle"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selected.has(row.id)}
                      aria-label={`Select ${row.companyName}`}
                      onCheckedChange={() => toggleRow(row.id)}
                    />
                  </td>
                  <td className="px-3 py-4 align-middle">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                          bg,
                        )}
                      >
                        {row.initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold leading-snug text-gray-900">
                          {row.companyName}
                        </p>
                        <p className="mt-1 truncate text-[12px] leading-snug text-gray-500">
                          {row.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pe-3 align-middle">
                    <p className="font-semibold text-gray-900">{planTitle}</p>
                    <p className="mt-1 text-[12px] text-gray-600">
                      {money(monthly)} / month
                    </p>
                  </td>
                  <td className="py-4 pe-3 align-middle">
                    <SubscriptionStatusBadge row={row} />
                  </td>
                  <td className="py-4 pe-3 align-middle text-gray-900">
                    Monthly
                  </td>
                  <td className="truncate py-4 pe-3 align-middle text-gray-800">
                    {row.nextBillingLabel}
                  </td>
                  <td className="truncate py-4 pe-3 align-middle tabular-nums font-semibold text-gray-900">
                    {money(row.mrr)}
                  </td>
                  <td className="px-2 py-4 align-middle text-center">
                    <div
                      role="presentation"
                      className="flex items-center justify-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        aria-label={`View ${row.companyName}`}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        onClick={() => onActivateRow(row)}
                      >
                        <Eye className="size-4" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Edit ${row.companyName}`}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                      >
                        <Pencil className="size-4" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        aria-label={`More actions for ${row.companyName}`}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                      >
                        <MoreHorizontal className="size-4" strokeWidth={1.75} />
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
  );
}