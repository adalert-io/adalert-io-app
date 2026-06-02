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
  Area,
  AreaChart,
  CartesianGrid,
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
    chart: Array<{ label: string; value: number }>;
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
    <Card className="rounded-2xl border border-slate-200/90 bg-white py-0 shadow-md">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
        <div>
          <p className="text-lg font-semibold text-slate-900">{title}</p>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
      </CardHeader>
      <CardContent className="px-6 py-6">{children}</CardContent>
    </Card>
  );
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
      <div className="mx-auto w-full max-w-[1480px] flex-1 space-y-8 px-4 py-8 pb-16 sm:px-6 lg:px-10">
        <section className="space-y-6">
          <header className="flex flex-wrap items-start justify-between gap-4 pb-6">
            <div className="space-y-2">
              <h1 className="text-[28px] font-bold tracking-tight text-slate-900 sm:text-[32px]">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground max-w-xl text-[15px]">
                Executive overview of revenue, billing health, subscribers, and trial funnel
              </p>
            </div>
            <AdminDashboardDateRangePicker className="-mt-1" value={range} onChange={setRange} />
          </header>

          <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {metricCards.map((metric) => (
              <DashboardMetricCard
                key={metric.title}
                title={metric.title}
                value={metric.value}
                trend={metric.trend}
                trendPositive={metric.trendPositive}
                icon={metric.icon}
                accentClassName={metric.accentClassName}
              />
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_minmax(0,0.9fr)] xl:gap-8">
          <SectionShell title="Revenue & Invoices" subtitle="Revenue summary and paid invoice performance">
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-50 pb-4">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Revenue in selected date range</p>
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
              <div className="rounded-xl bg-slate-50/70 p-3 text-sm text-slate-600">
                {isLoading
                  ? "Loading paid invoices..."
                  : `${data?.invoices.totalPaidCount ?? 0} paid invoices · ${data?.invoices.displayTotalPaidAmount ?? "$0"}`}
              </div>
              <div className="mt-4 h-[280px] w-full">
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
              {data?.invoices.recent?.length ? (
                <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-[620px] w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Invoice ID</th>
                        <th className="px-4 py-2.5 font-semibold">Customer Name</th>
                        <th className="px-4 py-2.5 font-semibold">Amount</th>
                        <th className="px-4 py-2.5 font-semibold">Status</th>
                        <th className="px-4 py-2.5 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.invoices.recent.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{row.id}</td>
                          <td className="px-4 py-2.5 text-slate-800">{row.customerName}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-900">{row.displayAmount}</td>
                          <td className="px-4 py-2.5 text-slate-700">{row.status}</td>
                          <td className="px-4 py-2.5 text-slate-700">{row.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </SectionShell>

          <SectionShell title="Subscribers Overview" subtitle="Plan, payment, and account health">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Total</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{data?.subscribers.total ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Active</p>
                <p className="mt-1 text-xl font-bold text-emerald-600">{data?.subscribers.active ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Trial</p>
                <p className="mt-1 text-xl font-bold text-violet-600">{data?.subscribers.trial ?? 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Past Due</p>
                <p className="mt-1 text-xl font-bold text-rose-600">{data?.subscribers.pastDue ?? 0}</p>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Name</th>
                    <th className="px-4 py-2.5 font-semibold">Email</th>
                    <th className="px-4 py-2.5 font-semibold">Subscription Plan</th>
                    <th className="px-4 py-2.5 font-semibold">Payment Status</th>
                    <th className="px-4 py-2.5 font-semibold">Last Login</th>
                    <th className="px-4 py-2.5 font-semibold">Join Date</th>
                    <th className="px-4 py-2.5 font-semibold">Account Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.subscribers.rows ?? []).map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{row.name}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.email}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.subscriptionPlan}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.paymentStatus}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.lastLogin}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.joinDate}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.accountStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionShell>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionShell title="Free Trial Users" subtitle="Users currently in trial period">
            <div className="mb-3 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-700">
              Total users currently on trial: <span className="font-semibold">{data?.trialUsers.total ?? 0}</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[700px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Name</th>
                    <th className="px-4 py-2.5 font-semibold">Email</th>
                    <th className="px-4 py-2.5 font-semibold">Trial Start Date</th>
                    <th className="px-4 py-2.5 font-semibold">Days Remaining</th>
                    <th className="px-4 py-2.5 font-semibold">Conversion Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.trialUsers.rows ?? []).map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{row.name}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.email}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.trialStartDate}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.daysRemaining}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.conversionStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionShell>

          <SectionShell title="Expired Trial Users" subtitle="Users requiring re-engagement">
            <div className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Expired trials in range: <span className="font-semibold">{data?.expiredTrialUsers.total ?? 0}</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Name</th>
                    <th className="px-4 py-2.5 font-semibold">Email</th>
                    <th className="px-4 py-2.5 font-semibold">Trial Expiration Date</th>
                    <th className="px-4 py-2.5 font-semibold">Days Since Expiration</th>
                    <th className="px-4 py-2.5 font-semibold">Re-engagement Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.expiredTrialUsers.rows ?? []).map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{row.name}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.email}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.trialExpirationDate}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.daysSinceExpiration}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.reengagementStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionShell>
        </section>

        <section>
          <SectionShell title="Failed Payments" subtitle="Payment failures and retry status">
            <div className="mb-3 flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <span>Total failed payments in range</span>
              <span className="font-semibold">{data?.failedPayments.total ?? 0}</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Customer Name</th>
                    <th className="px-4 py-2.5 font-semibold">Email</th>
                    <th className="px-4 py-2.5 font-semibold">Failed Payment Date</th>
                    <th className="px-4 py-2.5 font-semibold">Amount</th>
                    <th className="px-4 py-2.5 font-semibold">Failure Reason</th>
                    <th className="px-4 py-2.5 font-semibold">Retry Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.failedPayments.rows ?? []).map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{row.customerName}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.email}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.failedPaymentDate}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{row.displayAmount}</td>
                      <td className="px-4 py-2.5 text-slate-700">{row.failureReason}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {row.retryStatus === "Recovered" ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <CreditCard className="size-3.5 text-rose-500" />}
                          {row.retryStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
