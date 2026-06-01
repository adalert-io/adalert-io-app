"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Bell, DollarSign, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GoogleAdsMark } from "@/components/GoogleAdsMark";
import { cn } from "@/lib/utils";

import {
  AdminDashboardDateRangePicker,
  defaultAdminDashboardRange,
} from "./AdminDashboardDateRangePicker";

interface DashboardKpiDto {
  value: number;
  displayValue: string;
  trendLabel: string;
  trendPositive: boolean;
}

interface DashboardOverviewDto {
  kpis: {
    totalCustomers: DashboardKpiDto;
    activeAdAccounts: DashboardKpiDto;
    monthlyRecurringRevenue: DashboardKpiDto;
    openAlerts: DashboardKpiDto;
  };
  revenue: {
    total: number;
    displayTotal: string;
    trendLabel: string;
    trendPositive: boolean;
    chart: Array<{ label: string; value: number }>;
  };
  recentAlerts: Array<{
    id: string;
    company: string;
    message: string;
    date: string;
    tone: "red" | "amber" | "yellow";
  }>;
}

function DashboardMetricCard({
  title,
  value,
  trend,
  trendPositive,
  icon,
  accentClassName,
}: {
  title: string;
  value: string;
  trend: string;
  trendPositive: boolean;
  icon: ReactNode;
  accentClassName?: string;
}) {
  return (
    <Card className="flex min-h-[140px] justify-center gap-0 rounded-xl border border-slate-200 bg-white py-0 shadow-sm">
      <CardContent className="flex flex-1 items-center justify-between gap-4 px-6 py-6">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="truncate text-[28px] font-bold tracking-tight text-slate-900">{value}</p>
          <p
            className={cn(
              "text-sm font-medium",
              trendPositive ? "text-[#22c55e]" : "text-[#ef4444]",
            )}
          >
            {trend}
          </p>
        </div>
        <span
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-full text-[#3b82f6]",
            accentClassName ?? "bg-[#3b82f6]/10",
          )}
        >
          {icon}
        </span>
      </CardContent>
    </Card>
  );
}

function alertDotVariant(tone: "red" | "amber" | "yellow"): string {
  if (tone === "red") return "bg-[#ef4444]";
  if (tone === "amber") return "bg-[#f97316]";
  return "bg-amber-400";
}

