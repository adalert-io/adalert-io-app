"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CircleCheckBig,
  Clock,
  Eye,
  Globe2,
  Loader2,
  RefreshCw,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type MonitorLifecycleStatus = "pending" | "active" | "paused";
type MonitorCheckStatus = "pending" | "up" | "down" | "degraded";
type CheckFilter = MonitorCheckStatus | "all";

interface LandingPageMonitorRow {
  id: string;
  monitorKey: string;
  url: string;
  hostname: string;
  adsAccountId: string;
  adminUserId: string;
  adminEmail: string;
  adminEmailTransformed: string;
  status: MonitorLifecycleStatus;
  checkFrequencySeconds: number;
  lastCheckedAt: string | null;
  lastCheckStatus: MonitorCheckStatus;
  lastHttpCode: number | null;
  lastResponseMs: number | null;
  lastErrorMessage: string | null;
  lastSyncedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface MonitoringMetrics {
  total: number;
  active: number;
  down: number;
  degraded: number;
  pendingCheck: number;
  paused: number;
}

interface RecheckResult {
  monitorId: string;
  url: string;
  status: string;
  httpCode: number | null;
  responseMs: number | null;
  alertCreated: boolean;
  skippedReason: string | null;
}

const PAGE_SIZE = 10;

const SELECT_CLASS =
  "min-w-[140px] appearance-none rounded-lg border border-gray-200 bg-white py-2.5 ps-3 pe-8 text-[13px] font-medium text-gray-700 shadow-xs focus-visible:border-[#015AFD] focus-visible:ring-2 focus-visible:ring-[#015AFD]/25";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFrequency(seconds: number): string {
  if (seconds >= 3600 && seconds % 3600 === 0) {
    const hours = seconds / 3600;
    return `${hours}h`;
  }
  if (seconds >= 60) {
    return `${Math.round(seconds / 60)}m`;
  }
  return `${seconds}s`;
}

function CheckStatusBadge({ status }: { status: MonitorCheckStatus }) {
  const styles: Record<MonitorCheckStatus, string> = {
    up: "border-[#22c55e]/25 bg-[#22c55e]/12 text-[#15803d]",
    down: "border-[#fecaca] bg-[#ef4444]/12 text-[#dc2626]",
    degraded: "border-orange-300/45 bg-orange-400/14 text-orange-800",
    pending: "border-gray-200 bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

function LifecycleBadge({ status }: { status: MonitorLifecycleStatus }) {
  const styles: Record<MonitorLifecycleStatus, string> = {
    active: "border-[#3b82f6]/20 bg-[#3b82f6]/12 text-[#1d4ed8]",
    paused: "border-orange-300/45 bg-orange-400/14 text-orange-800",
    pending: "border-gray-200 bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

function DashboardMetricCard({
  title,
  value,
  Icon,
  accentClassName,
}: {
  title: string;
  value: string;
  Icon: LucideIcon;
  accentClassName: string;
}) {
  return (
    <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6 sm:py-6">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="truncate text-[26px] font-bold tracking-tight text-slate-900 sm:text-[28px]">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-full sm:size-14",
            accentClassName,
          )}
        >
          <Icon className="size-5 sm:size-6" strokeWidth={1.85} aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-[13px]">
      <span className="shrink-0 font-medium text-gray-500">{label}</span>
      <span className="min-w-0 text-end font-medium text-gray-900 break-all">
        {value}
      </span>
    </div>
  );
}

export function AdminMonitoringView() {
  const [rows, setRows] = useState<LandingPageMonitorRow[]>([]);
  const [metrics, setMetrics] = useState<MonitoringMetrics>({
    total: 0,
    active: 0,
    down: 0,
    degraded: 0,
    pendingCheck: 0,
    paused: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [checkFilter, setCheckFilter] = useState<CheckFilter>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<LandingPageMonitorRow | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [recheckingId, setRecheckingId] = useState<string | null>(null);

  const loadMonitors = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/monitoring", { cache: "no-store" });
      const payload = (await response.json()) as {
        monitors?: LandingPageMonitorRow[];
        metrics?: MonitoringMetrics;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load monitors");
      }
      setRows(payload.monitors ?? []);
      if (payload.metrics) setMetrics(payload.metrics);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load landing page monitors");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMonitors();
  }, [loadMonitors]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (checkFilter !== "all" && row.lastCheckStatus !== checkFilter) {
        return false;
      }
      if (!q) return true;
      return (
        row.url.toLowerCase().includes(q) ||
        row.hostname.toLowerCase().includes(q) ||
        row.adminEmail.toLowerCase().includes(q) ||
        row.adsAccountId.toLowerCase().includes(q) ||
        row.monitorKey.toLowerCase().includes(q)
      );
    });
  }, [rows, search, checkFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const sliceStart = (safePage - 1) * PAGE_SIZE;
  const sliceEnd = Math.min(safePage * PAGE_SIZE, filtered.length);
  const pagedRows = filtered.slice(sliceStart, sliceEnd);

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  function openDetail(row: LandingPageMonitorRow) {
    setSelected(row);
    setIsDetailOpen(true);
  }

  async function handleRecheck(row: LandingPageMonitorRow) {
    if (row.status !== "active") {
      toast.error("Only active monitors can be rechecked");
      return;
    }

    setRecheckingId(row.id);
    try {
      const response = await fetch("/api/admin/monitoring/recheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true, monitorId: row.id }),
      });
      const payload = (await response.json()) as {
        error?: string;
        alertsCreated?: number;
        results?: RecheckResult[];
      };
      if (!response.ok) {
        throw new Error(payload.error || "Recheck failed");
      }

      const result = payload.results?.[0];
      if (result?.skippedReason === "already_sent_today") {
        toast.message("Recheck complete", {
          description: "Monitor updated; alert already sent today.",
        });
      } else if (result?.alertCreated) {
        toast.success("Recheck complete — Landing Page alert created");
      } else if (result) {
        toast.success(`Recheck complete — status: ${result.status}`);
      } else {
        toast.success("Recheck complete");
      }

      await loadMonitors();
      if (selected?.id === row.id && result) {
        setSelected((prev) =>
          prev
            ? {
                ...prev,
                lastCheckStatus: (result.status as MonitorCheckStatus) || prev.lastCheckStatus,
                lastHttpCode: result.httpCode,
                lastResponseMs: result.responseMs,
                lastCheckedAt: new Date().toISOString(),
              }
            : prev,
        );
      }
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message || "Recheck failed");
    } finally {
      setRecheckingId(null);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Monitoring
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Landing page uptime monitors. Probing runs on the backend; use Recheck
            for a forced check.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-xl border-[#e5e5e5] bg-white"
            onClick={() => void loadMonitors()}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn("size-4", isLoading && "animate-spin")}
              aria-hidden
            />
            Refresh
          </Button>
          <Button
            type="button"
            asChild
            className="gap-2 rounded-xl bg-[#015AFD] px-4 hover:bg-[#0147d9]"
          >
            <Link href="/administrator/alerts">Landing page alerts</Link>
          </Button>
        </div>
      </header>

      <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="Total monitors"
          value={String(metrics.total)}
          Icon={Globe2}
          accentClassName="bg-[#3b82f6]/10 text-[#3b82f6]"
        />
        <DashboardMetricCard
          title="Active"
          value={String(metrics.active)}
          Icon={CircleCheckBig}
          accentClassName="bg-[#22c55e]/15 text-[#16a34a]"
        />
        <DashboardMetricCard
          title="Down now"
          value={String(metrics.down)}
          Icon={TriangleAlert}
          accentClassName="bg-[#ef4444]/12 text-[#ef4444]"
        />
        <DashboardMetricCard
          title="Pending check"
          value={String(metrics.pendingCheck)}
          Icon={Clock}
          accentClassName="bg-orange-400/20 text-orange-700"
        />
      </section>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 shadow-sm sm:max-w-xl">
            <Search className="size-5 shrink-0 text-[#015AFD]" aria-hidden />
            <input
              className="min-w-0 flex-1 border-none bg-transparent text-[0.75rem] text-gray-700 outline-none placeholder:text-gray-400"
              placeholder="Search URL, email, or ads account..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search ? (
              <button
                type="button"
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="check-status-filter">
              Filter by check status
            </label>
            <select
              id="check-status-filter"
              className={SELECT_CLASS}
              value={checkFilter}
              onChange={(e) => {
                setCheckFilter(e.target.value as CheckFilter);
                setPage(1);
              }}
            >
              <option value="all">All check statuses</option>
              <option value="up">Up</option>
              <option value="down">Down</option>
              <option value="degraded">Degraded</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-[#e5e5e5] bg-white p-8 text-center text-sm text-gray-500">
            Loading monitors...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-[#e5e5e5] bg-white p-10 text-center">
            <Activity className="mx-auto mb-3 size-8 text-slate-300" aria-hidden />
            <p className="text-sm font-medium text-slate-800">No monitors found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try another search, or wait for the backend sync to create monitors.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {pagedRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="w-full rounded-2xl border border-[#e5e5e5] bg-white p-4 text-left shadow-sm transition hover:bg-slate-50/80"
                  onClick={() => openDetail(row)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {row.hostname || row.url}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-slate-500">
                        {row.adminEmail || "—"}
                      </p>
                    </div>
                    <CheckStatusBadge status={row.lastCheckStatus} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-600">
                    <LifecycleBadge status={row.status} />
                    <span>
                      HTTP {row.lastHttpCode ?? "—"}
                      {row.lastResponseMs != null ? ` · ${row.lastResponseMs} ms` : ""}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Last checked {formatDateTime(row.lastCheckedAt)}
                  </p>
                </button>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full text-[0.75rem]">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-4 py-4 text-left font-semibold text-gray-700">
                        Landing page
                      </th>
                      <th className="px-4 py-4 text-left font-semibold text-gray-700">
                        Check
                      </th>
                      <th className="px-4 py-4 text-left font-semibold text-gray-700">
                        HTTP / latency
                      </th>
                      <th className="px-4 py-4 text-left font-semibold text-gray-700">
                        Lifecycle
                      </th>
                      <th className="px-4 py-4 text-left font-semibold text-gray-700">
                        Last checked
                      </th>
                      <th className="px-4 py-4 text-center font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedRows.map((row) => (
                      <tr
                        key={row.id}
                        className="cursor-pointer hover:bg-gray-50/70"
                        onClick={() => openDetail(row)}
                      >
                        <td className="px-4 py-4">
                          <p className="max-w-[260px] truncate font-semibold text-gray-900">
                            {row.hostname || row.url}
                          </p>
                          <p className="max-w-[260px] truncate text-[12px] text-gray-500">
                            {row.adminEmail || row.url}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <CheckStatusBadge status={row.lastCheckStatus} />
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {row.lastHttpCode ?? "—"}
                          {row.lastResponseMs != null
                            ? ` · ${row.lastResponseMs} ms`
                            : ""}
                        </td>
                        <td className="px-4 py-4">
                          <LifecycleBadge status={row.status} />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                          {formatDateTime(row.lastCheckedAt)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="View monitor"
                              onClick={(event) => {
                                event.stopPropagation();
                                openDetail(row);
                              }}
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Recheck now"
                              disabled={
                                row.status !== "active" || recheckingId === row.id
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleRecheck(row);
                              }}
                            >
                              {recheckingId === row.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <RefreshCw className="size-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {sliceStart + 1} to {sliceEnd} of {filtered.length} monitors
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span>{`Page ${safePage} / ${totalPages}`}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile pagination */}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[#e5e5e5] bg-white px-3 py-3 text-xs text-gray-600 md:hidden">
              <span>
                {sliceStart + 1}–{sliceEnd} of {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent
          side="right"
          showCloseButton
          className="flex w-full flex-col gap-0 border-slate-200 bg-white p-0 sm:max-w-xl"
        >
          {selected ? (
            <div className="flex h-full min-h-0 flex-col">
              <SheetHeader className="border-b border-slate-100 bg-white px-5 py-5 text-start shadow-sm sm:px-6">
                <div className="flex items-start justify-between gap-3 pe-8">
                  <div className="min-w-0 space-y-2">
                    <SheetTitle className="truncate text-lg text-slate-900">
                      {selected.hostname || selected.url}
                    </SheetTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <CheckStatusBadge status={selected.lastCheckStatus} />
                      <LifecycleBadge status={selected.status} />
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Probe
                  </p>
                  <div className="space-y-3">
                    <DetailRow label="URL" value={selected.url || "—"} />
                    <DetailRow
                      label="HTTP"
                      value={selected.lastHttpCode ?? "—"}
                    />
                    <DetailRow
                      label="Latency"
                      value={
                        selected.lastResponseMs != null
                          ? `${selected.lastResponseMs} ms`
                          : "—"
                      }
                    />
                    <DetailRow
                      label="Last checked"
                      value={formatDateTime(selected.lastCheckedAt)}
                    />
                    <DetailRow
                      label="Error"
                      value={selected.lastErrorMessage || "—"}
                    />
                    <DetailRow
                      label="Frequency"
                      value={formatFrequency(selected.checkFrequencySeconds)}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Account
                  </p>
                  <div className="space-y-3">
                    <DetailRow
                      label="Admin"
                      value={selected.adminEmail || "—"}
                    />
                    <DetailRow
                      label="Ads account"
                      value={selected.adsAccountId || "—"}
                    />
                    <DetailRow
                      label="Monitor key"
                      value={
                        <span className="font-mono text-[11px]">
                          {selected.monitorKey}
                        </span>
                      }
                    />
                    <DetailRow
                      label="Last synced"
                      value={formatDateTime(selected.lastSyncedAt)}
                    />
                    <DetailRow
                      label="Updated"
                      value={formatDateTime(selected.updatedAt)}
                    />
                  </div>
                </div>

                <p className="text-[12px] leading-relaxed text-slate-500">
                  Pause/resume is not available yet (backend API pending). Alerts use{" "}
                  <span className="font-medium text-slate-700">
                    LandingPageReturnError
                  </span>
                  .
                </p>
              </div>

              <div className="sticky bottom-0 flex flex-col gap-2 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:px-6">
                <Button
                  type="button"
                  className="gap-2 rounded-xl bg-[#015AFD] hover:bg-[#0147d9]"
                  disabled={
                    selected.status !== "active" || recheckingId === selected.id
                  }
                  onClick={() => void handleRecheck(selected)}
                >
                  {recheckingId === selected.id ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <RefreshCw className="size-4" aria-hidden />
                  )}
                  Recheck now
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  asChild
                >
                  <Link href="/administrator/alerts">View alerts</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
