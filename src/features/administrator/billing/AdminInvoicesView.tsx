"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
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
  Search,
  TriangleAlert,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface InvoiceDemoRow {
  id: string;
  number: string;
  companyName: string;
  email: string;
  initials: string;
  avatarToneIndex: number;
  planLabel: string;
  issueDateLabel: string;
  dueDateLabel: string;
  amount: number;
  status: "paid" | "pending" | "past_due";
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

const PAGE_SIZE = 10;

function initialsFromName(name: string): string {
  const words = name
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

function seedInvoices(): InvoiceDemoRow[] {
  const statusCycle: InvoiceDemoRow["status"][] = [
    "paid",
    "paid",
    "pending",
    "paid",
    "past_due",
    "paid",
    "pending",
    "paid",
    "paid",
    "pending",
    "past_due",
    "paid",
  ];

  return Array.from({ length: 128 }, (_, i) => {
    const name =
      COMPANY_POOL[i % COMPANY_POOL.length] +
      (i >= COMPANY_POOL.length ? ` (${1 + Math.floor(i / COMPANY_POOL.length)})` : "");
    const slug = slugify(name);
    const year = 2025;
    const monthStr = ((i % 12) + 1).toString().padStart(2, "0");
    const dayStr = ((i % 27) + 1).toString().padStart(2, "0");

    return {
      id: `inv-row-${String(i + 1).padStart(3, "0")}`,
      number: `INV-${year}-${monthStr}${dayStr}-${String(i + 1).padStart(3, "0")}`,
      companyName: name,
      email: `billing.${slug}.${i % 47}@${i % 2 === 0 ? "firmco.com" : "mail.io"}`,
      initials: initialsFromName(name.replace(/\s\(\d+\)\s*$/, "")),
      avatarToneIndex: i % AVATAR_BG.length,
      planLabel: i % 3 === 0 ? "Starter" : "Professional",
      issueDateLabel: `May ${((i % 27) + 1).toString().padStart(2, "0")}, ${year}`,
      dueDateLabel: `May ${Math.min(28, ((i % 27) + 3)).toString().padStart(2, "0")}, ${year}`,
      amount: 189 + ((i * 337) % 8700) + (i % 5) * 0.25,
      status: statusCycle[i % statusCycle.length],
    };
  });
}

const ALL_INVOICES = seedInvoices();

function payoutSlots(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const last = totalPages;

  /** Match common admin mock on early pages: 1 … 5, gap, last. */
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

function InvoiceStatusBadge({ status }: { status: InvoiceDemoRow["status"] }) {
  if (status === "paid") {
    return (
      <span className="inline-flex rounded-full bg-[#22c55e]/14 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#15803d] ring-1 ring-[#22c55e]/28">
        Paid
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
      Past Due
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

export function AdminInvoicesView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_INVOICES;
    const q = search.trim().toLowerCase();
    return ALL_INVOICES.filter(
      (row) =>
        row.number.toLowerCase().includes(q) ||
        row.companyName.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q),
    );
  }, [search]);

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
    pageIdsOnPage.length > 0 &&
    pageIdsOnPage.every((id) => selected.has(id));
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

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 pb-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl space-y-2">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 sm:text-[30px]">
            Invoices
          </h1>
          <p className="text-[15px] text-[#7A7D9C]">
            View and manage all customer invoices
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
          title="Total Invoices"
          value="128"
          trend="↑ 12% vs last 7 days"
          trendTone="positive"
          Icon={ClipboardList}
          accentClassName="bg-[#3b82f6]/10 text-[#2563eb]"
        />
        <DashboardMetricCard
          title="Paid"
          value="96"
          trend="↑ 15% vs last 7 days"
          trendTone="positive"
          Icon={CircleCheckBig}
          accentClassName="bg-[#22c55e]/15 text-[#16a34a]"
        />
        <DashboardMetricCard
          title="Pending"
          value="20"
          trend="↓ 5% vs last 7 days"
          trendTone="negative"
          Icon={Clock}
          accentClassName="bg-orange-400/18 text-orange-700"
        />
        <DashboardMetricCard
          title="Past Due"
          value="8"
          trend="↓ 11% vs last 7 days"
          trendTone="negative"
          Icon={TriangleAlert}
          accentClassName="bg-[#ef4444]/12 text-[#ef4444]"
        />
        <DashboardMetricCard
          title="Total Invoiced"
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
              placeholder="Search by invoice #, customer or email..."
              value={search}
              aria-label="Search invoices"
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
            <select className={SELECT_CLASS} aria-label="Filter by invoice status">
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="past_due">Past Due</option>
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
            />
          </div>

          <div className="relative">
            <select className={SELECT_CLASS} aria-label="Filter by customer">
              <option value="all">All Customers</option>
              {COMPANY_POOL.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
            />
          </div>

          <div className="relative">
            <select className={SELECT_CLASS} aria-label="Filter by plan">
              <option value="all">All Plans</option>
              <option value="pro">Professional</option>
              <option value="starter">Starter</option>
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            type="button"
            className="gap-2 rounded-lg border-[#e5e5e5] bg-white lg:mt-0"
          >
            <Filter className="size-4 text-gray-700" aria-hidden />
            More Filters
          </Button>

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
              No invoices match your search.
            </div>
          ) : (
            <InvoicesTable
              rows={pagedRows}
              selected={selected}
              toggleRow={toggleRow}
              headerChecked={headerChecked}
              toggleHeader={toggleHeader}
            />
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-[15px] text-muted-foreground">
            Invoice cards in grid layout can mirror this table row-for-row once the billing team confirms card anatomy.
          </div>
        )}

        <footer className="flex flex-col items-center justify-between gap-4 px-2 sm:flex-row">
          <p className="text-[13px] font-medium text-gray-600">
            {totalRows === 0
              ? "No invoices match your search."
              : `Showing ${sliceStart + 1} to ${Math.min(safePage * PAGE_SIZE, totalRows)} of ${totalRows} invoices`}
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
    </div>
  );
}

