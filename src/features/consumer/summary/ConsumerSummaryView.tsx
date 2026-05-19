"use client";

import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleCheckBig,
  Filter,
  Info,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import type { SummaryAdsAccount } from "@/app/summary/summary-store";
import { useSummaryStore } from "@/app/summary/summary-store";
import { GoogleAdsMark } from "@/components/GoogleAdsMark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AdminDashboardDateRangePicker } from "@/features/administrator/dashboard/AdminDashboardDateRangePicker";
import { consumerPathForClassicRoute } from "@/lib/consumer-shell-preference";
import { useAuthStore } from "@/lib/store/auth-store";
import { ALERT_SEVERITY_COLORS } from "@/lib/constants";
import { useUserAdsAccountsStore } from "@/lib/store/user-ads-accounts-store";
import { cn, formatAccountNumber } from "@/lib/utils";

import {
  computeSummaryKpis,
  getConnectedAccounts,
  getPacingDotColor,
  paginationSlots,
  sortConnectedAccountsByName,
} from "./helpers";

const SELECT_CLASS =
  "min-w-[128px] appearance-none rounded-lg border border-gray-200 bg-white py-2.5 ps-4 pe-9 text-[13px] font-medium text-gray-700 shadow-xs transition-colors focus-visible:border-[#015AFD] focus-visible:ring-2 focus-visible:ring-[#015AFD]/25";

function SummaryMetricCard({
  title,
  value,
  subtitle,
  Icon,
  accentClassName,
}: {
  title: string;
  value: string;
  subtitle: string;
  Icon: LucideIcon;
  accentClassName?: string;
}) {
  return (
    <Card className="flex min-h-[132px] justify-center gap-0 rounded-xl border border-slate-200 bg-white py-0 shadow-sm">
      <CardContent className="flex flex-1 items-center justify-between gap-4 px-6 py-5">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="truncate text-[28px] font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="text-[13px] font-medium text-slate-500">{subtitle}</p>
        </div>
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-full",
            accentClassName ?? "bg-[#3b82f6]/10 text-[#3b82f6]",
          )}
        >
          <Icon className="size-6" strokeWidth={1.85} aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}

function BudgetPacingBar({ account }: { account: SummaryAdsAccount }) {
  const { percent, percentText, dayPercent } = account.progressBar;

  return (
    <div className="flex min-w-[200px] items-center gap-3">
      <div className="relative flex h-6 w-full min-w-[140px] items-center">
        <div className="absolute inset-y-0 left-0 w-full rounded-full border border-slate-200 bg-white" />
        <div
          className="absolute left-0 top-0 h-6 rounded-full bg-[#015AFD]"
          style={{
            width: `${percent}%`,
            minWidth: percent > 0 ? 8 : 0,
          }}
        />
        {percent < 15 ? (
          <span
            className="absolute top-0 flex h-6 items-center text-[11px] font-medium text-slate-800"
            style={{ left: `calc(${percent}% + 8px)` }}
          >
            {percentText.toFixed(1)}%
          </span>
        ) : (
          <span
            className="absolute top-0 flex h-6 -translate-x-1/2 items-center text-[11px] font-medium text-white drop-shadow-sm"
            style={{ left: `${percent / 2}%` }}
          >
            {percentText.toFixed(1)}%
          </span>
        )}
        <div
          className="absolute top-1 h-4 w-px bg-slate-500"
          style={{ left: `calc(${dayPercent}% - 1px)` }}
        />
      </div>
      <span
        className="size-2.5 shrink-0 rounded-full ring-2 ring-white"
        style={{ background: getPacingDotColor(account.spendMtdIndicatorKey) }}
        aria-hidden
      />
    </div>
  );
}

function ShowingAdsBadge({ account }: { account: SummaryAdsAccount }) {
  if (account.showingAds === null && !account.isConnected) {
    return <Badge variant="secondary">n/a</Badge>;
  }
  if (account.showingAds === null) {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <span className="size-1.5 animate-pulse rounded-full bg-slate-400" />
        Checking
      </Badge>
    );
  }
  if (account.showingAds) {
    return <Badge variant="success">Yes</Badge>;
  }
  return <Badge variant="destructive">No</Badge>;
}

function ImpactCounts({ account }: { account: SummaryAdsAccount }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-700">
        <span
          className="size-2.5 rounded-full"
          style={{ background: ALERT_SEVERITY_COLORS.CRITICAL }}
        />
        {account.impact.critical}
      </span>
      <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-700">
        <span
          className="size-2.5 rounded-full"
          style={{ background: ALERT_SEVERITY_COLORS.MEDIUM }}
        />
        {account.impact.medium}
      </span>
      <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-700">
        <span
          className="size-2.5 rounded-full"
          style={{ background: ALERT_SEVERITY_COLORS.LOW }}
        />
        {account.impact.low}
      </span>
    </div>
  );
}

function SummaryLoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16">
      <Loader2 className="size-8 animate-spin text-[#015AFD]" aria-hidden />
      <p className="text-[15px] font-medium text-slate-600">{label}</p>
    </div>
  );
}

