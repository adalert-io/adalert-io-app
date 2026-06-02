"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
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
  Search,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type SubscriptionPlanKey = "professional" | "starter" | "trial";
type SubscriptionStatus = "active" | "trial" | "paused" | "past_due" | "canceled";

interface SubscriptionBillingLine {
  dateLabel: string;
  amountLabel: string;
}

interface SubscriptionRow {
  id: string;
  companyName: string;
  email: string;
  initials: string;
  avatarToneIndex: number;
  planKey: SubscriptionPlanKey;
  status: SubscriptionStatus;
  nextBillingLabel: string;
  mrr: number;
  adAccounts: number;
  subscriptionId: string;
  customerSinceLabel: string;
  cardLast4: string;
  cardBrand: string | null;
}

interface SubscriptionMetrics {
  total: number;
  active: number;
  trial: number;
  canceled: number;
  mrr: number;
}

const AVATAR_BG = [
  "bg-[#3b82f6]",
  "bg-[#6366f1]",
  "bg-[#0ea5e9]",
  "bg-[#475569]",
  "bg-[#8b5cf6]",
];

const PAGE_SIZE = 8;

const SELECT_CLASS =
  "min-w-[128px] appearance-none rounded-lg border border-gray-200 bg-white py-2.5 ps-4 pe-9 text-[13px] font-medium text-gray-700 shadow-xs transition-colors focus-visible:border-[#015AFD] focus-visible:ring-2 focus-visible:ring-[#015AFD]/25";

function planLabel(planKey: SubscriptionPlanKey): string {
  if (planKey === "professional") return "Professional";
  if (planKey === "starter") return "Starter";
  return "Trial";
}

function payoutSlots(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }
  const last = totalPages;
  if (currentPage <= 4) return [1, 2, 3, 4, 5, "ellipsis", last];
  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis", last - 4, last - 3, last - 2, last - 1, last];
  }
  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", last];
}

