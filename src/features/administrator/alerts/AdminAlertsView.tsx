"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleCheckBig,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Info,
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
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { AdminDashboardDateRangePicker } from "../dashboard/AdminDashboardDateRangePicker";

type AlertSeverity = "critical" | "warning" | "info";
type AlertWorkflowStatus =
  | "new"
  | "acknowledged"
  | "in_progress"
  | "resolved";

interface AlertDemoRow {
  id: string;
  title: string;
  subtitle: string;
  severity: AlertSeverity;
  workflowStatus: AlertWorkflowStatus;
  adPlatformKey: "meta" | "google" | "tiktok";
  adAccountShortName: string;
  adAccountId: string;
  customerName: string;
  detectedAtLabel: string;
  campaignLabel: string;
  metricLabel: string;
  changeLabel: string;
  changeTone: "negative" | "positive" | "neutral";
  periodLabel: string;
  comparedToLabel: string;
  narrative: string;
}

interface AdAccountSeed {
  id: string;
  customer: string;
  shortName: string;
}

const CUSTOMERS = [
  "McGrath Kavinoky LLP",
  "Lakeside Boutique",
  "Nexus AI Labs",
  "Sunrise Catering Co.",
  "PixelForge Studios",
  "Acme Diagnostics LLC",
  "Harbor Media Group",
  "Northwind Collective",
];

function buildAdAccounts(): AdAccountSeed[] {
  return CUSTOMERS.map((customer, idx) => ({
    id:
      idx === 0
        ? "123-521-1719"
        : `${100 + idx}-${520 + idx * 97}-${1719 + idx * 41}`,
    customer,
    shortName:
      customer === "McGrath Kavinoky LLP"
        ? "McGrath Kav..."
        : customer.length <= 14
          ? customer
          : `${customer.slice(0, 12).trim()}…`,
  }));
}

const AD_ACCOUNT_SEED = buildAdAccounts();

const PLATFORM_STYLE = {
  meta: {
    bg: "bg-[linear-gradient(135deg,#0866FF,#4AA9FF)]",
    letter: "M",
    label: "Meta",
  },
  google: {
    bg: "bg-[linear-gradient(135deg,#34A853,#FBBC05)]",
    letter: "G",
    label: "Google Ads",
  },
  tiktok: { bg: "bg-black", letter: "T", label: "TikTok" },
} satisfies Record<
  AlertDemoRow["adPlatformKey"],
  { bg: string; letter: string; label: string }
>;

const DETECTED_AT_POOL = [
  "May 15, 2025 10:24 AM",
  "May 15, 2025 07:52 AM",
  "May 14, 2025 04:11 PM",
  "May 14, 2025 09:06 AM",
  "May 13, 2025 02:41 PM",
  "May 13, 2025 11:18 AM",
  "May 12, 2025 06:03 PM",
  "May 12, 2025 10:55 AM",
] as const;

const ALERT_BLUEPRINT = [
  {
    title: "Conversions decreased by over 50%",
    subtitle:
      "Last 24h conversions fell sharply vs the trailing 14-day baseline for this portfolio.",
    metric: "Conversions",
    change: "-57.3%",
  },
  {
    title: "ROAS dipped below rolling target floor",
    subtitle:
      "Rolling 7-day ROAS breached the stewardship band set for scaled spend.",
    metric: "Return on Ad Spend",
    change: "-18.9%",
  },
  {
    title: "Audience overlap surge across active campaigns",
    subtitle:
      "High overlap flagged between sibling campaigns bidding for overlapping queries.",
    metric: "Overlap score",
    change: "+34.1%",
  },
  {
    title: "Ad group budget exhaustion before daypart close",
    subtitle:
      "One or more ad groups depleted daily budget unusually early versus norm.",
    metric: "Spend pace",
    change: "+42.7%",
  },
  {
    title: "Landing page CLS regression detected post-release",
    subtitle:
      "Cumulative Layout Shift degraded on the tracked variant after template deploy.",
    metric: "Core Web Vital (CLS)",
    change: "+0.12",
  },
] as const;

const PAGE_SIZE = 8;

function severityFromIndex(i: number): AlertSeverity {
  if (i % 37 === 0 || i % 41 === 0) return "critical";
  if (i % 7 === 0 || i % 13 === 0) return "info";
  return "warning";
}

function workflowFromIndex(i: number): AlertWorkflowStatus {
  if (i % 19 === 0) return "new";
  if (i % 17 === 0) return "acknowledged";
  if (i % 23 === 0) return "in_progress";
  return "resolved";
}

