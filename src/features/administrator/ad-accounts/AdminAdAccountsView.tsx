"use client";

import { InfoCircledIcon } from "@radix-ui/react-icons";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleCheckBig,
  Download,
  Eye,
  Filter,
  MoreHorizontal,
  PencilLine,
  Plus,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";

import { GoogleAdsMark } from "@/components/GoogleAdsMark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ALERT_SEVERITY_COLORS } from "@/lib/constants";

interface AdAccountDemoRow {
  id: string;
  accountName: string;
  accountSubtitle: string;
  customer: string;
  accountIdSlug: string;
  connectionStatus: "active" | "paused" | "not_connected";
  showingAds: boolean;
  alerts: { critical: number; medium: number; low: number };
  spendMtd: number;
  pacingPercentDisplay: number;
  pacingPercentBar: number;
  pacingDayPercent: number;
  pacingDotHex: string;
}

const ACCOUNT_NAME_SAMPLES = [
  "McGrath Kavinoky LLP",
  "Lakeside Boutique",
  "Nexus AI Labs",
  "Sunrise Catering Co.",
  "PixelForge Studios",
  "Acme Diagnostics",
  "Harbor Freight Media",
  "Northwind Traders Ads",
];

const SUBTITLES = [
  "Search · Lead Gen",
  "Shopping · Retail",
  "Performance Max · B2B",
  "Demand Gen · Hospitality",
  "Video · SaaS Marketing",
];

function seedRows(): AdAccountDemoRow[] {
  return Array.from({ length: 42 }, (_, i) => {
    const nameIdx = i % ACCOUNT_NAME_SAMPLES.length;
    const subIdx = i % SUBTITLES.length;
    const statusRoll = i % 7;
    const connectionStatus: AdAccountDemoRow["connectionStatus"] =
      statusRoll === 0 ? "paused" : statusRoll === 1 ? "not_connected" : "active";

    const progress = 42 + ((i * 73) % 520);
    const dayPct = 15 + ((i * 31) % 82);
    let dotHex = "#1BC47D";
    if (progress > 200) dotHex = "#ff7f26";
    if (progress > 400) dotHex = "#eb0009";

    return {
      id: `acc-${String(i + 1).padStart(3, "0")}`,
      accountName:
        i < ACCOUNT_NAME_SAMPLES.length && i < 8
          ? ACCOUNT_NAME_SAMPLES[i]
          : `${ACCOUNT_NAME_SAMPLES[nameIdx]} (${Math.floor(i / 8) + 1})`,
      accountSubtitle: SUBTITLES[subIdx],
      customer: `${100 + ((i * 17) % 800)}-${200 + ((i * 53) % 700)}-${1000 + ((i * 91) % 9000)}`,
      accountIdSlug: `${300 + ((i * 11) % 600)}-${100 + ((i * 61) % 800)}-${4000 + ((i * 23) % 5000)}`,
      connectionStatus,
      showingAds: connectionStatus === "not_connected" ? false : i % 11 !== 0,
      alerts: {
        critical: ((i + 5) ** 3) % 6,
        medium: ((i * 11) >> 3) % 5,
        low: ((i * 31) >> 5) % 8,
      },
      spendMtd: 840 + ((i * 317) % 12400),
      pacingPercentDisplay: Math.round((progress + i * 0.13) * 10) / 10,
      pacingPercentBar: Math.min(115, progress),
      pacingDayPercent: dayPct,
      pacingDotHex: dotHex,
    };
  });
}

const ALL_ROWS = seedRows();

