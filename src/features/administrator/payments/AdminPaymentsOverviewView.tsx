"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CircleCheckBig,
  Clock,
  ChevronDown,
  DollarSign,
  Download,
  Filter,
  LayoutGrid,
  List,
  RotateCw,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { AdminDashboardDateRangePicker } from "../dashboard/AdminDashboardDateRangePicker";

const REVENUE_TREND_DATA = [
  { label: "May 9", value: 3100 },
  { label: "May 10", value: 3600 },
  { label: "May 11", value: 3300 },
  { label: "May 12", value: 4500 },
  { label: "May 13", value: 5100 },
  { label: "May 14", value: 5450 },
  { label: "May 15", value: 5800 },
];

const BREAKDOWN_ROWS_RAW = [
  { key: "paid", name: "Paid", amount: 19850, fill: "#22c55e" },
  { key: "pending", name: "Pending", amount: 2640, fill: "#eab308" },
  { key: "pastDue", name: "Past Due", amount: 1860, fill: "#ef4444" },
  { key: "refunded", name: "Refunded", amount: 340, fill: "#3b82f6" },
] as const;

const BREAKDOWN_TOTAL = BREAKDOWN_ROWS_RAW.reduce((s, r) => s + r.amount, 0);

const BREAKDOWN_SEGMENTS = BREAKDOWN_ROWS_RAW.map((r) => ({
  ...r,
  percentLabel: `${((r.amount / BREAKDOWN_TOTAL) * 100).toFixed(1)}%`,
}));

const PLAN_MIX = [
  { name: "Professional", pct: 66.7, fill: "#3b82f6" },
  { name: "Starter", pct: 26.5, fill: "#64748b" },
  { name: "Trial", pct: 5.4, fill: "#eab308" },
  { name: "Other", pct: 1.4, fill: "#cbd5e1" },
] as const;

const INVOICES = [
  {
    id: "inv-1",
    number: "INV-2025-0892",
    customer: "Nexus AI Labs",
    date: "May 09, 2025",
    dueDate: "May 15, 2025",
    amount: 2845,
    status: "paid" as const,
  },
  {
    id: "inv-2",
    number: "INV-2025-0891",
    customer: "PixelForge Studios",
    date: "May 10, 2025",
    dueDate: "May 24, 2025",
    amount: 1995,
    status: "pending" as const,
  },
  {
    id: "inv-3",
    number: "INV-2025-0889",
    customer: "Lakeside Boutique",
    date: "May 06, 2025",
    dueDate: "May 06, 2025",
    amount: 860,
    status: "past_due" as const,
  },
  {
    id: "inv-4",
    number: "INV-2025-0887",
    customer: "Sunrise Catering Co.",
    date: "May 04, 2025",
    dueDate: "May 04, 2025",
    amount: 4320,
    status: "paid" as const,
  },
  {
    id: "inv-5",
    number: "INV-2025-0886",
    customer: "McGrath Kavinoky LLP",
    date: "May 03, 2025",
    dueDate: "May 18, 2025",
    amount: 5500,
    status: "pending" as const,
  },
];

const TRANSACTIONS = [
  {
    id: "txn-1",
    transactionId: "ch_9K2PmL8Qx4",
    customer: "Nexus AI Labs",
    date: "May 14, 2025",
    amount: 845.25,
    method: "visa" as const,
    status: "succeeded" as const,
  },
  {
    id: "txn-2",
    transactionId: "ch_9K2NfR3Ht1",
    customer: "PixelForge Studios",
    date: "May 14, 2025",
    amount: 199.95,
    method: "mastercard" as const,
    status: "succeeded" as const,
  },
  {
    id: "txn-3",
    transactionId: "ch_9K2LzP6Wr2",
    customer: "Harbor Media Group",
    date: "May 13, 2025",
    amount: 1250,
    method: "visa" as const,
    status: "pending" as const,
  },
  {
    id: "txn-4",
    transactionId: "ch_9K2JkM5Tn8",
    customer: "Lakeside Boutique",
    date: "May 13, 2025",
    amount: 86,
    method: "mastercard" as const,
    status: "failed" as const,
  },
  {
    id: "txn-5",
    transactionId: "ch_9K2HmQ3Vc4",
    customer: "Northwind Collective",
    date: "May 12, 2025",
    amount: 2120,
    method: "visa" as const,
    status: "succeeded" as const,
  },
];