function changeToneForBlueprint(
  metric: string,
  change: string,
): AlertDemoRow["changeTone"] {
  if (change.startsWith("-")) return "negative";
  if (metric.includes("overlap") || metric.includes("Overlap")) return "neutral";
  if (metric.includes("CLS") || metric.includes("Spend")) return "negative";
  return change.startsWith("+") ? "negative" : "neutral";
}

function seedAlerts(): AlertDemoRow[] {
  return Array.from({ length: 142 }, (_, idx) => {
    const blueprint = ALERT_BLUEPRINT[idx % ALERT_BLUEPRINT.length];
    const account = AD_ACCOUNT_SEED[idx % AD_ACCOUNT_SEED.length];
    const platforms: AlertDemoRow["adPlatformKey"][] = ["meta", "google", "tiktok"];
    const plat = platforms[idx % platforms.length];

    let severity = severityFromIndex(idx);
    let workflow = workflowFromIndex(idx);
    if (idx === 0) {
      severity = "critical";
      workflow = "new";
    }

    const narrative =
      idx === 0
        ? "This threshold alert fires when the short-window conversion aggregate falls more than 50% beneath the stabilized baseline for comparable traffic. Review recent creative swaps, attribution lag, tracking health, and any bid or budget clamps that coincide with the window start."
        : "Generated from anomaly detection over the stewardship window versus the comparator period. Drill into placements, creatives, geo splits, and change history to isolate root cause.";

    return {
      id: `alrt-${String(idx + 1).padStart(3, "0")}`,
      title: blueprint.title,
      subtitle: blueprint.subtitle,
      severity,
      workflowStatus: workflow,
      adPlatformKey: plat,
      adAccountShortName: account.shortName,
      adAccountId: account.id,
      customerName: account.customer,
      detectedAtLabel: DETECTED_AT_POOL[idx % DETECTED_AT_POOL.length],
      campaignLabel: "All Campaigns",
      metricLabel: blueprint.metric,
      changeLabel: blueprint.change,
      changeTone: changeToneForBlueprint(blueprint.metric, blueprint.change),
      periodLabel: "May 09, 2025 – May 15, 2025",
      comparedToLabel: "May 02, 2025 – May 08, 2025",
      narrative,
    };
  });
}

const ALL_ALERTS = seedAlerts();

function payoutSlots(
  currentPage: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, k) => k + 1);
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

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  if (severity === "critical") {
    return (
      <span className="inline-flex rounded-full bg-[#ef4444]/12 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#b91c1c] ring-1 ring-[#fecaca]/80">
        Critical
      </span>
    );
  }
  if (severity === "warning") {
    return (
      <span className="inline-flex rounded-full bg-orange-400/16 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#c2410c] ring-1 ring-orange-300/55">
        Warning
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[#3b82f6]/12 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#1d4ed8] ring-1 ring-[#bfdbfe]">
      Info
    </span>
  );
}

function WorkflowStatusBadge({ status }: { status: AlertWorkflowStatus }) {
  if (status === "new") {
    return (
      <span className="inline-flex rounded-full bg-[#ef4444]/12 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#b91c1c] ring-1 ring-[#fecaca]/80">
        New
      </span>
    );
  }
  if (status === "acknowledged") {
    return (
      <span className="inline-flex rounded-full bg-[#3b82f6]/12 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#1e40af] ring-1 ring-[#bfdbfe]">
        Acknowledged
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex rounded-full bg-orange-400/14 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#c2410c] ring-1 ring-orange-300/55">
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[#22c55e]/14 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#15803d] ring-1 ring-[#22c55e]/28">
      Resolved
    </span>
  );
}

function AlertGlyph({
  severity,
  className,
}: {
  severity: AlertSeverity;
  className?: string;
}) {
  if (severity === "critical") {
    return (
      <TriangleAlert
        aria-hidden
        className={cn("text-[#ef4444]", className)}
        strokeWidth={1.85}
      />
    );
  }
  if (severity === "warning") {
    return (
      <AlertCircle
        aria-hidden
        className={cn("text-[#ea580c]", className)}
        strokeWidth={1.85}
      />
    );
  }
  return (
    <Info
      aria-hidden
      className={cn("text-[#2563eb]", className)}
      strokeWidth={1.85}
    />
  );
}

interface MetaRowProps {
  label: string;
  children: ReactNode;
}

function MetaRow({ label, children }: MetaRowProps) {
  return (
    <div className="flex items-start justify-between gap-6 text-[13px]">
      <span className="shrink-0 font-medium text-gray-500">{label}</span>
      <span className="min-w-0 text-end font-semibold leading-snug text-gray-900">
        {children}
      </span>
    </div>
  );
}

function AdLogo({ platform }: { platform: AlertDemoRow["adPlatformKey"] }) {
  const plat = PLATFORM_STYLE[platform];
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl text-[12px] font-black text-white shadow-sm",
        plat.bg,
      )}
    >
      {plat.letter}
    </span>
  );
}