function DashboardStyleMetricCard({
  title,
  value,
  trend,
  trendTone,
  Icon,
  accentClassName,
}: {
  title: string;
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

function connectionBadge(status: AdAccountDemoRow["connectionStatus"]) {
  if (status === "active") {
    return (
      <Badge variant="success" className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
        Active
      </Badge>
    );
  }
  if (status === "paused") {
    return (
      <Badge variant="warning" className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
        Paused
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-700">
      Not Connected
    </Badge>
  );
}

function ShowingAdsPill({
  yes,
}: {
  yes: boolean;
}) {
  if (!yes) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 font-normal text-[0.75rem] text-red-700">
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-red-500">
          <X className="size-2.5 text-white" strokeWidth={2.75} aria-hidden />
        </span>
        No
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 font-normal text-[0.75rem] text-green-700">
      <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
        <title>Showing ads yes</title>
        <rect width="16" height="16" rx="8" fill="#22C55E" />
        <path
          d="M11.5 5.5l-4.5 4.5-2-2"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Yes
    </span>
  );
}

function ImpactDotsCell({ critical, medium, low }: AdAccountDemoRow["alerts"]) {
  const parts: ReactNode[] = [];

  parts.push(
    <span key="c" className="flex items-center gap-2">
      <span
        className="inline-block size-3 rounded-full"
        style={{ background: ALERT_SEVERITY_COLORS.CRITICAL }}
      />
      <span className="font-regular text-[0.75rem] text-gray-900">
        {critical}
      </span>
    </span>,
    <span key="m" className="flex items-center gap-2">
      <span
        className="inline-block size-3 rounded-full"
        style={{ background: ALERT_SEVERITY_COLORS.MEDIUM }}
      />
      <span className="font-regular text-[0.75rem] text-gray-900">{medium}</span>
    </span>,
    <span key="l" className="flex items-center gap-2">
      <span
        className="inline-block size-3 rounded-full"
        style={{ background: ALERT_SEVERITY_COLORS.LOW }}
      />
      <span className="font-regular text-[0.75rem] text-gray-900">{low}</span>
    </span>,
  );

  return <div className="flex flex-wrap items-center gap-4">{parts}</div>;
}

function BudgetPacingCell({
  percentBar,
  percentText,
  dayPercent,
  dotHex,
}: {
  percentBar: number;
  percentText: number;
  dayPercent: number;
  dotHex: string;
}) {
  const pct = Math.round(percentBar * 10) / 10;
  const showLabelOutsideBar = pct < 15;

  return (
    <div className="flex min-w-[240px] items-center gap-3 pr-12">
      <div className="relative flex h-6 w-full items-center">
        <div className="absolute top-1/2 left-0 z-0 h-6 w-full -translate-y-1/2 rounded-full border border-[#E3E8F0] bg-white shadow-none" />
        <div
          className="absolute top-1/2 left-0 z-0 h-6 -translate-y-1/2 rounded-full bg-[#156CFF] shadow-sm"
          style={{
            width: `${Math.min(percentBar, 100)}%`,
            minWidth: percentBar > 0 ? "10px" : 0,
          }}
        />
        {showLabelOutsideBar ? (
          <span
            className="absolute top-0 z-[1] flex h-6 select-none items-center text-[0.75rem] font-normal text-gray-900"
            style={{ left: `calc(${Math.min(percentBar, 100)}% + 12px)` }}
          >
            {percentText}%
          </span>
        ) : (
          <span
            className="absolute top-0 z-[1] flex h-6 -translate-x-1/2 select-none items-center text-[0.75rem] font-normal text-white drop-shadow-sm"
            style={{
              left: `calc(${Math.min(percentBar, 100) / 2}%)`,
            }}
          >
            {percentText}%
          </span>
        )}
        <div
          className="pointer-events-none absolute top-1 z-[1] h-4"
          style={{ left: `calc(${dayPercent}% - 1px)` }}
        >
          <div className="h-4 w-0.5 rounded-sm bg-[#7A7D9C]" />
        </div>
      </div>
      <span
        className="inline-block size-3 shrink-0 rounded-full border border-white shadow-none"
        style={{ background: dotHex }}
      />
    </div>
  );
}

const PAGE_SIZE = 8;

export function AdminAdAccountsView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_ROWS;
    const q = search.trim().toLowerCase();
    return ALL_ROWS.filter(
      (row) =>
        row.accountName.toLowerCase().includes(q) ||
        row.customer.includes(q.replace(/\s/g, "")) ||
        row.accountIdSlug.includes(q.replace(/\s/g, "")),
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

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl space-y-2">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 sm:text-[30px]">
            Ad Accounts
          </h1>
          <p className="text-[15px] text-[#7A7D9C]">
            Manage and monitor all connected ad accounts
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            className="rounded-xl gap-2 bg-[#015AFD] px-4 hover:bg-[#0147d9]"
          >
            <Plus className="size-4" aria-hidden />
            Add Ad Account
          </Button>
        </div>
      </header>

      {/* KPI */}
      <section className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="flex min-h-[140px] justify-center gap-0 rounded-xl border border-slate-200 bg-white py-0 shadow-sm">
          <CardContent className="flex flex-1 items-center justify-between gap-4 px-6 py-6">
            <div className="min-w-0 space-y-1">
              <p className="text-muted-foreground text-sm font-medium">
                Total Ad Accounts
              </p>
              <p className="truncate text-[28px] font-bold tracking-tight text-slate-900">
                42
              </p>
              <p className="text-sm font-medium text-[#22c55e]">
                ↑ 8 vs last 7 days
              </p>
            </div>
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#3b82f6]/10">
              <GoogleAdsMark />
            </span>
          </CardContent>
        </Card>
        <DashboardStyleMetricCard
          title="Active"
          value="28"
          trend="↑ 6 vs last 7 days"
          trendTone="positive"
          Icon={CircleCheckBig}
          accentClassName="bg-[#22c55e]/15 text-[#16a34a]"
        />
        <DashboardStyleMetricCard
          title="Not Showing Ads"
          value="6"
          trend="↓ 2 vs last 7 days"
          trendTone="negative"
          Icon={TriangleAlert}
          accentClassName="bg-[#ef4444]/12 text-[#ef4444]"
        />
        <DashboardStyleMetricCard
          title="With Alerts"
          value="18"
          trend="↑ 4 vs last 7 days"
          trendTone="positive"
          Icon={Bell}
          accentClassName="bg-orange-400/18 text-orange-600"
        />
      </section>

      {/* Toolbar + table */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-200 sm:max-w-xl">
            <Search className="size-5 shrink-0 text-[#015AFD]" aria-hidden />
            <input
              className="min-w-0 flex-1 border-none bg-transparent text-[0.75rem] text-gray-700 outline-none placeholder:text-gray-400"
              placeholder="Search ad accounts..."
              aria-label="Search ad accounts"
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
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" type="button" className="gap-2 rounded-lg border-[#e5e5e5] bg-white">
              <Filter className="size-4 text-gray-700" aria-hidden />
              Filters
            </Button>
            <Button variant="outline" size="sm" type="button" className="gap-2 rounded-lg border-[#e5e5e5] bg-white">
              <Download className="size-4 text-gray-700" aria-hidden />
              Export
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-none">
          <div className="block max-[991px]:overflow-x-auto max-[991px]:whitespace-nowrap">
            <table className="min-w-full text-[0.75rem]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-4 text-left font-semibold text-gray-700">
                    Account Name
                  </th>
                  <th className="px-4 py-4 text-left font-semibold text-gray-700">
                    Customer
                  </th>
                  <th className="px-4 py-4 text-left font-semibold text-gray-700">
                    Account ID
                  </th>
                  <th className="px-4 py-4 text-left font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-4 py-4 text-left font-semibold text-gray-700">
                    <span className="inline-flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="rounded p-0.5 hover:bg-gray-100"
                            aria-label="Showing Ads info"
                          >
                            <InfoCircledIcon className="size-3 text-blue-500" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="max-w-xs text-xs"
                          align="center"
                        >
                          If impressions stop for two hours, status becomes Not
                          Showing Ads.
                        </TooltipContent>
                      </Tooltip>
                      Showing Ads
                    </span>
                  </th>
                  <th className="px-4 py-4 text-left font-semibold text-gray-700">
                    Alerts
                  </th>
                  <th className="px-4 py-4 text-left font-semibold text-gray-700">
                    Spend (MTD)
                  </th>
                  <th className="px-4 py-4 text-left font-semibold text-gray-700 pr-12">
                    Budget Pacing
                  </th>
                  <th className="whitespace-normal px-4 py-4 text-center font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {totalRows === 0 ? (
                  <tr>
                    <td className="px-4 py-16 text-center text-gray-500" colSpan={9}>
                      No ad accounts match your search.
                    </td>
                  </tr>
                ) : pagedRows.map((acc) => (
                  <tr
                    key={acc.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="px-4 py-6 whitespace-normal">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex size-9 shrink-0 items-center justify-center">
                          <GoogleAdsMark muted={acc.connectionStatus === "not_connected"} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-base leading-snug font-semibold text-gray-900">
                            {acc.accountName}
                          </p>
                          <p className="mt-1 text-[13px] text-gray-500">
                            {acc.accountSubtitle}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-6 font-mono text-[0.8125rem] text-gray-800">
                      {acc.customer}
                    </td>
                    <td className="font-mono whitespace-nowrap px-4 py-6 text-[13px] text-gray-700">
                      {acc.accountIdSlug}
                    </td>
                    <td className="px-4 py-6 whitespace-normal">
                      {connectionBadge(acc.connectionStatus)}
                    </td>
                    <td className="px-4 py-6 whitespace-normal">
                      <ShowingAdsPill yes={acc.showingAds} />
                    </td>
                    <td className="px-4 py-6 whitespace-normal">
                      <ImpactDotsCell {...acc.alerts} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-6 text-[0.8125rem] tabular-nums text-gray-900">
                      $
                      {acc.spendMtd.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-6 whitespace-normal align-middle">
                      <BudgetPacingCell
                        percentBar={acc.pacingPercentBar}
                        percentText={acc.pacingPercentDisplay}
                        dayPercent={acc.pacingDayPercent}
                        dotHex={acc.pacingDotHex}
                      />
                    </td>
                    <td className="whitespace-normal px-4 py-6 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          aria-label={`View ${acc.accountName}`}
                          className="rounded-lg p-2 text-[#015AFD] hover:bg-blue-50"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Edit ${acc.accountName}`}
                          className="rounded-lg p-2 text-[#015AFD] hover:bg-blue-50"
                        >
                          <PencilLine className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`More actions for ${acc.accountName}`}
                          className="rounded-lg p-2 text-[#015AFD] hover:bg-blue-50"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row">
            <p className="text-[0.75rem] font-medium text-gray-600">
              {totalRows === 0 ? (
                "No ad accounts to show."
              ) : (
                <>
                  Showing {sliceStart + 1} to{" "}
                  {Math.min(safePage * PAGE_SIZE, totalRows)} of {totalRows} ad
                  accounts
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <Button
                    key={n}
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(n)}
                    aria-current={safePage === n ? "page" : undefined}
                    className={cn(
                      "h-8 min-w-8 px-2 text-[0.75rem] font-medium disabled:opacity-50",
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
      </div>
    </div>
  );
}
