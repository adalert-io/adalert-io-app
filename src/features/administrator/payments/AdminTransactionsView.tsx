"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleCheckBig,
  Clock,
  DollarSign,
  MoreHorizontal,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type TransactionStatus = "succeeded" | "pending" | "failed";
type TransactionMethod = "visa" | "mastercard" | "amex" | "ach";

interface TransactionRow {
  id: string;
  transactionId: string;
  invoiceNumber: string;
  companyName: string;
  initials: string;
  avatarToneIndex: number;
  dateTimeLabel: string;
  amount: number;
  method: TransactionMethod;
  last4: string;
  status: TransactionStatus;
  description: string;
  receiptUrl: string | null;
  currency: string;
}

interface TransactionMetrics {
  total: number;
  succeeded: number;
  pending: number;
  failed: number;
  totalAmount: number;
}

const AVATAR_BG = [
  "bg-[#3b82f6]",
  "bg-[#6366f1]",
  "bg-[#0ea5e9]",
  "bg-[#475569]",
  "bg-[#8b5cf6]",
];

const PAGE_SIZE = 10;

const SELECT_CLASS =
  "min-w-[128px] appearance-none rounded-lg border border-gray-200 bg-white py-2.5 ps-4 pe-9 text-[13px] font-medium text-gray-700 shadow-xs transition-colors focus-visible:border-[#015AFD] focus-visible:ring-2 focus-visible:ring-[#015AFD]/25";

function normalizeMethod(value: string): TransactionMethod {
  const raw = value.toLowerCase();
  if (raw.includes("master")) return "mastercard";
  if (raw.includes("amex") || raw.includes("american")) return "amex";
  if (raw.includes("ach") || raw.includes("bank")) return "ach";
  return "visa";
}

