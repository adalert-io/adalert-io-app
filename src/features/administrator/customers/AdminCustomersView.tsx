"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpFromLine,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleCheckBig,
  Clock,
  DollarSign,
  Eye,
  Filter,
  LayoutGrid,
  List,
  MoreHorizontal,
  PencilLine,
  Plus,
  Search,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";

import { GoogleAdsMark } from "@/components/GoogleAdsMark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { AdminDashboardDateRangePicker } from "../dashboard/AdminDashboardDateRangePicker";

interface CustomerDemoRow {
  id: string;
  companyName: string;
  email: string;
  initials: string;
  avatarKind: "initials" | "logo";
  avatarToneIndex: number;
  contacts: number;
  adAccounts: number;
  mrr: number;
  status: "active" | "trial" | "past_due" | "paused" | "not_connected";
  plan: "Professional" | "Starter";
  nextBillingLabel: string;
}

const COMPANY_NAMES = [
  "McGrath Kavinoky LLP",
  "Lakeside Boutique",
  "Nexus AI Labs",
  "Sunrise Catering Co.",
  "PixelForge Studios",
  "Acme Diagnostics LLC",
  "Harbor Media Group",
  "Northwind Collective",
];

const AVATAR_BACKGROUNDS = [
  "bg-[#3b82f6]",
  "bg-[#6366f1]",
  "bg-[#0ea5e9]",
  "bg-[#475569]",
  "bg-[#8b5cf6]",
];

function initialsFromCompany(name: string): string {
  const cleaned = name.replace(/&/g, " ").replace(/[^\w\s]/g, " ");
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
  const firstLetter = words[0]?.[0];
  const secondLetter = words.length > 1 ? words[1]?.[0] : words[0]?.[1];
  return `${firstLetter ?? "?"}${secondLetter ?? "?"}`.toUpperCase().slice(0, 2);
}

function slugFromCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

function seedCustomers(): CustomerDemoRow[] {
  const statuses: CustomerDemoRow["status"][] = [
    "active",
    "active",
    "active",
    "trial",
    "active",
    "past_due",
    "paused",
    "active",
    "not_connected",
  ];

  return Array.from({ length: 128 }, (_, i) => {
    const companyName =
      i < COMPANY_NAMES.length
        ? COMPANY_NAMES[i]
        : `${COMPANY_NAMES[i % COMPANY_NAMES.length]} (${Math.floor(i / COMPANY_NAMES.length) + 1})`;
    const slug = slugFromCompany(companyName);
    const status = statuses[i % statuses.length];

    return {
      id: `cust-${String(i + 1).padStart(3, "0")}`,
      companyName,
      email: `${slug || "billing"}+${i}@example.com`,
      initials: initialsFromCompany(companyName),
      avatarKind: i % 6 === 0 ? "logo" : "initials",
      avatarToneIndex: i % AVATAR_BACKGROUNDS.length,
      contacts: 1 + ((i * 37) % 12),
      adAccounts: 1 + ((i * 23) % 18),
      mrr: 480 + ((i * 791) % 5200),
      status,
      plan: i % 3 === 0 ? "Starter" : "Professional",
      nextBillingLabel: i % 2 === 0 ? "May 15, 2025" : "Jun 02, 2025",
    };
  });
}

const ALL_ROWS = seedCustomers();

const PAGE_SIZE = 8;

/** Up to five page indexes centered on current (matches common admin mock). */
function visiblePageNumbers(params: {
  currentPage: number;
  totalPages: number;
  maxVisible?: number;
}): number[] {
  const { currentPage, totalPages } = params;
  const maxVisible = params.maxVisible ?? 5;

  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const half = Math.floor(maxVisible / 2);
  let start = currentPage - half;
  if (start < 1) start = 1;
  if (start + maxVisible - 1 > totalPages) {
    start = totalPages - maxVisible + 1;
  }

  return Array.from({ length: maxVisible }, (_, i) => start + i);
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

function CustomerStatusBadge({ status }: { status: CustomerDemoRow["status"] }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#22c55e]/25 bg-[#22c55e]/12 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#15803d] uppercase">
        <span className="size-1.5 rounded-full bg-[#22c55e]" aria-hidden />
        Active
      </span>
    );
  }
  if (status === "trial") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#3b82f6]/20 bg-[#3b82f6]/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#1d4ed8]">
        <span className="size-1.5 rounded-full bg-[#3b82f6]" aria-hidden />
        Trial
      </span>
    );
  }
  if (status === "past_due") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fecaca] bg-[#ef4444]/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#dc2626]">
        <span className="size-1.5 rounded-full bg-[#ef4444]" aria-hidden />
        Past Due
      </span>
    );
  }
  if (status === "paused") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/45 bg-orange-400/14 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange-800">
        <span className="size-1.5 rounded-full bg-orange-500" aria-hidden />
        Paused
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
      Not Connected
    </span>
  );
}

