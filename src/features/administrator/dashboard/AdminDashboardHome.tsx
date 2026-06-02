"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Receipt,
  UserCheck2,
  UserMinus2,
  UserRoundPlus,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
    totalRevenue: DashboardKpiDto;
    paidInvoices: DashboardKpiDto;
    activeSubscribers: DashboardKpiDto;
    usersOnFreeTrial: DashboardKpiDto;
    expiredTrialUsers: DashboardKpiDto;
    failedPayments: DashboardKpiDto;
  };
  revenue: {
    total: number;
    displayTotal: string;
    trendLabel: string;
    trendPositive: boolean;
    paidInvoices: number;
    averageInvoiceValue: number;
    displayAverageInvoiceValue: string;
    collectionRatePct: number;
    bestMonthRevenue: number;
    displayBestMonthRevenue: string;
    chart: Array<{ label: string; value: number; invoiceCount: number }>;
  };
  invoices: {
    totalPaidCount: number;
    displayTotalPaidAmount: string;
    recent: Array<{
      id: string;
      customerName: string;
      displayAmount: string;
      status: string;
      date: string;
    }>;
  };
  subscribers: {
    total: number;
    active: number;
    trial: number;
    canceled: number;
    pastDue: number;
    rows: Array<{
      id: string;
      name: string;
      email: string;
      subscriptionPlan: string;
      paymentStatus: string;
      lastLogin: string;
      joinDate: string;
      accountStatus: string;
    }>;
  };
  trialUsers: {
    total: number;
    rows: Array<{
      id: string;
      name: string;
      email: string;
      trialStartDate: string;
      daysRemaining: number;
      conversionStatus: string;
    }>;
  };
  expiredTrialUsers: {
    total: number;
    rows: Array<{
      id: string;
      name: string;
      email: string;
      trialExpirationDate: string;
      daysSinceExpiration: number;
      reengagementStatus: string;
    }>;
  };
  failedPayments: {
    total: number;
    rows: Array<{
      id: string;
      customerName: string;
      email: string;
      failedPaymentDate: string;
      displayAmount: string;
      failureReason: string;
      retryStatus: string;
    }>;
  };
}

function DashboardMetricCard({
  title,
  value,
  icon,
  accentClassName,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  accentClassName?: string;
}) {
  return (
    <Card className="flex min-h-[112px] justify-center gap-0 rounded-lg border border-slate-200 bg-white py-0 shadow-sm">
      <CardContent className="flex flex-1 items-center justify-between gap-3 px-4 py-4">
        <div className="min-w-0 space-y-0.5">
          <p className="text-muted-foreground text-xs font-medium">{title}</p>
          <p className="truncate text-[30px] leading-none font-semibold tracking-tight text-slate-900">{value}</p>
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full text-[#3b82f6]",
            accentClassName ?? "bg-[#3b82f6]/10",
          )}
        >
          {icon}
        </span>
      </CardContent>
    </Card>
  );
}

function SectionShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Card className="h-full rounded-2xl border border-slate-200/90 bg-white py-0 shadow-md">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
        <div>
          <p className="text-lg font-semibold text-slate-900">{title}</p>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
      </CardHeader>
      <CardContent className="px-6 pt-3 pb-6">{children}</CardContent>
    </Card>
  );
}

function EmptyStateMessage() {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-600">
      No data available for the selected period.
    </div>
  );
}

function statusBadgeClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes("active") || normalized.includes("paid") || normalized.includes("resolved") || normalized.includes("recovered")) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (normalized.includes("trial") || normalized.includes("pending")) {
    return "bg-violet-100 text-violet-700";
  }
  if (normalized.includes("past due") || normalized.includes("retry")) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-rose-100 text-rose-700";
}