function rangeToQuery(range: DateRange | undefined): string {
  if (!range?.from || !range?.to) return "";
  const from = format(range.from, "yyyy-MM-dd");
  const to = format(range.to, "yyyy-MM-dd");
  return `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}

export function AdminDashboardHome() {
  const [range, setRange] = useState<DateRange | undefined>(defaultAdminDashboardRange);
  const [data, setData] = useState<DashboardOverviewDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async (activeRange: DateRange | undefined) => {
    setIsLoading(true);
    try {
      const query = rangeToQuery(activeRange);
      const response = await fetch(`/api/admin/dashboard?${query}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as DashboardOverviewDto & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load dashboard");
      }
      setData(payload);
    } catch (error) {
      console.error("Failed to load admin dashboard:", error);
      setData(null);
      toast.error("Couldn't load dashboard data", {
        description: "Check your connection and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(range);
  }, [loadDashboard, range]);

  const chartData = useMemo(
    () => (data?.revenue.chart ?? []).map((point) => ({ label: point.label, v: point.value })),
    [data],
  );

  const chartMax = useMemo(() => {
    const max = Math.max(...chartData.map((point) => point.v), 0);
    return Math.max(max * 1.15, 100);
  }, [chartData]);

  return (
    <div className="flex min-h-full flex-col bg-[#f8fafc]">
      <div className="mx-auto w-full max-w-[1480px] flex-1 space-y-8 px-4 py-8 pb-16 sm:px-6 lg:px-10">
        <section className="space-y-6">
          <header className="flex flex-wrap items-start justify-between gap-4 pb-6">
            <div className="space-y-2">
              <h1 className="text-[28px] font-bold tracking-tight text-slate-900 sm:text-[32px]">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground max-w-xl text-[15px]">
                Live metrics from customers, ad accounts, subscriptions, and alerts
              </p>
            </div>
            <AdminDashboardDateRangePicker className="-mt-1" value={range} onChange={setRange} />
          </header>

          <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <DashboardMetricCard
              title="Total Customers"
              value={isLoading ? "—" : (data?.kpis.totalCustomers.displayValue ?? "0")}
              trend={
                isLoading ? "Loading..." : (data?.kpis.totalCustomers.trendLabel ?? "—")
              }
              trendPositive={data?.kpis.totalCustomers.trendPositive ?? true}
              icon={<Users className="size-6" />}
              accentClassName="bg-[#3b82f6]/10"
            />
            <DashboardMetricCard
              title="Active Ad Accounts"
              value={isLoading ? "—" : (data?.kpis.activeAdAccounts.displayValue ?? "0")}
              trend={
                isLoading ? "Loading..." : (data?.kpis.activeAdAccounts.trendLabel ?? "—")
              }
              trendPositive={data?.kpis.activeAdAccounts.trendPositive ?? true}
              icon={<GoogleAdsMark />}
              accentClassName="bg-[#3b82f6]/15"
            />
            <DashboardMetricCard
              title="Monthly Recurring Revenue"
              value={
                isLoading ? "—" : (data?.kpis.monthlyRecurringRevenue.displayValue ?? "$0")
              }
              trend={
                isLoading
                  ? "Loading..."
                  : (data?.kpis.monthlyRecurringRevenue.trendLabel ?? "—")
              }
              trendPositive={data?.kpis.monthlyRecurringRevenue.trendPositive ?? true}
              icon={<DollarSign className="size-6" />}
              accentClassName="bg-[#22c55e]/12 text-[#16a34a]"
            />
            <DashboardMetricCard
              title="Open Alerts"
              value={isLoading ? "—" : (data?.kpis.openAlerts.displayValue ?? "0")}
              trend={isLoading ? "Loading..." : (data?.kpis.openAlerts.trendLabel ?? "—")}
              trendPositive={data?.kpis.openAlerts.trendPositive ?? true}
              icon={<Bell className="size-6" />}
              accentClassName="bg-[#ef4444]/10 text-[#ef4444]"
            />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_minmax(0,0.95fr)] xl:gap-8">
          <Card className="rounded-2xl border border-slate-200/90 bg-white py-0 shadow-md">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <p className="text-lg font-semibold text-slate-900">Revenue Overview</p>
              <span className="text-muted-foreground text-sm font-medium">Stripe charges</span>
            </CardHeader>
            <CardContent className="space-y-3 px-6 pt-6 pb-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-50 pb-4">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Revenue in range</p>
                  <p className="text-[34px] font-bold tracking-tight text-slate-900">
                    {isLoading ? "—" : (data?.revenue.displayTotal ?? "$0")}
                  </p>
                </div>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    data?.revenue.trendPositive ? "text-[#22c55e]" : "text-[#ef4444]",
                  )}
                >
                  {isLoading ? "" : (data?.revenue.trendLabel ?? "")}
                </p>
              </div>
              <div className="mt-6 h-[300px] w-full">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    Loading chart...
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    No revenue in this date range
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ left: -10, top: 6, bottom: 0, right: 8 }}
                    >
                      <defs>
                        <linearGradient id="dashRevenueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        stroke="#cbd5f5"
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v: number) =>
                          v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
                        }
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                        domain={[0, chartMax]}
                      />
                      <RechartsTooltip
                        cursor={{ stroke: "#e2e8f0", strokeDasharray: "4 4" }}
                        contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                        labelStyle={{ color: "#475569", fontWeight: 600 }}
                        formatter={(value) => [
                          `$${Number(value ?? 0).toLocaleString()}`,
                          "Revenue",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#dashRevenueFill)"
                        dot={{ r: 3, strokeWidth: 2, fill: "#fff", stroke: "#3b82f6" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-slate-200/90 bg-white py-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <p className="text-lg font-semibold text-slate-900">Recent Alerts</p>
              <Button variant="ghost" size="sm" className="text-[#015AFD]" asChild>
                <a href="/administrator/alerts">View all</a>
              </Button>
            </CardHeader>
            <CardContent className="max-h-[420px] space-y-0 divide-y divide-slate-100 overflow-auto px-0 py-0">
              {isLoading ? (
                <p className="px-6 py-10 text-center text-sm text-slate-500">Loading alerts...</p>
              ) : !data?.recentAlerts.length ? (
                <p className="px-6 py-10 text-center text-sm text-slate-500">
                  No open alerts to show
                </p>
              ) : (
                data.recentAlerts.map((alertRow) => (
                  <article key={alertRow.id} className="flex gap-4 px-6 py-4">
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        alertDotVariant(alertRow.tone),
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{alertRow.company}</p>
                      <p className="text-muted-foreground mt-1 text-[13px] leading-snug">
                        {alertRow.message}
                      </p>
                      <p className="text-muted-foreground mt-2 text-xs">{alertRow.date}</p>
                    </div>
                  </article>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <footer className="border-t border-slate-200/90 bg-[#f8fafc] py-6 text-center">
        <p className="text-muted-foreground text-sm">
          © {new Date().getFullYear()} adAlert.io. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