const SELECT_CLASS =
  "min-w-[140px] appearance-none rounded-lg border border-gray-200 bg-white py-2.5 ps-4 pe-9 text-[13px] font-medium text-gray-700 shadow-xs transition-colors focus-visible:border-[#015AFD] focus-visible:ring-2 focus-visible:ring-[#015AFD]/25";

interface AlertDetailPanelProps {
  row: AlertDemoRow;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

function AlertDetailPanel({ row, open, onOpenChange }: AlertDetailPanelProps) {
  const changeCn =
    row.changeTone === "negative"
      ? "font-bold text-[#dc2626]"
      : row.changeTone === "positive"
        ? "font-bold text-[#16a34a]"
        : "font-bold text-slate-800";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton
        className="gap-0 p-0 sm:max-w-[460px]"
      >
        <div className="flex h-full min-h-0 flex-col bg-white">
          <SheetHeader className="gap-4 border-b border-gray-100 p-6 text-start">
            <div className="flex items-start gap-4">
              <span
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-xl",
                  row.severity === "critical" && "bg-[#fef2f2]",
                  row.severity === "warning" && "bg-orange-50",
                  row.severity === "info" && "bg-[#eff6ff]",
                )}
              >
                <AlertGlyph severity={row.severity} className="size-7" />
              </span>
              <div className="min-w-0 flex-1 space-y-3">
                <SeverityBadge severity={row.severity} />
                <SheetTitle className="text-[21px] font-bold leading-snug tracking-tight text-gray-900">
                  {row.title}
                </SheetTitle>
                <p className="text-[13px] font-medium leading-relaxed text-[#64748b]">
                  {row.subtitle}
                </p>
              </div>
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
            <section className="space-y-3">
              <MetaRow label="Status">
                <WorkflowStatusBadge status={row.workflowStatus} />
              </MetaRow>
              <MetaRow label="Detected At">{row.detectedAtLabel}</MetaRow>
              <MetaRow label="Ad Account">
                <span className="inline-flex flex-wrap items-center justify-end gap-2">
                  <span className="inline-flex items-center gap-2">
                    <AdLogo platform={row.adPlatformKey} />
                    <span className="text-start leading-snug">
                      <span className="font-semibold text-gray-900">
                        {row.adAccountShortName}
                      </span>{" "}
                      <span className="tabular-nums text-gray-600">
                        {row.adAccountId}
                      </span>
                    </span>
                  </span>
                  <a
                    href="#"
                    className="rounded-md p-1 text-[#015AFD] hover:bg-blue-50"
                    aria-label="Open ad account"
                    onClick={(e) => e.preventDefault()}
                  >
                    <ExternalLink className="size-4" />
                  </a>
                </span>
              </MetaRow>
              <MetaRow label="Customer">{row.customerName}</MetaRow>
              <MetaRow label="Campaign">{row.campaignLabel}</MetaRow>
              <MetaRow label="Metric">{row.metricLabel}</MetaRow>
              <MetaRow label="Change">
                <span className={changeCn}>{row.changeLabel}</span>
              </MetaRow>
              <MetaRow label="Period">{row.periodLabel}</MetaRow>
              <MetaRow label="Compared To">{row.comparedToLabel}</MetaRow>
            </section>

            <section className="space-y-2">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#475569]">
                Description
              </h3>
              <p className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 text-[13px] leading-relaxed text-gray-700">
                {row.narrative}
              </p>
            </section>
          </div>

          <SheetFooter className="border-t border-gray-100 p-6 sm:flex-col sm:space-x-0">
            <Button
              type="button"
              className="h-11 w-full rounded-xl bg-[#015AFD] font-semibold text-white hover:bg-[#014bcc]"
            >
              Acknowledge alert
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full gap-2 rounded-xl border-[#22c55e] font-semibold text-[#15803d] hover:bg-[#ecfdf5]"
            >
              <CircleCheckBig className="size-4" aria-hidden />
              Mark as resolved
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AdminAlertsView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [severityFilter, setSeverityFilter] = useState<
    AlertSeverity | "all"
  >("all");
  const [workflowFilter, setWorkflowFilter] = useState<
    AlertWorkflowStatus | "all"
  >("all");
  const [adAccountFilter, setAdAccountFilter] = useState<string>("all");

  const [detailRowId, setDetailRowId] = useState<string | null>(
    ALL_ALERTS[0]?.id ?? null,
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => {
    let rows = ALL_ALERTS;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (row) =>
          row.title.toLowerCase().includes(q) ||
          row.subtitle.toLowerCase().includes(q) ||
          row.customerName.toLowerCase().includes(q) ||
          row.adAccountShortName.toLowerCase().includes(q) ||
          row.adAccountId.includes(q.replace(/\s/g, "")),
      );
    }

    if (severityFilter !== "all") {
      rows = rows.filter((row) => row.severity === severityFilter);
    }
    if (workflowFilter !== "all") {
      rows = rows.filter((row) => row.workflowStatus === workflowFilter);
    }
    if (adAccountFilter !== "all") {
      rows = rows.filter((row) => row.adAccountId === adAccountFilter);
    }

    return rows;
  }, [search, severityFilter, workflowFilter, adAccountFilter]);

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
      return;
    }
    setDetailRowId((prev) =>
      prev && filtered.some((r) => r.id === prev)
        ? prev
        : (filtered[0]?.id ?? null),
    );
  }, [filtered]);

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

  const handleResetPaging = () => setPage(1);

  const handleActivateRow = (row: AlertDemoRow) => {
    setDetailRowId(row.id);
    setDetailOpen(true);
  };

  const detailRow =
    detailRowId === null
      ? null
      : (ALL_ALERTS.find((r) => r.id === detailRowId) ?? null);

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 pb-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 sm:text-[30px]">
            Alerts
          </h1>
          <p className="text-[15px] text-[#7A7D9C]">
            Monitor and manage all system alerts across your ad accounts
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
          title="Total Alerts"
          value="142"
          trend="+ 18% vs last 7 days"
          trendTone="positive"
          Icon={Bell}
          accentClassName="bg-[#3b82f6]/10 text-[#2563eb]"
        />
        <DashboardMetricCard
          title="Critical"
          value="34"
          trend="+ 10% vs last 7 days"
          trendTone="positive"
          Icon={TriangleAlert}
          accentClassName="bg-[#fecaca]/40 text-[#dc2626]"
        />
        <DashboardMetricCard
          title="Warning"
          value="56"
          trend="+ 8% vs last 7 days"
          trendTone="positive"
          Icon={AlertCircle}
          accentClassName="bg-orange-100 text-[#ea580c]"
        />
        <DashboardMetricCard
          title="Info"
          value="52"
          trend="↓ 4% vs last 7 days"
          trendTone="negative"
          Icon={Info}
          accentClassName="bg-[#bfdbfe]/45 text-[#1d4ed8]"
        />
        <DashboardMetricCard
          title="Resolved"
          value="126"
          trend="↑ 22% vs last 7 days"
          trendTone="positive"
          Icon={CircleCheckBig}
          accentClassName="bg-[#22c55e]/15 text-[#16a34a]"
        />
      </section>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-200">
            <Search className="size-5 shrink-0 text-[#015AFD]" aria-hidden />
            <input
              className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
              placeholder="Search alerts by description, customer or ad account..."
              value={search}
              aria-label="Search alerts"
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
              aria-label="Filter by severity"
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value as AlertSeverity | "all");
                handleResetPaging();
              }}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
            />
          </div>

          <div className="relative">
            <select
              className={SELECT_CLASS}
              aria-label="Filter by workflow status"
              value={workflowFilter}
              onChange={(e) => {
                const v = e.target.value as AlertWorkflowStatus | "all";
                setWorkflowFilter(v);
                handleResetPaging();
              }}
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
            />
          </div>

          <div className="relative">
            <select
              className={cn(SELECT_CLASS, "min-w-[192px]")}
              aria-label="Filter by ad account"
              value={adAccountFilter}
              onChange={(e) => {
                setAdAccountFilter(e.target.value);
                handleResetPaging();
              }}
            >
              <option value="all">All Ad Accounts</option>
              {AD_ACCOUNT_SEED.map((acct) => (
                <option key={acct.id} value={acct.id}>
                  {acct.customer}
                </option>
              ))}
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
            className="gap-2 rounded-lg border-[#e5e5e5] bg-white"
          >
            <Filter className="size-4 text-gray-700" aria-hidden />
            More Filters
          </Button>

          <div className="ms-auto flex items-center gap-1">
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
          </div>
        </div>

        {viewMode === "list" ? (
          filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#e5e5e5] bg-white py-24 text-center text-[14px] text-gray-600">
              No alerts match your filters.
            </div>
          ) : (
            <AlertsTable
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
            Alert cards in grid view can summarize severity ladders and playbook
            links once UX approves condensed alert layouts.
          </div>
        )}

        <footer className="flex flex-col items-center justify-between gap-4 px-2 sm:flex-row">
          <p className="text-[13px] font-medium text-gray-600">
            {totalRows === 0
              ? "No alerts match your filters."
              : `Showing ${sliceStart + 1} to ${Math.min(safePage * PAGE_SIZE, totalRows)} of ${totalRows} alerts`}
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
        <AlertDetailPanel
          row={detailRow}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      ) : null}
    </div>
  );
}