function CustomerAvatarCell({
  initials,
  avatarKind,
  avatarToneIndex,
}: Pick<CustomerDemoRow, "initials" | "avatarKind" | "avatarToneIndex">) {
  const bgClass =
    AVATAR_BACKGROUNDS[avatarToneIndex % AVATAR_BACKGROUNDS.length] ??
    "bg-[#3b82f6]";

  if (avatarKind === "logo") {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white">
        <GoogleAdsMark className="size-6" aria-hidden />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tracking-tight text-white",
        bgClass,
      )}
    >
      {initials}
    </span>
  );
}

export function AdminCustomersView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_ROWS;
    const q = search.trim().toLowerCase();
    return ALL_ROWS.filter(
      (row) =>
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
  const pageNumbers = visiblePageNumbers({
    currentPage: safePage,
    totalPages,
    maxVisible: 5,
  });

  const formatMoney = (n: number) =>
    `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl space-y-2">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 sm:text-[30px]">
            Customers
          </h1>
          <p className="text-[15px] text-[#7A7D9C]">
            Manage all your customers and their accounts
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            className="gap-2 rounded-xl bg-[#015AFD] px-4 hover:bg-[#0147d9]"
          >
            <Plus className="size-4" aria-hidden />
            Add Customer
          </Button>
          <AdminDashboardDateRangePicker />
        </div>
      </header>

      <section className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <DashboardMetricCard
          title="Total Customers"
          value="128"
          trend="↑ 12% vs last 7 days"
          trendTone="positive"
          Icon={Users}
          accentClassName="bg-[#3b82f6]/10 text-[#3b82f6]"
        />
        <DashboardMetricCard
          title="Active Customers"
          value="102"
          trend="↑ 10% vs last 7 days"
          trendTone="positive"
          Icon={CircleCheckBig}
          accentClassName="bg-[#22c55e]/15 text-[#16a34a]"
        />
        <DashboardMetricCard
          title="Trial Customers"
          value="8"
          trend="↓ 2% vs last 7 days"
          trendTone="negative"
          Icon={Clock}
          accentClassName="bg-orange-400/20 text-orange-700"
        />
        <DashboardMetricCard
          title="Past Due Customers"
          value="6"
          trend="↓ 1% vs last 7 days"
          trendTone="negative"
          Icon={TriangleAlert}
          accentClassName="bg-[#ef4444]/12 text-[#ef4444]"
        />
        <DashboardMetricCard
          title={
            <span className="block leading-snug">
              <span className="block">MRR</span>
              <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                (Monthly Recurring Revenue)
              </span>
            </span>
          }
          value="$24,350"
          trend="↑ 14% vs last 7 days"
          trendTone="positive"
          Icon={DollarSign}
          accentClassName="bg-emerald-400/16 text-emerald-700"
        />
      </section>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-200 sm:max-w-xl">
            <Search className="size-5 shrink-0 text-[#015AFD]" aria-hidden />
            <input
              className="min-w-0 flex-1 border-none bg-transparent text-[0.75rem] text-gray-700 outline-none placeholder:text-gray-400"
              placeholder="Search customers..."
              aria-label="Search customers"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search ? (
              <button
                type="button"
                className="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:ms-auto">
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="gap-2 rounded-lg border-[#e5e5e5] bg-white"
            >
              <Filter className="size-4 text-gray-700" aria-hidden />
              Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="gap-2 rounded-lg border-[#e5e5e5] bg-white"
            >
              <ArrowUpFromLine className="size-4 text-gray-700" aria-hidden />
              Export
            </Button>
            <div className="ms-0 flex items-center gap-1 sm:ms-2">
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
        </div>

        {viewMode === "list" ? (
          <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-none">
            <div className="block max-[991px]:overflow-x-auto max-[991px]:whitespace-nowrap">
              <table className="min-w-full text-[0.75rem]">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-4 text-left font-semibold text-gray-700">
                      Customer
                    </th>
                    <th className="px-4 py-4 text-left font-semibold text-gray-700">
                      Contact
                    </th>
                    <th className="px-4 py-4 text-left font-semibold text-gray-700">
                      Ad Accounts
                    </th>
                    <th className="px-4 py-4 text-left font-semibold text-gray-700">
                      MRR
                    </th>
                    <th className="px-4 py-4 text-left font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-4 text-left font-semibold text-gray-700">
                      Plan
                    </th>
                    <th className="px-4 py-4 text-left font-semibold text-gray-700">
                      Next Billing
                    </th>
                    <th className="whitespace-normal px-4 py-4 text-center font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {totalRows === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-16 text-center text-gray-500"
                        colSpan={8}
                      >
                        No customers match your search.
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row) => (
                      <tr
                        key={row.id}
                        className="transition-colors hover:bg-gray-50"
                      >
                        <td className="max-w-[280px] px-4 py-6 whitespace-normal">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              <CustomerAvatarCell
                                initials={row.initials}
                                avatarKind={row.avatarKind}
                                avatarToneIndex={row.avatarToneIndex}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-base leading-snug font-semibold text-gray-900">
                                {row.companyName}
                              </p>
                              <p className="mt-1 text-[13px] leading-snug text-gray-500">
                                {row.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-6 tabular-nums text-[0.8125rem] text-gray-900">
                          {row.contacts}
                        </td>
                        <td className="whitespace-nowrap px-4 py-6 tabular-nums text-[0.8125rem] text-gray-900">
                          {row.adAccounts}
                        </td>
                        <td className="whitespace-nowrap px-4 py-6 tabular-nums text-[0.8125rem] font-medium text-gray-900">
                          {formatMoney(row.mrr)}
                        </td>
                        <td className="px-4 py-6 whitespace-normal">
                          <CustomerStatusBadge status={row.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-6 text-[0.8125rem] font-medium text-gray-800">
                          {row.plan}
                        </td>
                        <td className="whitespace-nowrap px-4 py-6 text-[0.8125rem] text-gray-700">
                          {row.nextBillingLabel}
                        </td>
                        <td className="whitespace-normal px-4 py-6 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              aria-label={`View ${row.companyName}`}
                              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                            >
                              <Eye className="size-4" strokeWidth={1.75} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Edit ${row.companyName}`}
                              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                            >
                              <PencilLine
                                className="size-4"
                                strokeWidth={1.75}
                              />
                            </button>
                            <button
                              type="button"
                              aria-label={`More actions for ${row.companyName}`}
                              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                            >
                              <MoreHorizontal className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row">
              <p className="text-[0.75rem] font-medium text-gray-600">
                {totalRows === 0 ? (
                  "No customers to show."
                ) : (
                  <>
                    Showing {sliceStart + 1} to{" "}
                    {Math.min(safePage * PAGE_SIZE, totalRows)} of {totalRows}{" "}
                    customers
                  </>
                )}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage(1)}
                  aria-label="First page"
                  className="h-8 w-8 p-0 disabled:opacity-50"
                >
                  <ChevronsLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                  className="h-8 w-8 p-0 disabled:opacity-50"
                >
                  <ChevronLeft className="size-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {pageNumbers.map((n) => (
                    <Button
                      key={n}
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(n)}
                      aria-current={safePage === n ? "page" : undefined}
                      className={cn(
                        "h-8 min-w-8 px-2 text-[0.75rem] font-medium",
                        safePage === n &&
                          "border-[#0B1426] bg-[#0B1426] text-white hover:bg-[#152542]",
                      )}
                    >
                      {n}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                  className="h-8 w-8 p-0 disabled:opacity-50"
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(totalPages)}
                  aria-label="Last page"
                  className="h-8 w-8 p-0 disabled:opacity-50"
                >
                  <ChevronsRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {totalRows === 0 ? (
                <p className="col-span-full py-16 text-center text-gray-500">
                  No customers match your search.
                </p>
              ) : (
                pagedRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-col gap-4 rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-none"
                  >
                    <div className="flex items-start gap-3">
                      <CustomerAvatarCell
                        initials={row.initials}
                        avatarKind={row.avatarKind}
                        avatarToneIndex={row.avatarToneIndex}
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-base leading-snug font-semibold text-gray-900">
                          {row.companyName}
                        </p>
                        <p className="text-[13px] leading-snug text-gray-500">
                          {row.email}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[0.75rem] text-gray-700">
                      <div>
                        <p className="text-gray-500">Contact</p>
                        <p className="tabular-nums font-medium text-gray-900">
                          {row.contacts}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Ad Accounts</p>
                        <p className="tabular-nums font-medium text-gray-900">
                          {row.adAccounts}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">MRR</p>
                        <p className="font-medium tabular-nums text-gray-900">
                          {formatMoney(row.mrr)}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="mb-2 text-gray-500">Status</p>
                        <CustomerStatusBadge status={row.status} />
                      </div>
                      <div>
                        <p className="text-gray-500">Plan</p>
                        <p className="font-medium">{row.plan}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Next Billing</p>
                        <p className="font-medium">{row.nextBillingLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1 border-t border-gray-100 pt-3">
                      <button
                        type="button"
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                      >
                        <PencilLine className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#e5e5e5] bg-gray-50 px-6 py-4 sm:flex-row">
              <p className="text-[0.75rem] font-medium text-gray-600">
                {totalRows === 0 ? (
                  "No customers to show."
                ) : (
                  <>
                    Showing {sliceStart + 1} to{" "}
                    {Math.min(safePage * PAGE_SIZE, totalRows)} of {totalRows}{" "}
                    customers
                  </>
                )}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage(1)}
                  className="h-8 w-8 p-0 disabled:opacity-50"
                  aria-label="First page"
                >
                  <ChevronsLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 p-0 disabled:opacity-50"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {pageNumbers.map((n) => (
                    <Button
                      key={n}
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(n)}
                      className={cn(
                        "h-8 min-w-8 px-2 text-[0.75rem] font-medium",
                        safePage === n &&
                          "border-[#0B1426] bg-[#0B1426] text-white hover:bg-[#152542]",
                      )}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 w-8 p-0 disabled:opacity-50"
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="h-8 w-8 p-0 disabled:opacity-50"
                  aria-label="Last page"
                >
                  <ChevronsRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