function InvoicesTable({
  rows,
  selected,
  toggleRow,
  headerChecked,
  toggleHeader,
}: {
  rows: InvoiceDemoRow[];
  selected: Set<string>;
  toggleRow: (id: string) => void;
  headerChecked: boolean | "indeterminate";
  toggleHeader: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-none">
      <div className="max-[1199px]:overflow-x-auto">
        <table className="min-w-[1040px] w-full table-fixed text-[13px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="w-[48px] px-3 py-3 text-start">
                <Checkbox
                  checked={headerChecked}
                  aria-label="Select all on this page"
                  onCheckedChange={() => toggleHeader()}
                />
              </th>
              <th className="ps-2 pe-4 py-3 text-start font-semibold text-gray-700">
                Invoice #
              </th>
              <th className="py-3 pe-4 text-start font-semibold text-gray-700">
                Customer
              </th>
              <th className="w-[148px] py-3 pe-4 text-start font-semibold text-gray-700">
                Plan
              </th>
              <th className="w-[132px] py-3 pe-4 text-start font-semibold text-gray-700">
                Issue Date
              </th>
              <th className="w-[132px] py-3 pe-4 text-start font-semibold text-gray-700">
                Due Date
              </th>
              <th className="w-[118px] py-3 pe-4 text-start font-semibold text-gray-700">
                Amount
              </th>
              <th className="w-[112px] py-3 pe-4 text-start font-semibold text-gray-700">
                Status
              </th>
              <th className="w-[120px] py-3 px-4 text-center font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const bg =
                AVATAR_BG[row.avatarToneIndex % AVATAR_BG.length] ?? "bg-[#3b82f6]";

              return (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-4 align-middle">
                    <Checkbox
                      checked={selected.has(row.id)}
                      aria-label={`Select ${row.number}`}
                      onCheckedChange={() => toggleRow(row.id)}
                    />
                  </td>
                  <td className="truncate px-2 py-4 align-middle font-mono font-semibold text-gray-900">
                    {row.number}
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
                    <p className="font-semibold text-gray-900">{row.planLabel}</p>
                    <p className="mt-1 text-[12px] text-gray-500">Monthly</p>
                  </td>
                  <td className="truncate py-4 pe-3 align-middle text-gray-800">
                    {row.issueDateLabel}
                  </td>
                  <td className="truncate py-4 pe-3 align-middle text-gray-800">
                    {row.dueDateLabel}
                  </td>
                  <td className="truncate py-4 pe-3 align-middle tabular-nums font-semibold text-gray-900">
                    {money(row.amount)}
                  </td>
                  <td className="py-4 pe-3 align-middle">
                    <InvoiceStatusBadge status={row.status} />
                  </td>
                  <td className="px-2 py-4 align-middle text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        aria-label={`View ${row.number}`}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                      >
                        <Eye className="size-4" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Download ${row.number}`}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                      >
                        <ArrowDownToLine className="size-4" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        aria-label={`More for ${row.number}`}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                      >
                        <MoreHorizontal className="size-4" />
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
