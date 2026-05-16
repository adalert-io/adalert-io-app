"use client";

import * as React from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  DollarSign,
  Info,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const revenueChartData = [
  { label: "May 9", v: 4200 },
  { label: "May 10", v: 5100 },
  { label: "May 11", v: 4800 },
  { label: "May 12", v: 6200 },
  { label: "May 13", v: 7100 },
  { label: "May 14", v: 8600 },
  { label: "May 15", v: 11200 },
];

const recentAlerts = [
  {
    id: "1",
    company: "McGrath Kavinoky LLP",
    message: "Conversions decreased by over 50%",
    date: "15 May, 2025",
    tone: "red" as const,
  },
  {
    id: "2",
    company: "Lakeside Boutique",
    message: "Ad spend exceeded daily budget threshold",
    date: "15 May, 2025",
    tone: "amber" as const,
  },
  {
    id: "3",
    company: "Nexus AI Labs",
    message: "New policy recommendation available",
    date: "14 May, 2025",
    tone: "yellow" as const,
  },
  {
    id: "4",
    company: "Sunrise Catering Co.",
    message: "Click-through rate dropped below 2%",
    date: "14 May, 2025",
    tone: "red" as const,
  },
  {
    id: "5",
    company: "PixelForge Studios",
    message: "Account linked successfully",
    date: "13 May, 2025",
    tone: "amber" as const,
  },
];

const topCustomers = [
  {
    customer: "Nexus AI Labs",
    adAccounts: "12",
    mrr: "$2,845",
    status: "Active" as const,
  },
  {
    customer: "PixelForge Studios",
    adAccounts: "8",
    mrr: "$1,995",
    status: "Trial" as const,
  },
  {
    customer: "Lakeside Boutique",
    adAccounts: "5",
    mrr: "$860",
    status: "Past Due" as const,
  },
];

const recentPayments = [
  { customer: "Nexus AI Labs", amount: "$250.00", status: "Paid" as const, date: "15 May 2025" },
  { customer: "PixelForge Studios", amount: "$199.95", status: "Pending" as const, date: "15 May 2025" },
  { customer: "Lakeside Boutique", amount: "$86.00", status: "Failed" as const, date: "14 May 2025" },
  { customer: "Sunrise Catering Co.", amount: "$320.45", status: "Paid" as const, date: "14 May 2025" },
];

function DashboardMetricCard({
  title,
  value,
  trend,
  icon,
  accentClassName,
}: {
  title: string;
  value: string;
  trend: string;
  icon: React.ReactNode;
  accentClassName?: string;
}) {
  return (
    <Card className="rounded-2xl border border-slate-200/90 bg-white py-6 shadow-md">
      <CardContent className="flex items-start justify-between gap-4 px-6">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="truncate text-[28px] font-bold tracking-tight text-slate-900">{value}</p>
          <p className="text-[#22c55e] text-sm font-medium">{trend}</p>
        </div>
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-xl text-[#3b82f6]",
            accentClassName ?? "bg-[#3b82f6]/10",
          )}
        >
          {icon}
        </span>
      </CardContent>
    </Card>
  );
}

function customerStatusBadge(status: "Active" | "Trial" | "Past Due") {
  if (status === "Active") {
    return <Badge variant="success">Active</Badge>;
  }
  if (status === "Trial") {
    return <Badge variant="info">Trial</Badge>;
  }
  return <Badge variant="destructive">Past Due</Badge>;
}

function paymentStatusBadge(status: "Paid" | "Pending" | "Failed") {
  if (status === "Paid") {
    return <Badge variant="success">Paid</Badge>;
  }
  if (status === "Pending") {
    return <Badge variant="warning">Pending</Badge>;
  }
  return <Badge variant="destructive">Failed</Badge>;
}

function alertDotVariant(tone: "red" | "amber" | "yellow"): string {
  if (tone === "red") {
    return "bg-[#ef4444]";
  }
  if (tone === "amber") {
    return "bg-[#f97316]";
  }
  return "bg-amber-400";
}