function compactCurrency(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
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

  const chartData = useMemo(() => data?.revenue.chart ?? [], [data]);

  const chartMax = useMemo(() => {
    const max = Math.max(...chartData.map((point) => point.value), 0);
    return Math.max(max * 1.2, 10);
  }, [chartData]);

  const revenueInsights = useMemo(() => {
    if (!chartData.length) {
      return {
        highestLabel: "—",
        highestValue: "$0",
        lowestLabel: "—",
        lowestValue: "$0",
        trendLabel: "Flat",
      };
    }
    const highest = chartData.reduce((best, current) =>
      current.value > best.value ? current : best,
    );
    const nonZero = chartData.filter((point) => point.value > 0);
    const lowestPool = nonZero.length ? nonZero : chartData;
    const lowest = lowestPool.reduce((best, current) =>
      current.value < best.value ? current : best,
    );
    const first = chartData[0]?.value ?? 0;
    const last = chartData[chartData.length - 1]?.value ?? 0;
    const trendLabel = last > first ? "Up" : last < first ? "Down" : "Flat";
    return {
      highestLabel: highest.label,
      highestValue: compactCurrency(highest.value),
      lowestLabel: lowest.label,
      lowestValue: compactCurrency(lowest.value),
      trendLabel,
    };
  }, [chartData]);

  const metricCards = [
    {
      title: "Total Revenue",
      value: isLoading ? "—" : (data?.kpis.totalRevenue.displayValue ?? "$0"),
      trend: isLoading ? "Loading..." : (data?.kpis.totalRevenue.trendLabel ?? "—"),
      trendPositive: data?.kpis.totalRevenue.trendPositive ?? true,
      icon: <CircleDollarSign className="size-6" />,
      accentClassName: "bg-emerald-500/12 text-emerald-600",
    },
    {
      title: "Paid Invoices",
      value: isLoading ? "—" : (data?.kpis.paidInvoices.displayValue ?? "0"),
      trend: isLoading ? "Loading..." : (data?.kpis.paidInvoices.trendLabel ?? "—"),
      trendPositive: data?.kpis.paidInvoices.trendPositive ?? true,
      icon: <Receipt className="size-6" />,
      accentClassName: "bg-[#3b82f6]/12 text-[#2563eb]",
    },
    {
      title: "Active Subscribers",
      value: isLoading ? "—" : (data?.kpis.activeSubscribers.displayValue ?? "0"),
      trend: isLoading ? "Loading..." : (data?.kpis.activeSubscribers.trendLabel ?? "—"),
      trendPositive: data?.kpis.activeSubscribers.trendPositive ?? true,
      icon: <UserCheck2 className="size-6" />,
      accentClassName: "bg-[#22c55e]/12 text-[#16a34a]",
    },
    {
      title: "Users on Free Trial",
      value: isLoading ? "—" : (data?.kpis.usersOnFreeTrial.displayValue ?? "0"),
      trend: isLoading ? "Loading..." : (data?.kpis.usersOnFreeTrial.trendLabel ?? "—"),
      trendPositive: data?.kpis.usersOnFreeTrial.trendPositive ?? true,
      icon: <UserRoundPlus className="size-6" />,
      accentClassName: "bg-violet-500/12 text-violet-600",
    },
    {
      title: "Expired Trial Users",
      value: isLoading ? "—" : (data?.kpis.expiredTrialUsers.displayValue ?? "0"),
      trend: isLoading ? "Loading..." : (data?.kpis.expiredTrialUsers.trendLabel ?? "—"),
      trendPositive: data?.kpis.expiredTrialUsers.trendPositive ?? false,
      icon: <UserMinus2 className="size-6" />,
      accentClassName: "bg-amber-500/12 text-amber-600",
    },
    {
      title: "Failed Payments",
      value: isLoading ? "—" : (data?.kpis.failedPayments.displayValue ?? "0"),
      trend: isLoading ? "Loading..." : (data?.kpis.failedPayments.trendLabel ?? "—"),
      trendPositive: data?.kpis.failedPayments.trendPositive ?? false,
      icon: <AlertTriangle className="size-6" />,
      accentClassName: "bg-rose-500/12 text-rose-600",
    },
  ];

  return (
    <div className="flex min-h-full flex-col bg-[#f8fafc]">
      <div className="mx-auto w-full max-w-[1480px] flex-1 space-y-6 px-4 py-6 pb-12 sm:px-6 lg:px-10">
        <section className="space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-3 pb-2">
            <div className="space-y-1">
              <h1 className="text-[28px] font-bold tracking-tight text-slate-900 sm:text-[32px]">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground max-w-xl text-[13px]">
                Executive overview of revenue, billing health, subscribers, and trial funnel
              </p>
            </div>
            <AdminDashboardDateRangePicker value={range} onChange={setRange} />
          </header>

          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {metricCards.map((metric) => (
              <DashboardMetricCard
                key={metric.title}
                title={metric.title}
                value={metric.value}
                icon={metric.icon}
                accentClassName={metric.accentClassName}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionShell title="Revenue & Invoices" subtitle="Revenue summary and paid invoice performance">
            <div className="space-y-4">
              <div className="h-[340px] w-full rounded-xl border border-slate-200 bg-white p-3">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    Loading chart...
                  </div>
                ) : chartData.every((point) => point.value <= 0) ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
                    <div className="rounded-full bg-slate-100 p-3 text-xl">📉</div>
                    <p className="text-sm font-medium">No revenue data available for the selected period.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ left: 0, right: 10, top: 12, bottom: 2 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        stroke="#cbd5f5"
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(value: number) => compactCurrency(value)}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                        domain={[0, chartMax]}
                      />
                      <RechartsTooltip
                        cursor={{ fill: "rgba(59,130,246,0.06)" }}
                        contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                        labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                        formatter={(value, _name, item) => [
                          `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value ?? 0))} (${(item?.payload as { invoiceCount?: number })?.invoiceCount ?? 0} invoices)`,
                          "Revenue",
                        ]}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#3b82f6" maxBarSize={56}>
                        <LabelList
                          dataKey="value"
                          position="top"
                          formatter={(value) => (Number(value ?? 0) > 0 ? compactCurrency(Number(value ?? 0)) : "")}
                          style={{ fill: "#475569", fontSize: 10, fontWeight: 600 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              {data?.invoices.recent?.length ? (
                <div className="mt-2 rounded-xl border border-slate-200">
                  <table className="w-full table-fixed text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="w-[45%] px-4 py-2.5 font-semibold">Invoice / Customer</th>
                        <th className="w-[18%] px-4 py-2.5 font-semibold">Amount</th>
                        <th className="w-[17%] px-4 py-2.5 font-semibold">Status</th>
                        <th className="w-[20%] px-4 py-2.5 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.invoices.recent.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-2.5">
                            <p className="truncate font-mono text-xs text-slate-700">{row.id}</p>
                            <p className="truncate text-slate-800">{row.customerName}</p>
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-slate-900">{row.displayAmount}</td>
                          <td className="px-4 py-2.5">
                            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", statusBadgeClass(row.status))}>
                              {row.status}
                            </span>
                          </td>
                          <td className="truncate px-4 py-2.5 text-slate-700">{row.date.split(",")[0]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : !isLoading ? (
                <div className="mt-2">
                  <EmptyStateMessage />
                </div>
              ) : null}
            </div>
          </SectionShell>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SectionShell title="Subscribers Overview" subtitle="Plan, payment, and account health">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Total</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{data?.subscribers.total ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Active</p>
                <p className="mt-1 text-lg font-semibold text-emerald-600">{data?.subscribers.active ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Trial</p>
                <p className="mt-1 text-lg font-semibold text-violet-600">{data?.subscribers.trial ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Past Due</p>
                <p className="mt-1 text-lg font-semibold text-rose-600">{data?.subscribers.pastDue ?? 0}</p>
              </div>
            </div>
            {(data?.subscribers.rows?.length ?? 0) > 0 ? (
              <div className="mt-4 rounded-xl border border-slate-200">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="w-[45%] px-4 py-2.5 font-semibold">Name / Email</th>
                      <th className="w-[30%] px-4 py-2.5 font-semibold">Plan</th>
                      <th className="w-[25%] px-4 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.subscribers.rows ?? []).map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-2.5">
                          <p className="truncate font-medium text-slate-900">{row.name}</p>
                          <p className="truncate text-xs text-slate-500">{row.email}</p>
                        </td>
                        <td className="truncate px-4 py-2.5 text-slate-700">{row.subscriptionPlan}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", statusBadgeClass(row.accountStatus))}>
                            {row.accountStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : !isLoading ? (
              <div className="mt-4">
                <EmptyStateMessage />
              </div>
            ) : null}
          </SectionShell>

          <SectionShell title="Failed Payments" subtitle="Payment failures and retry status">
            <div className="mb-3 flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <span>Total failed payments in range</span>
              <span className="font-semibold">{data?.failedPayments.total ?? 0}</span>
            </div>
            {(data?.failedPayments.rows?.length ?? 0) > 0 ? (
              <div className="rounded-xl border border-slate-200">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="w-[32%] px-4 py-2.5 font-semibold">Name / Email</th>
                      <th className="w-[18%] px-4 py-2.5 font-semibold">Failed On</th>
                      <th className="w-[12%] px-4 py-2.5 font-semibold">Amount</th>
                      <th className="w-[23%] px-4 py-2.5 font-semibold">Reason</th>
                      <th className="w-[15%] px-4 py-2.5 font-semibold">Retry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.failedPayments.rows ?? []).map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-2.5">
                          <p className="truncate font-medium text-slate-900">{row.customerName}</p>
                          <p className="truncate text-xs text-slate-500">{row.email}</p>
                        </td>
                        <td className="truncate px-4 py-2.5 text-slate-700">{row.failedPaymentDate}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{row.displayAmount}</td>
                        <td className="truncate px-4 py-2.5 text-slate-700">{row.failureReason}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", statusBadgeClass(row.retryStatus))}>
                            {row.retryStatus === "Recovered" ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <CreditCard className="size-3.5 text-rose-500" />}
                            {row.retryStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : !isLoading ? (
              <EmptyStateMessage />
            ) : null}
          </SectionShell>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SectionShell title="Free Trial Users" subtitle="Users currently in trial period">
            <div className="mb-3 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-700">
              Total users currently on trial: <span className="font-semibold">{data?.trialUsers.total ?? 0}</span>
            </div>
            {(data?.trialUsers.rows?.length ?? 0) > 0 ? (
              <div className="rounded-xl border border-slate-200">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="w-[45%] px-4 py-2.5 font-semibold">Name / Email</th>
                      <th className="w-[22%] px-4 py-2.5 font-semibold">Trial Start</th>
                      <th className="w-[13%] px-4 py-2.5 font-semibold">Days Left</th>
                      <th className="w-[20%] px-4 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.trialUsers.rows ?? []).map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-2.5">
                          <p className="truncate font-medium text-slate-900">{row.name}</p>
                          <p className="truncate text-xs text-slate-500">{row.email}</p>
                        </td>
                        <td className="truncate px-4 py-2.5 text-slate-700">{row.trialStartDate}</td>
                        <td className="px-4 py-2.5 text-slate-700">{row.daysRemaining}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", statusBadgeClass(row.conversionStatus))}>
                            {row.conversionStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : !isLoading ? (
              <EmptyStateMessage />
            ) : null}
          </SectionShell>

          <SectionShell title="Expired Trial Users" subtitle="Users requiring re-engagement">
            <div className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Expired trials in range: <span className="font-semibold">{data?.expiredTrialUsers.total ?? 0}</span>
            </div>
            {(data?.expiredTrialUsers.rows?.length ?? 0) > 0 ? (
              <div className="rounded-xl border border-slate-200">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="w-[42%] px-4 py-2.5 font-semibold">Name / Email</th>
                      <th className="w-[22%] px-4 py-2.5 font-semibold">Expired On</th>
                      <th className="w-[14%] px-4 py-2.5 font-semibold">Days</th>
                      <th className="w-[22%] px-4 py-2.5 font-semibold">Re-engagement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.expiredTrialUsers.rows ?? []).map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-2.5">
                          <p className="truncate font-medium text-slate-900">{row.name}</p>
                          <p className="truncate text-xs text-slate-500">{row.email}</p>
                        </td>
                        <td className="truncate px-4 py-2.5 text-slate-700">{row.trialExpirationDate}</td>
                        <td className="px-4 py-2.5 text-slate-700">{row.daysSinceExpiration}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", statusBadgeClass(row.reengagementStatus))}>
                            {row.reengagementStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : !isLoading ? (
              <EmptyStateMessage />
            ) : null}
          </SectionShell>
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