function money(n: number) {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function PaymentsMetricCard({
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

function InvoiceStatusBadge({ status }: { status: "paid" | "pending" | "past_due" }) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center rounded-full bg-[#22c55e]/14 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#15803d] ring-1 ring-[#22c55e]/30">
        Paid
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center rounded-full bg-[#eab308]/16 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#854d0e] ring-1 ring-[#eab308]/35">
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[#ef4444]/12 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#dc2626] ring-1 ring-[#fca5a5]/70">
      Past Due
    </span>
  );
}

function TransactionStatusBadge({
  status,
}: {
  status: "succeeded" | "pending" | "failed";
}) {
  if (status === "succeeded") {
    return (
      <span className="inline-flex items-center rounded-full bg-[#22c55e]/14 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#15803d] ring-1 ring-[#22c55e]/30">
        Succeeded
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center rounded-full bg-[#eab308]/16 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#854d0e] ring-1 ring-[#eab308]/35">
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[#ef4444]/12 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#dc2626] ring-1 ring-[#fca5a5]/70">
      Failed
    </span>
  );
}

function CardBrandBadge({ brand }: { brand: "visa" | "mastercard" }) {
  if (brand === "visa") {
    return (
      <span
        aria-hidden
        className="inline-flex h-[22px] min-w-[40px] items-center justify-center rounded bg-[#1a1f71] px-2 text-[10px] font-black tracking-wider text-white"
      >
        VISA
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2.5">
      <span aria-hidden className="relative inline-flex h-7 w-10 shrink-0 items-center">
        <span className="absolute left-0.5 top-1/2 size-[18px] -translate-y-1/2 rounded-full bg-[#eb001b]" />
        <span className="absolute left-[14px] top-1/2 size-[18px] -translate-y-1/2 rounded-full bg-[#f79e1b]" />
      </span>
      <span className="text-[13px] font-medium text-gray-900">Mastercard</span>
    </span>
  );
}

function PaymentMethodCell({ brand }: { brand: "visa" | "mastercard" }) {
  if (brand === "visa") {
    return (
      <div className="flex items-center gap-2">
        <CardBrandBadge brand="visa" />
        <span className="text-[13px] font-medium text-gray-900">VISA</span>
      </div>
    );
  }
  return <CardBrandBadge brand="mastercard" />;
}

const SELECT_CLASS =
  "appearance-none rounded-lg border border-gray-200 bg-white py-2.5 ps-4 pe-9 text-[13px] font-medium text-gray-700 shadow-xs transition-colors focus-visible:border-[#015AFD] focus-visible:ring-2 focus-visible:ring-[#015AFD]/25";

export function AdminPaymentsOverviewView() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [overview, setOverview] = useState<{
    metrics: {
      totalRevenue: number;
      paid: number;
      pending: number;
      pastDue: number;
      refunded: number;
    };
    revenueTrend: Array<{ label: string; value: number }>;
    breakdown: Array<{ key: string; name: string; amount: number }>;
    planMix: Array<{ name: string; pct: number }>;
  } | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadOverview() {
      try {
        const response = await fetch("/api/admin/payments/overview", {
          cache: "no-store",
        });
        const payload = (await response.json()) as typeof overview;
        if (!response.ok || !payload || isCancelled) return;
        setOverview(payload);
      } catch {
        // Keep existing static payload as fallback.
      }
    }

    void loadOverview();

    return () => {
      isCancelled = true;
    };
  }, []);

  const metrics = overview?.metrics ?? {
    totalRevenue: 24350,
    paid: 19850,
    pending: 2640,
    pastDue: 1860,
    refunded: 340,
  };
  const revenueTrendData = overview?.revenueTrend?.length
    ? overview.revenueTrend
    : REVENUE_TREND_DATA;
  const breakdownSegments = useMemo(() => {
    const source = overview?.breakdown?.length
      ? overview.breakdown.map((row, index) => ({
          ...row,
          fill: BREAKDOWN_ROWS_RAW[index % BREAKDOWN_ROWS_RAW.length]?.fill ?? "#94a3b8",
        }))
      : BREAKDOWN_ROWS_RAW;
    const total = Math.max(
      1,
      source.reduce((sum, row) => sum + (row.amount || 0), 0),
    );
    return source.map((row) => ({
      ...row,
      percentLabel: `${(((row.amount || 0) / total) * 100).toFixed(1)}%`,
    }));
  }, [overview]);
  const planMix = useMemo(() => {
    if (!overview?.planMix?.length) return PLAN_MIX;
    const fills = ["#3b82f6", "#64748b", "#eab308", "#cbd5e1"];
    return overview.planMix.map((row, index) => ({
      ...row,
      fill: fills[index % fills.length] ?? "#cbd5e1",
    }));
  }, [overview]);

  const piePayload = breakdownSegments.map((s) => ({
    name: s.name,
    value: s.amount,
    fill: s.fill,
  }));

  const chartGradientId = "paymentsRevenueFill";

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 pb-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl space-y-2">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 sm:text-[30px]">
            Payments Overview
          </h1>
          <p className="text-[15px] text-[#7A7D9C]">
            Track revenue, invoices and payment activity
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
        <PaymentsMetricCard
          title="Total Revenue"
          value={money(metrics.totalRevenue)}
          trend="↑ 14% vs last 7 days"
          trendTone="positive"
          Icon={DollarSign}
          accentClassName="bg-emerald-400/16 text-emerald-700"
        />
        <PaymentsMetricCard
          title="Paid"
          value={money(metrics.paid)}
          trend="↑ 18% vs last 7 days"
          trendTone="positive"
          Icon={CircleCheckBig}
          accentClassName="bg-[#22c55e]/15 text-[#16a34a]"
        />
        <PaymentsMetricCard
          title="Pending"
          value={money(metrics.pending)}
          trend="↓ 5% vs last 7 days"
          trendTone="negative"
          Icon={Clock}
          accentClassName="bg-orange-400/18 text-orange-700"
        />
        <PaymentsMetricCard
          title="Past Due"
          value={money(metrics.pastDue)}
          trend="↑ 8% vs last 7 days"
          trendTone="negative"
          Icon={TriangleAlert}
          accentClassName="bg-[#ef4444]/12 text-[#ef4444]"
        />
        <PaymentsMetricCard
          title="Refunded"
          value={money(metrics.refunded)}
          trend="↓ 12% vs last 7 days"
          trendTone="positive"
          Icon={RotateCw}
          accentClassName="bg-[#3b82f6]/12 text-[#2563eb]"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.06fr_minmax(0,0.94fr)] xl:gap-8">
        <Card className="rounded-2xl border border-slate-200 bg-white py-0 shadow-sm">
          <CardHeader className="border-b border-slate-100 px-6 py-5">
            <p className="text-lg font-semibold text-slate-900">Revenue Trend</p>
          </CardHeader>
          <CardContent className="space-y-3 px-6 pt-6 pb-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-50 pb-4">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Total Revenue
                </p>
                <p className="text-[34px] font-bold tracking-tight text-slate-900">
                  $24,350
                </p>
              </div>
              <p className="text-[#22c55e] text-sm font-semibold">
                ↑ 14% vs last month
              </p>
            </div>
            <div className="mt-6 h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={revenueTrendData}
                  margin={{ left: 4, top: 8, bottom: 0, right: 12 }}
                >
                  <defs>
                    <linearGradient id={chartGradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 6000]}
                    tickFormatter={(v: number) => `$${v / 1000}K`}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                    width={44}
                  />
                  <RechartsTooltip
                    cursor={{ stroke: "#e2e8f0", strokeDasharray: "4 4" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                    }}
                    formatter={(value) =>
                      `$${Number(value ?? 0).toLocaleString("en-US")}`
                    }
                    labelStyle={{ fontWeight: 600, color: "#475569" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill={`url(#${chartGradientId})`}
                    dot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: "#3b82f6" }}
                    activeDot={{ r: 5, strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white py-0 shadow-sm">
          <CardHeader className="border-b border-slate-100 px-6 py-5">
            <p className="text-lg font-semibold text-slate-900">
              Revenue Breakdown
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-8 px-6 py-6 lg:flex-row lg:items-stretch lg:gap-10">
            <div className="relative mx-auto shrink-0 w-full max-w-[240px]">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={piePayload}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={94}
                    paddingAngle={1.6}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {piePayload.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value) =>
                      `$${Number(value ?? 0).toLocaleString("en-US")}`
                    }
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-4">
                <p className="text-[21px] font-bold leading-none tracking-tight text-slate-900">
                  {money(metrics.totalRevenue)}
                </p>
                <p className="text-muted-foreground mt-1 text-[13px] font-medium">
                  Total
                </p>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              {breakdownSegments.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-4 text-[13px]"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: row.fill }}
                      aria-hidden
                    />
                    <span className="truncate font-semibold text-slate-900">
                      {row.name}
                    </span>
                  </div>
                  <div className="shrink-0 text-end tabular-nums">
                    <span className="font-semibold text-slate-900">
                      {money(row.amount)}
                    </span>
                    <span className="text-muted-foreground ms-3 text-[12px]">
                      ({row.percentLabel})
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="w-full shrink-0 border-t border-slate-100 pt-6 lg:w-[200px] lg:border-s lg:border-t-0 lg:ps-8 lg:pt-0 xl:w-[220px]">
              <p className="mb-4 text-[13px] font-semibold text-slate-900">By Plan</p>
              <div className="space-y-4">
                {planMix.map((plan) => (
                  <div key={plan.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px] text-slate-700">
                      <span className="font-medium">{plan.name}</span>
                      <span className="tabular-nums font-semibold text-slate-900">
                        {plan.pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${plan.pct}%`,
                          background: plan.fill,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-200 lg:max-w-md">
            <Search className="size-5 shrink-0 text-[#015AFD]" aria-hidden />
            <input
              className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
              placeholder="Search invoices, customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search invoices and customers"
            />
            {search ? (
              <button
                type="button"
                className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="relative">
            <select className={cn(SELECT_CLASS, "min-w-[140px]")} aria-label="Filter by status">
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
            <select className={cn(SELECT_CLASS, "min-w-[168px]")} aria-label="Filter by customer">
              <option value="all">All Customers</option>
              {Array.from(new Set(INVOICES.map((i) => i.customer))).map((name) => (
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
            <select className={cn(SELECT_CLASS, "min-w-[140px]")} aria-label="Filter by plan">
              <option value="all">All Plans</option>
              <option value="professional">Professional</option>
              <option value="starter">Starter</option>
              <option value="trial">Trial</option>
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
            />
          </div>

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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <InvoiceTableShell
            invoices={INVOICES.filter(
              (i) =>
                !search.trim() ||
                i.customer.toLowerCase().includes(search.toLowerCase()) ||
                i.number.toLowerCase().includes(search.toLowerCase()),
            )}
          />
          <TransactionsTableShell
            transactions={TRANSACTIONS.filter(
              (t) =>
                !search.trim() ||
                t.customer.toLowerCase().includes(search.toLowerCase()) ||
                t.transactionId.toLowerCase().includes(search.toLowerCase()),
            )}
          />
        </div>
      </section>
    </div>
  );
}

function InvoiceTableShell({
  invoices,
}: {
  invoices: (typeof INVOICES)[number][];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-none">
      <div className="border-b border-slate-100 px-6 py-4">
        <p className="text-base font-semibold text-slate-900">Recent Invoices</p>
      </div>
      <div className="max-[991px]:overflow-x-auto">
        <table className="min-w-full text-[13px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Invoice #
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Customer
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Due Date
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Amount
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.length === 0 ? (
              <tr>
                <td className="px-4 py-12 text-center text-gray-500" colSpan={6}>
                  No matching invoices.
                </td>
              </tr>
            ) : (
              invoices.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-4 font-mono font-medium text-gray-900">
                    {row.number}
                  </td>
                  <td className="px-4 py-4 font-semibold text-gray-900">
                    {row.customer}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                    {row.date}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                    {row.dueDate}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 tabular-nums font-medium text-gray-900">
                    {money(row.amount)}
                  </td>
                  <td className="px-4 py-4">
                    <InvoiceStatusBadge status={row.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/90 px-6 py-4 text-[13px]">
        <p className="font-medium text-gray-600">
          {invoices.length === 0
            ? "No matching invoices."
            : `Showing 1 to ${invoices.length} of 28 invoices`}
        </p>
        <Link
          href="/administrator/billing/invoices"
          className="font-semibold text-[#015AFD] hover:underline"
        >
          View all invoices →
        </Link>
      </footer>
    </div>
  );
}

function TransactionsTableShell({
  transactions,
}: {
  transactions: (typeof TRANSACTIONS)[number][];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-none">
      <div className="border-b border-slate-100 px-6 py-4">
        <p className="text-base font-semibold text-slate-900">
          Recent Transactions
        </p>
      </div>
      <div className="max-[991px]:overflow-x-auto">
        <table className="min-w-full text-[13px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Transaction ID
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Customer
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Amount
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Method
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.length === 0 ? (
              <tr>
                <td className="px-4 py-12 text-center text-gray-500" colSpan={6}>
                  No matching transactions.
                </td>
              </tr>
            ) : (
              transactions.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-4 font-mono text-[12px] font-medium text-gray-800">
                    {row.transactionId}
                  </td>
                  <td className="px-4 py-4 font-semibold text-gray-900">
                    {row.customer}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                    {row.date}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 tabular-nums font-medium text-gray-900">
                    {money(row.amount)}
                  </td>
                  <td className="px-4 py-4">
                    <PaymentMethodCell brand={row.method} />
                  </td>
                  <td className="px-4 py-4">
                    <TransactionStatusBadge status={row.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/90 px-6 py-4 text-[13px]">
        <p className="font-medium text-gray-600">
          {transactions.length === 0
            ? "No matching transactions."
            : `Showing 1 to ${transactions.length} of 32 transactions`}
        </p>
        <Link
          href="/administrator/payments/transactions"
          className="font-semibold text-[#015AFD] hover:underline"
        >
          View all transactions →
        </Link>
      </footer>
    </div>
  );
}