function AlertsTable({
  rows,
  selected,
  toggleRow,
  headerChecked,
  toggleHeader,
  highlightedId,
  onActivateRow,
}: {
  rows: AlertDemoRow[];
  selected: Set<string>;
  toggleRow: (id: string) => void;
  headerChecked: boolean | "indeterminate";
  toggleHeader: () => void;
  highlightedId: string | null;
  onActivateRow: (row: AlertDemoRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-none">
      <div className="max-[1399px]:overflow-x-auto">
        <table className="min-w-[1160px] w-full table-fixed text-[13px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="w-[48px] px-3 py-3 text-start">
                <Checkbox
                  checked={headerChecked}
                  aria-label="Select all on this page"
                  onCheckedChange={() => toggleHeader()}
                />
              </th>
              <th className="min-w-[280px] ps-2 pe-4 py-3 text-start font-semibold text-gray-700">
                Alert
              </th>
              <th className="w-[110px] py-3 pe-4 text-start font-semibold text-gray-700">
                Severity
              </th>
              <th className="min-w-[200px] py-3 pe-4 text-start font-semibold text-gray-700">
                Ad Account
              </th>
              <th className="min-w-[160px] py-3 pe-4 text-start font-semibold text-gray-700">
                Customer
              </th>
              <th className="w-[164px] py-3 pe-4 text-start font-semibold text-gray-700">
                Detected At
              </th>
              <th className="w-[138px] py-3 pe-4 text-start font-semibold text-gray-700">
                Status
              </th>
              <th className="w-[100px] py-3 px-4 text-center font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const isDetail = highlightedId === row.id;
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
                  <td className="px-3 py-4 align-middle" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(row.id)}
                      aria-label={`Select ${row.title}`}
                      onCheckedChange={() => toggleRow(row.id)}
                    />
                  </td>
                  <td className="px-3 py-4 align-middle">
                    <div className="flex gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white shadow-xs",
                          row.severity === "critical" &&
                            "bg-[#fef2f2]",
                          row.severity === "warning" && "bg-orange-50",
                          row.severity === "info" && "bg-[#eff6ff]",
                        )}
                      >
                        <AlertGlyph severity={row.severity} className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold leading-snug text-gray-900">
                          {row.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-gray-500">
                          {row.subtitle}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pe-3 align-middle">
                    <SeverityBadge severity={row.severity} />
                  </td>
                  <td className="py-4 pe-3 align-middle">
                    <div className="flex items-center gap-3">
                      <AdLogo platform={row.adPlatformKey} />
                      <div className="min-w-0 leading-snug">
                        <p className="truncate font-semibold text-gray-900">
                          {row.adAccountShortName}
                        </p>
                        <p className="mt-1 tabular-nums text-[12px] text-gray-600">
                          {row.adAccountId}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="truncate px-2 py-4 align-middle font-medium text-gray-900">
                    {row.customerName}
                  </td>
                  <td className="truncate py-4 pe-3 align-middle text-gray-700">
                    {row.detectedAtLabel}
                  </td>
                  <td className="py-4 pe-3 align-middle">
                    <WorkflowStatusBadge status={row.workflowStatus} />
                  </td>
                  <td
                    className="px-2 py-4 align-middle text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        type="button"
                        aria-label={`View alert ${row.title}`}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        onClick={() => onActivateRow(row)}
                      >
                        <Eye className="size-4" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        aria-label={`More actions for ${row.title}`}
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