function DashboardMetricCard({
  title,
  value,
  Icon,
  accentClassName,
}: {
  title: ReactNode;
  value: string;
  Icon: LucideIcon;
  accentClassName?: string;
}) {
  return (
    <Card className="flex min-h-[140px] justify-center gap-0 rounded-xl border border-slate-200 bg-white py-0 shadow-sm">
      <CardContent className="flex flex-1 items-center justify-between gap-4 px-6 py-6">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="truncate text-[28px] font-bold tracking-tight text-slate-900">{value}</p>
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

function SubscriptionStatusBadge({ row }: { row: SubscriptionRow }) {
  if (row.status === "active") {
    return (
      <span className="inline-flex rounded-full bg-[#22c55e]/14 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#15803d] ring-1 ring-[#22c55e]/28">
        Active
      </span>
    );
  }
  if (row.status === "trial") {
    return (
      <span className="inline-flex rounded-full bg-[#3b82f6]/14 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#1d4ed8] ring-1 ring-[#3b82f6]/30">
        Trial
      </span>
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

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 text-[13px]">
      <span className="shrink-0 font-medium text-gray-500">{label}</span>
      <span className="min-w-0 text-end font-semibold leading-snug text-gray-900">{children}</span>
    </div>
  );
}

function SubscriptionDetailPanel({
  row,
  open,
  onOpenChange,
  billingHistory,
  isBillingLoading,
}: {
  row: SubscriptionRow;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  billingHistory: SubscriptionBillingLine[];
  isBillingLoading: boolean;
}) {
  const planName = planLabel(row.planKey);
  const priceLine = `${money(row.mrr)} / month`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent showCloseButton side="right" className="gap-0 p-0 sm:max-w-[440px]">
        <div className="flex h-full min-h-0 flex-col bg-white">
          <SheetHeader className="gap-3 border-b border-gray-100 p-6 text-start">
            <SheetTitle className="text-xl font-bold leading-snug tracking-tight text-gray-900">
              {row.companyName}
            </SheetTitle>
            <p className="text-[13px] font-medium leading-snug text-[#64748b]">{row.email}</p>
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
                  <SubscriptionStatusBadge row={row} />
                </div>
                <DetailRow label="Billing cycle">Monthly</DetailRow>
                <DetailRow label="Price">{priceLine}</DetailRow>
                <DetailRow label="Ad accounts">{row.adAccounts}</DetailRow>
                <DetailRow label="Next billing">{row.nextBillingLabel}</DetailRow>
                <DetailRow label="MRR">{money(row.mrr)}</DetailRow>
                <DetailRow label="Subscription ID">
                  <span className="font-mono text-[12px] break-all">{row.subscriptionId}</span>
                </DetailRow>
                <DetailRow label="Customer since">{row.customerSinceLabel}</DetailRow>
              </div>
            </section>

            <section className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
              <h3 className="mb-4 text-[13px] font-semibold text-gray-900">Payment method</h3>
              <p className="font-mono text-[13px] font-semibold text-gray-900">
                {row.cardBrand ? `${row.cardBrand} ` : ""}···· {row.cardLast4}
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#475569]">
                Billing history
              </h3>
              {isBillingLoading ? (
                <p className="text-[13px] text-gray-500">Loading invoices...</p>
              ) : billingHistory.length === 0 ? (
                <p className="text-[13px] text-gray-500">No invoices yet.</p>
              ) : (
                <ul className="space-y-4">
                  {billingHistory.map((entry, entryIdx) => (
                    <li
                      key={`${row.subscriptionId}-${entryIdx}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{entry.amountLabel}</p>
                        <p className="text-[12px] text-gray-500">{entry.dateLabel}</p>
                      </div>
                      <span className="inline-flex shrink-0 rounded-full bg-[#22c55e]/14 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#15803d] ring-1 ring-[#22c55e]/25">
                        Paid
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AdminSubscriptionsView() {
  const [allSubscriptions, setAllSubscriptions] = useState<SubscriptionRow[]>([]);
  const [metrics, setMetrics] = useState<SubscriptionMetrics>({
    total: 0,
    active: 0,
    trial: 0,
    canceled: 0,
    mrr: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | "all">("all");
  const [planFilter, setPlanFilter] = useState<SubscriptionPlanKey | "all">("all");
  const [detailRow, setDetailRow] = useState<SubscriptionRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [billingHistory, setBillingHistory] = useState<SubscriptionBillingLine[]>([]);
  const [isBillingLoading, setIsBillingLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadSubscriptions() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/admin/subscriptions", { cache: "no-store" });
        const payload = (await response.json()) as {
          subscriptions?: SubscriptionRow[];
          metrics?: SubscriptionMetrics;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load subscriptions");
        }
        if (!isCancelled) {
          setAllSubscriptions(payload.subscriptions ?? []);
          if (payload.metrics) setMetrics(payload.metrics);
        }
      } catch (error) {
        if (!isCancelled) {
          toast.error("Failed to load subscriptions");
          console.error(error);
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    void loadSubscriptions();
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!detailRow || !detailOpen) {
      setBillingHistory([]);
      return;
    }

    const customerId = detailRow.id;
    let isCancelled = false;

    async function loadBilling() {
      setIsBillingLoading(true);
      try {
        const response = await fetch(`/api/admin/customers/${customerId}/billing`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          billing?: {
            invoices?: Array<{
              amount: number;
              createdAt: string;
            }>;
          };
        };
        if (!response.ok || isCancelled) return;
        const lines =
          payload.billing?.invoices?.map((invoice) => ({
            dateLabel: invoice.createdAt,
            amountLabel: money(invoice.amount),
          })) ?? [];
        if (!isCancelled) setBillingHistory(lines);
      } catch {
        if (!isCancelled) setBillingHistory([]);
      } finally {
        if (!isCancelled) setIsBillingLoading(false);
      }
    }

    void loadBilling();
    return () => {
      isCancelled = true;
    };
  }, [detailRow, detailOpen]);

  const filtered = useMemo(() => {
    let rows = allSubscriptions;

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
  }, [allSubscriptions, search, statusFilter, planFilter]);

  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const safePage = Math.min(Math.max(1, page), totalPages);
  const sliceStart = (safePage - 1) * PAGE_SIZE;
  const pagedRows = filtered.slice(sliceStart, sliceStart + PAGE_SIZE);

  const slots = payoutSlots(safePage, totalPages);

  const openDetail = (row: SubscriptionRow) => {
    setDetailRow(row);
    setDetailOpen(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 pb-16">
      <header className="max-w-xl space-y-2">
        <h1 className="text-[28px] font-bold tracking-tight text-gray-900 sm:text-[30px]">
          Subscriptions
        </h1>
        <p className="text-[15px] text-[#7A7D9C]">Manage all customer subscriptions and plans</p>
      </header>

      <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <DashboardMetricCard
          title="Total Subscriptions"
          value={isLoading ? "—" : String(metrics.total)}
          Icon={ClipboardList}
          accentClassName="bg-[#3b82f6]/10 text-[#2563eb]"
        />
        <DashboardMetricCard
          title="Active Subscriptions"
          value={isLoading ? "—" : String(metrics.active)}
          Icon={CircleCheckBig}
          accentClassName="bg-[#22c55e]/15 text-[#16a34a]"
        />
        <DashboardMetricCard
          title="Trial Subscriptions"
          value={isLoading ? "—" : String(metrics.trial)}
          Icon={Clock}
          accentClassName="bg-orange-400/18 text-orange-700"
        />
        <DashboardMetricCard
          title="Paused / Canceled"
          value={isLoading ? "—" : String(metrics.canceled)}
          Icon={XCircle}
          accentClassName="bg-[#ef4444]/12 text-[#ef4444]"
        />
        <DashboardMetricCard
          title="Monthly Recurring Revenue"
          value={isLoading ? "—" : money(metrics.mrr)}
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
                setPage(1);
              }}
            />
            {search ? (
              <button
                type="button"
                aria-label="Clear search"
                className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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
              aria-label="Filter by subscription status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as SubscriptionStatus | "all");
                setPage(1);
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
                setPlanFilter(e.target.value as SubscriptionPlanKey | "all");
                setPage(1);
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
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-[#e5e5e5] bg-white py-24 text-center text-[14px] text-gray-600">
            Loading subscriptions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-[#e5e5e5] bg-white py-24 text-center text-[14px] text-gray-600">
            No subscriptions match your filters.
          </div>
        ) : (
          <SubscriptionsTable
            rows={pagedRows}
            onViewDetail={openDetail}
          />
        )}

        <footer className="flex flex-col items-center justify-between gap-4 px-2 sm:flex-row">
          <p className="text-[13px] font-medium text-gray-600">
            {totalRows === 0
              ? "No subscriptions to show."
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
                  <span key={`e-${idx}`} className="px-1.5 text-[13px] text-gray-400">
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
          billingHistory={billingHistory}
          isBillingLoading={isBillingLoading}
        />
      ) : null}
    </div>
  );
}

function SubscriptionsTable({
  rows,
  onViewDetail,
}: {
  rows: SubscriptionRow[];
  onViewDetail: (row: SubscriptionRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-none">
      <div className="max-[1199px]:overflow-x-auto">
        <table className="min-w-[1120px] w-full table-fixed text-[13px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
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
              <th className="w-[96px] py-3 px-4 text-center font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const bg = AVATAR_BG[row.avatarToneIndex % AVATAR_BG.length] ?? "bg-[#3b82f6]";
              const planTitle = planLabel(row.planKey);

              return (
                <tr key={row.id} className="hover:bg-gray-50">
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
                    <p className="mt-1 text-[12px] text-gray-600">{money(row.mrr)} / month</p>
                  </td>
                  <td className="py-4 pe-3 align-middle">
                    <SubscriptionStatusBadge row={row} />
                  </td>
                  <td className="py-4 pe-3 align-middle text-gray-900">Monthly</td>
                  <td className="truncate py-4 pe-3 align-middle text-gray-800">
                    {row.nextBillingLabel}
                  </td>
                  <td className="truncate py-4 pe-3 align-middle tabular-nums font-semibold text-gray-900">
                    {money(row.mrr)}
                  </td>
                  <td className="px-2 py-4 align-middle text-center">
                    <Button
                      type="button"
                      aria-label={`View ${row.companyName}`}
                      onClick={() => onViewDetail(row)}
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg"
                    >
                      View
                    </Button>
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