export function AdminDashboardHome() {
  const [period] = React.useState("May 9 — May 15, 2025");

  return (
    <div className="flex min-h-full flex-col bg-[#f8fafc]">
      <div className="mx-auto w-full max-w-[1480px] flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-10">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="space-y-2">
            <h1 className="text-[28px] font-bold tracking-tight text-slate-900 sm:text-[32px]">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground max-w-xl text-[15px]">
              Overview of your ad monitoring platform
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-xl border-slate-200 bg-white px-4 py-2 text-sm shadow-sm hover:bg-slate-50"
          >
            <CalendarDays className="size-4 text-slate-500" />
            {period}
            <ChevronDown className="size-4 text-slate-500" aria-hidden />
          </Button>
        </header>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <DashboardMetricCard
            title="Total Customers"
            value="128"
            trend="↑ 12% vs last 7 days"
            icon={<Users className="size-6" />}
            accentClassName="bg-[#3b82f6]/10"
          />
          <DashboardMetricCard
            title="Active Ad Accounts"
            value="342"
            trend="↑ 18% vs last 7 days"
            icon={
              <span className="text-lg font-bold tracking-tighter" aria-hidden>
                Ad
              </span>
            }
            accentClassName="bg-[#3b82f6]/15"
          />
          <DashboardMetricCard
            title="Monthly Recurring Revenue"
            value="$12,845"
            trend="↑ 14% vs last 7 days"
            icon={<DollarSign className="size-6" />}
            accentClassName="bg-[#22c55e]/12 text-[#16a34a]"
          />
          <DashboardMetricCard
            title="Open Alerts"
            value="89"
            trend="↑ 5% vs last 7 days"
            icon={<Bell className="size-6" />}
            accentClassName="bg-[#ef4444]/10 text-[#ef4444]"
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_minmax(0,0.95fr)] xl:gap-8">
          <Card className="rounded-2xl border border-slate-200/90 bg-white py-0 shadow-md">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-slate-900">Revenue Overview</p>
                <button
                  type="button"
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="About revenue overview"
                >
                  <Info className="size-4" />
                </button>
              </div>
              <Button variant="outline" size="sm" className="gap-2 rounded-xl border-slate-200 bg-white shadow-sm">
                This Month
                <ChevronDown className="size-4 text-slate-500" aria-hidden />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 px-6 pt-6 pb-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-50 pb-4">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Revenue</p>
                  <p className="text-[34px] font-bold tracking-tight text-slate-900">$12,845</p>
                </div>
                <p className="text-[#22c55e] text-sm font-semibold">+14% vs last month</p>
              </div>
              <div className="mt-6 h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData} margin={{ left: -10, top: 6, bottom: 0, right: 8 }}>
                    <defs>
                      <linearGradient id="dashRevenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} stroke="#cbd5f5" axisLine={{ stroke: "#e2e8f0" }} tickLine={false} />
                    <YAxis tickFormatter={(v: number) => `$${Math.round(v / 1000)}K`} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} tickLine={false} domain={[0, 14000]} />
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
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-slate-200/90 bg-white py-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <p className="text-lg font-semibold text-slate-900">Recent Alerts</p>
              <Link href="/administrator/alerts" className="text-[#3b82f6] text-sm font-medium hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="max-h-[420px] space-y-0 divide-y divide-slate-100 overflow-auto px-0 py-0">
              {recentAlerts.map((alertRow) => (
                <article key={alertRow.id} className="flex gap-4 px-6 py-4">
                  <span
                    className={cn("mt-1.5 size-2 shrink-0 rounded-full", alertDotVariant(alertRow.tone))}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{alertRow.company}</p>
                    <p className="text-muted-foreground mt-1 text-[13px] leading-snug">
                      {alertRow.message}
                    </p>
                    <p className="text-muted-foreground mt-2 text-xs">{alertRow.date}</p>
                  </div>
                </article>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 pb-16 lg:gap-8 xl:grid-cols-2">
          <Card className="rounded-2xl border border-slate-200/90 bg-white py-0 shadow-md">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <p className="text-lg font-semibold text-slate-900">Top Customers</p>
              <Link href="/administrator/customers" className="text-[#3b82f6] text-sm font-medium hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="px-2 py-4 sm:px-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="ps-6">Customer</TableHead>
                    <TableHead>Ad Accounts</TableHead>
                    <TableHead>MRR</TableHead>
                    <TableHead className="pe-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCustomers.map((row) => (
                    <TableRow key={row.customer} className="border-slate-100">
                      <TableCell className="ps-6 font-semibold text-slate-900">{row.customer}</TableCell>
                      <TableCell>{row.adAccounts}</TableCell>
                      <TableCell className="font-medium">{row.mrr}</TableCell>
                      <TableCell className="pe-6">{customerStatusBadge(row.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-slate-200/90 bg-white py-0 shadow-md">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <p className="text-lg font-semibold text-slate-900">Recent Payments</p>
              <Link
                href="/administrator/payments/transactions"
                className="text-[#3b82f6] text-sm font-medium hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className="px-2 py-4 sm:px-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="ps-6">Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pe-6">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map((row) => (
                    <TableRow key={`${row.customer}-${row.date}`} className="border-slate-100">
                      <TableCell className="ps-6 font-semibold text-slate-900">{row.customer}</TableCell>
                      <TableCell className="font-medium">{row.amount}</TableCell>
                      <TableCell>{paymentStatusBadge(row.status)}</TableCell>
                      <TableCell className="pe-6 text-muted-foreground text-sm">{row.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