function normalizeStatus(value: string): TransactionStatus {
  if (value === "succeeded") return "succeeded";
  if (value === "pending") return "pending";
  return "failed";
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

function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  if (status === "succeeded") {
    return (
      <span className="inline-flex rounded-full bg-[#22c55e]/14 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#15803d] ring-1 ring-[#22c55e]/28">
        Succeeded
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex rounded-full bg-orange-400/14 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#c2410c] ring-1 ring-orange-300/55">
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[#ef4444]/11 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#b91c1c] ring-1 ring-[#fecaca]">
      Failed
    </span>
  );
}

function MethodBrandMark({ method }: { method: TransactionMethod }) {
  if (method === "visa") {
    return (
      <span
        aria-hidden
        className="inline-flex h-[22px] min-w-[40px] shrink-0 items-center justify-center rounded bg-[#1a1f71] px-2 text-[10px] font-black tracking-wider text-white"
      >
        VISA
      </span>
    );
  }
  if (method === "mastercard") {
    return (
      <span aria-hidden className="relative inline-flex h-7 w-10 shrink-0 items-center">
        <span className="absolute left-0.5 top-1/2 size-[18px] -translate-y-1/2 rounded-full bg-[#eb001b]" />
        <span className="absolute left-[14px] top-1/2 size-[18px] -translate-y-1/2 rounded-full bg-[#f79e1b]" />
      </span>
    );
  }
  if (method === "amex") {
    return (
      <span
        aria-hidden
        className="inline-flex h-[22px] min-w-[44px] shrink-0 items-center justify-center rounded bg-[#006fcf] px-2 text-[9px] font-black tracking-[0.12em] text-white"
      >
        AMEX
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex h-[22px] shrink-0 items-center rounded-full bg-emerald-600/90 px-2.5 text-[10px] font-bold uppercase tracking-wide text-white"
    >
      ACH
    </span>
  );
}

function TransactionMethodCell({ row }: { row: TransactionRow }) {
  const label =
    row.method === "visa"
      ? "VISA"
      : row.method === "mastercard"
        ? "Mastercard"
        : row.method === "amex"
          ? "AMEX"
          : "ACH";

  return (
    <div className="flex min-w-0 items-center gap-2">
      <MethodBrandMark method={row.method} />
      <span className="min-w-0 truncate text-[13px] font-medium tabular-nums text-gray-900">
        <span className="text-gray-900">{label}</span>{" "}
        <span className="tracking-wider text-gray-400">····</span>{" "}
        <span>{row.last4}</span>
      </span>
    </div>
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

function TransactionDetailSheet({
  row,
  open,
  onOpenChange,
}: {
  row: TransactionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!row) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 border-slate-200 bg-white p-0 sm:max-w-md">
        <SheetHeader className="border-b border-slate-100 px-6 py-5 text-start">
          <SheetTitle className="text-lg font-bold text-slate-900">Transaction details</SheetTitle>
          <SheetDescription className="font-mono text-[12px] text-slate-500">
            {row.transactionId}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <DetailRow label="Customer">{row.companyName}</DetailRow>
          <DetailRow label="Invoice #">
            <span className="font-mono text-[12px]">{row.invoiceNumber}</span>
          </DetailRow>
          <DetailRow label="Date & time">{row.dateTimeLabel}</DetailRow>
          <DetailRow label="Amount">
            {money(row.amount)} {row.currency}
          </DetailRow>
          <div className="flex items-start justify-between gap-6">
            <span className="shrink-0 text-[13px] font-medium text-gray-500">Method</span>
            <TransactionMethodCell row={row} />
          </div>
          <div className="flex items-start justify-between gap-6">
            <span className="shrink-0 text-[13px] font-medium text-gray-500">Status</span>
            <TransactionStatusBadge status={row.status} />
          </div>
          <DetailRow label="Description">{row.description}</DetailRow>
          {row.receiptUrl ? (
            <DetailRow label="Receipt">
              <a
                href={row.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#015AFD] hover:underline"
              >
                View receipt
              </a>
            </DetailRow>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AdminTransactionsView() {
  const [allTransactions, setAllTransactions] = useState<TransactionRow[]>([]);
  const [metrics, setMetrics] = useState<TransactionMetrics>({
    total: 0,
    succeeded: 0,
    pending: 0,
    failed: 0,
    totalAmount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "all">("all");
  const [methodFilter, setMethodFilter] = useState<TransactionMethod | "all">("all");
  const [detailRow, setDetailRow] = useState<TransactionRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadTransactions() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/admin/payments/transactions", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          transactions?: TransactionRow[];
          metrics?: TransactionMetrics;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load transactions");
        }

        if (!isCancelled) {
          const mapped = (payload.transactions ?? []).map((row, index) => ({
            ...row,
            avatarToneIndex: index % AVATAR_BG.length,
            method: normalizeMethod(row.method),
            status: normalizeStatus(row.status),
          }));
          setAllTransactions(mapped);
          if (payload.metrics) setMetrics(payload.metrics);
        }
      } catch (error) {
        if (!isCancelled) {
          toast.error("Failed to load transactions");
          console.error(error);
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    void loadTransactions();
    return () => {
      isCancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let rows = allTransactions;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          row.transactionId.toLowerCase().includes(q) ||
          row.invoiceNumber.toLowerCase().includes(q) ||
          row.companyName.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "all") {
      rows = rows.filter((row) => row.status === statusFilter);
    }

    if (methodFilter !== "all") {
      rows = rows.filter((row) => row.method === methodFilter);
    }

    return rows;
  }, [allTransactions, search, statusFilter, methodFilter]);

  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const safePage = Math.min(Math.max(1, page), totalPages);
  const sliceStart = (safePage - 1) * PAGE_SIZE;
  const pagedRows = filtered.slice(sliceStart, sliceStart + PAGE_SIZE);

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

  const openDetail = (row: TransactionRow) => {
    setDetailRow(row);
    setDetailOpen(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 pb-16">
      <header className="max-w-xl space-y-2">
        <h1 className="text-[28px] font-bold tracking-tight text-gray-900 sm:text-[30px]">
          Transactions
        </h1>
        <p className="text-[15px] text-[#7A7D9C]">View and manage all payment transactions</p>
      </header>

      <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <DashboardMetricCard
          title="Total Transactions"
          value={isLoading ? "—" : String(metrics.total)}
          Icon={ArrowLeftRight}
          accentClassName="bg-[#3b82f6]/10 text-[#2563eb]"
        />
        <DashboardMetricCard
          title="Successful"
          value={isLoading ? "—" : String(metrics.succeeded)}
          Icon={CircleCheckBig}
          accentClassName="bg-[#22c55e]/15 text-[#16a34a]"
        />
        <DashboardMetricCard
          title="Pending"
          value={isLoading ? "—" : String(metrics.pending)}
          Icon={Clock}
          accentClassName="bg-orange-400/18 text-orange-700"
        />
        <DashboardMetricCard
          title="Failed"
          value={isLoading ? "—" : String(metrics.failed)}
          Icon={XCircle}
          accentClassName="bg-[#ef4444]/12 text-[#ef4444]"
        />
        <DashboardMetricCard
          title="Total Amount"
          value={isLoading ? "—" : money(metrics.totalAmount)}
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
              placeholder="Search by transaction ID, customer or invoice #..."
              value={search}
              aria-label="Search transactions"
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
              aria-label="Filter by transaction status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as TransactionStatus | "all");
                setPage(1);
              }}
            >
              <option value="all">All Status</option>
              <option value="succeeded">Succeeded</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
            />
          </div>

          <div className="relative">
            <select
              className={SELECT_CLASS}
              aria-label="Filter by payment method"
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value as TransactionMethod | "all");
                setPage(1);
              }}
            >
              <option value="all">All Methods</option>
              <option value="visa">Visa</option>
              <option value="mastercard">Mastercard</option>
              <option value="amex">American Express</option>
              <option value="ach">ACH</option>
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-[#e5e5e5] bg-white py-24 text-center text-[14px] text-gray-600">
            Loading transactions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-[#e5e5e5] bg-white py-24 text-center text-[14px] text-gray-600">
            No transactions match your filters.
          </div>
        ) : (
          <TransactionsTable
            rows={pagedRows}
            selected={selected}
            toggleRow={toggleRow}
            headerChecked={headerChecked}
            toggleHeader={toggleHeader}
            onViewDetail={openDetail}
          />
        )}

        <footer className="flex flex-col items-center justify-between gap-4 px-2 sm:flex-row">
          <p className="text-[13px] font-medium text-gray-600">
            {totalRows === 0
              ? "No transactions to show."
              : `Showing ${sliceStart + 1} to ${Math.min(safePage * PAGE_SIZE, totalRows)} of ${totalRows} transactions`}
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

      <TransactionDetailSheet row={detailRow} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}

function TransactionsTable({
  rows,
  selected,
  toggleRow,
  headerChecked,
  toggleHeader,
  onViewDetail,
}: {
  rows: TransactionRow[];
  selected: Set<string>;
  toggleRow: (id: string) => void;
  headerChecked: boolean | "indeterminate";
  toggleHeader: () => void;
  onViewDetail: (row: TransactionRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-none">
      <div className="max-[1199px]:overflow-x-auto">
        <table className="min-w-[1240px] w-full table-fixed text-[13px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="w-[48px] px-3 py-3 text-start">
                <Checkbox
                  checked={headerChecked}
                  aria-label="Select all on this page"
                  onCheckedChange={() => toggleHeader()}
                />
              </th>
              <th className="w-[164px] ps-2 pe-4 py-3 text-start font-semibold text-gray-700">
                Transaction ID
              </th>
              <th className="w-[152px] py-3 pe-4 text-start font-semibold text-gray-700">
                Invoice #
              </th>
              <th className="min-w-[200px] py-3 pe-4 text-start font-semibold text-gray-700">
                Customer
              </th>
              <th className="w-[168px] py-3 pe-4 text-start font-semibold text-gray-700">
                Date & Time
              </th>
              <th className="w-[112px] py-3 pe-4 text-start font-semibold text-gray-700">
                Amount
              </th>
              <th className="min-w-[200px] py-3 pe-4 text-start font-semibold text-gray-700">
                Method
              </th>
              <th className="w-[112px] py-3 pe-4 text-start font-semibold text-gray-700">
                Status
              </th>
              <th className="min-w-[140px] py-3 pe-4 text-start font-semibold text-gray-700">
                Description
              </th>
              <th className="w-[76px] py-3 px-3 text-center font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const bg = AVATAR_BG[row.avatarToneIndex % AVATAR_BG.length] ?? "bg-[#3b82f6]";

              return (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-4 align-middle">
                    <Checkbox
                      checked={selected.has(row.id)}
                      aria-label={`Select ${row.transactionId}`}
                      onCheckedChange={() => toggleRow(row.id)}
                    />
                  </td>
                  <td className="truncate px-2 py-4 align-middle font-mono font-semibold text-gray-900">
                    {row.transactionId}
                  </td>
                  <td className="truncate py-4 pe-3 align-middle font-mono font-medium text-gray-800">
                    {row.invoiceNumber}
                  </td>
                  <td className="px-3 py-4 align-middle">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                          bg,
                        )}
                      >
                        {row.initials}
                      </span>
                      <p className="min-w-0 truncate font-semibold leading-snug text-gray-900">
                        {row.companyName}
                      </p>
                    </div>
                  </td>
                  <td className="truncate py-4 pe-3 align-middle text-gray-800">
                    {row.dateTimeLabel}
                  </td>
                  <td className="truncate py-4 pe-3 align-middle tabular-nums font-semibold text-gray-900">
                    {money(row.amount)}
                  </td>
                  <td className="py-4 pe-3 align-middle">
                    <TransactionMethodCell row={row} />
                  </td>
                  <td className="py-4 pe-3 align-middle">
                    <TransactionStatusBadge status={row.status} />
                  </td>
                  <td className="truncate py-4 pe-3 align-middle text-gray-800">
                    {row.description}
                  </td>
                  <td className="px-1 py-4 align-middle text-center">
                    <button
                      type="button"
                      aria-label={`View ${row.transactionId}`}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                      onClick={() => onViewDetail(row)}
                    >
                      <MoreHorizontal className="size-4 rotate-90" strokeWidth={1.75} />
                    </button>
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