export function ConsumerSummaryView() {
  const router = useRouter();
  const { userDoc } = useAuthStore();
  const {
    accounts,
    allAdsAccounts,
    loading: summaryLoading,
    isRefreshing,
    fetchSummaryAccounts,
  } = useSummaryStore();
  const { setSelectedAdsAccount } = useUserAdsAccountsStore();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (userDoc) {
      void fetchSummaryAccounts(userDoc);
    }
  }, [userDoc, fetchSummaryAccounts]);

  useEffect(() => {
    if (!userDoc) return;
    const interval = setInterval(() => {
      void fetchSummaryAccounts(userDoc);
    }, 900_000);
    return () => clearInterval(interval);
  }, [userDoc, fetchSummaryAccounts]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const connectedAccounts = useMemo(
    () => sortConnectedAccountsByName(getConnectedAccounts(accounts)),
    [accounts],
  );

  const filteredAccounts = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return connectedAccounts;
    }
    const q = debouncedSearch.trim().toLowerCase();
    return connectedAccounts.filter((acc) =>
      String(acc.accountName ?? "")
        .toLowerCase()
        .includes(q),
    );
  }, [connectedAccounts, debouncedSearch]);

  const kpis = useMemo(() => computeSummaryKpis(accounts), [accounts]);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const sliceStart = (safePage - 1) * pageSize;
  const pagedRows = filteredAccounts.slice(sliceStart, sliceStart + pageSize);
  const slots = paginationSlots(safePage, totalPages);

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const handleRowClick = useCallback(
    (acc: SummaryAdsAccount) => {
      const matchingAccount = allAdsAccounts.find((a) => a.id === acc.id);
      if (!matchingAccount) return;
      setSelectedAdsAccount(matchingAccount);
      router.push(consumerPathForClassicRoute("/dashboard"));
    },
    [allAdsAccounts, router, setSelectedAdsAccount],
  );

  const handleRefresh = () => {
    if (userDoc) {
      void fetchSummaryAccounts(userDoc);
    }
  };

  if (summaryLoading && accounts.length === 0) {
    return <SummaryLoadingState label="Loading ad accounts…" />;
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl space-y-2">
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 sm:text-[30px]">
            Ad accounts
          </h1>
          <p className="text-[15px] text-[#7A7D9C]">
            Prioritized by impact — start at the top and work down. Open an account
            to view its dashboard.
          </p>
          {isRefreshing ? (
            <p className="inline-flex items-center gap-2 text-[13px] font-medium text-[#015AFD]">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Refreshing account data…
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdminDashboardDateRangePicker />
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-xl border-slate-200 bg-white shadow-sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("size-4", isRefreshing && "animate-spin")}
              aria-hidden
            />
            Refresh
          </Button>
        </div>
      </header>

      <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard
          title="Total accounts"
          value={String(kpis.total)}
          subtitle="Connected ad accounts"
          Icon={LayoutGrid}
          accentClassName="bg-[#3b82f6]/10 text-[#2563eb]"
        />
        <SummaryMetricCard
          title="Connected"
          value={String(kpis.connected)}
          subtitle="Ready for monitoring"
          Icon={CircleCheckBig}
          accentClassName="bg-[#22c55e]/15 text-[#16a34a]"
        />
        <SummaryMetricCard
          title="Critical alerts"
          value={String(kpis.criticalAlerts)}
          subtitle="Across connected accounts"
          Icon={AlertTriangle}
          accentClassName="bg-[#fecaca]/45 text-[#dc2626]"
        />
        <SummaryMetricCard
          title="Not showing ads"
          value={String(kpis.notShowingAds)}
          subtitle="Needs attention today"
          Icon={AlertTriangle}
          accentClassName="bg-orange-100 text-orange-700"
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[#015AFD]/20">
            <Search className="size-5 shrink-0 text-[#015AFD]" aria-hidden />
            <input
              className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
              placeholder="Search ad accounts…"
              value={search}
              aria-label="Search ad accounts"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search ? (
              <button
                type="button"
                aria-label="Clear search"
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={15}>15 rows</option>
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            type="button"
            className="gap-2 rounded-lg border-[#e5e5e5] bg-white"
          >
            <Filter className="size-4 text-slate-600" aria-hidden />
            Filters
          </Button>
        </div>

        <Card className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white py-0 shadow-md">
          <div className="max-[1199px]:overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="w-[72px] ps-6 text-center font-semibold text-slate-700">
                    Ads
                  </TableHead>
                  <TableHead className="min-w-[220px] font-semibold text-slate-700">
                    Account
                  </TableHead>
                  <TableHead className="min-w-[120px] font-semibold text-slate-700">
                    <span className="inline-flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="rounded p-0.5 text-[#015AFD] hover:bg-slate-100"
                            aria-label="About showing ads status"
                          >
                            <Info className="size-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs">
                          If there were no impressions in the last two hours, status
                          becomes Not Showing Ads.
                        </TooltipContent>
                      </Tooltip>
                      Showing ads
                    </span>
                  </TableHead>
                  <TableHead className="min-w-[160px] font-semibold text-slate-700">
                    Impact
                  </TableHead>
                  <TableHead className="min-w-[240px] pe-6 font-semibold text-slate-700">
                    Budget pacing
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-16 text-center text-[14px] text-slate-500"
                    >
                      No accounts match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedRows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer border-slate-100 hover:bg-slate-50/80"
                      onClick={() => handleRowClick(row)}
                    >
                      <TableCell className="ps-6 text-center">
                        <span className="mx-auto flex size-9 items-center justify-center">
                          <GoogleAdsMark className="size-7" />
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-slate-900">{row.accountName}</p>
                        <p className="text-[12px] tabular-nums text-slate-500">
                          {formatAccountNumber(row.Id)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <ShowingAdsBadge account={row} />
                      </TableCell>
                      <TableCell>
                        <ImpactCounts account={row} />
                      </TableCell>
                      <TableCell className="pe-6">
                        <BudgetPacingBar account={row} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <footer className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 px-4 py-4 sm:flex-row sm:px-6">
            <p className="text-[13px] font-medium text-slate-600">
              {filteredAccounts.length === 0
                ? "No accounts to display."
                : `Showing ${sliceStart + 1} to ${Math.min(safePage * pageSize, filteredAccounts.length)} of ${filteredAccounts.length} accounts`}
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
                      className="px-1.5 text-[13px] text-slate-400"
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
        </Card>
      </section>
    </div>
  );
}
