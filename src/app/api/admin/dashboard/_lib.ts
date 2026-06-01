import admin from "firebase-admin";

import { loadCustomersList } from "@/app/api/admin/customers/_lib";
import { COLLECTIONS } from "@/lib/constants";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getStripeServer } from "@/lib/stripe/get-stripe-server";

export type AlertTone = "red" | "amber" | "yellow";

export interface DashboardDateRange {
  from: Date;
  to: Date;
}

export interface DashboardKpi {
  value: number;
  displayValue: string;
  trendLabel: string;
  trendPositive: boolean;
}

export interface DashboardRecentAlert {
  id: string;
  company: string;
  message: string;
  date: string;
  tone: AlertTone;
}

export interface DashboardOverview {
  range: { from: string; to: string };
  kpis: {
    totalCustomers: DashboardKpi;
    activeAdAccounts: DashboardKpi;
    monthlyRecurringRevenue: DashboardKpi;
    openAlerts: DashboardKpi;
  };
  revenue: {
    total: number;
    displayTotal: string;
    trendLabel: string;
    trendPositive: boolean;
    chart: Array<{ label: string; value: number }>;
  };
  recentAlerts: DashboardRecentAlert[];
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function parseDashboardRange(
  fromParam: string | null,
  toParam: string | null,
): DashboardDateRange {
  const to = toParam ? endOfDay(new Date(toParam)) : endOfDay(new Date());
  const from = fromParam
    ? startOfDay(new Date(fromParam))
    : startOfDay(new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000));

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    const fallbackTo = endOfDay(new Date());
    const fallbackFrom = startOfDay(new Date(fallbackTo.getTime() - 6 * 24 * 60 * 60 * 1000));
    return { from: fallbackFrom, to: fallbackTo };
  }

  return { from, to };
}

function previousRange(range: DashboardDateRange): DashboardDateRange {
  const durationMs = range.to.getTime() - range.from.getTime() + 1;
  const prevTo = new Date(range.from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs + 1);
  return { from: startOfDay(prevFrom), to: endOfDay(prevTo) };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatTrend(current: number, previous: number): { label: string; positive: boolean } {
  if (previous <= 0) {
    if (current <= 0) {
      return { label: "No change vs prior period", positive: true };
    }
    return { label: "Up from prior period", positive: true };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) {
    return { label: "No change vs prior period", positive: true };
  }
  return {
    label: `${pct > 0 ? "↑" : "↓"} ${Math.abs(pct)}% vs prior period`,
    positive: pct >= 0,
  };
}

function severityToTone(severity: unknown): AlertTone {
  const raw = typeof severity === "string" ? severity.toLowerCase() : "";
  if (raw.includes("critical")) return "red";
  if (raw.includes("medium")) return "amber";
  return "yellow";
}

function formatAlertDate(value: unknown): string {
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  return "—";
}

function isInRange(date: Date, range: DashboardDateRange): boolean {
  return date.getTime() >= range.from.getTime() && date.getTime() <= range.to.getTime();
}

async function resolveCompanyNameByAdsAccountRef(
  adsAccountRef: admin.firestore.DocumentReference,
  cache: Map<string, string>,
): Promise<string> {
  if (cache.has(adsAccountRef.id)) {
    return cache.get(adsAccountRef.id)!;
  }

  const db = getAdminFirestore();
  try {
    const adsAccountSnap = await adsAccountRef.get();
    if (!adsAccountSnap.exists) {
      cache.set(adsAccountRef.id, "Unknown company");
      return "Unknown company";
    }

    const adsData = adsAccountSnap.data() as Record<string, unknown>;
    const userRef = adsData["User"];
    if (!(userRef instanceof admin.firestore.DocumentReference)) {
      cache.set(adsAccountRef.id, "Unknown company");
      return "Unknown company";
    }

    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      cache.set(adsAccountRef.id, "Unknown company");
      return "Unknown company";
    }

    const userData = userSnap.data() as Record<string, unknown>;
    const company =
      (typeof userData["Company Name"] === "string" && userData["Company Name"].trim()) ||
      (typeof userData["Company"] === "string" && userData["Company"].trim()) ||
      (typeof userData["Name"] === "string" && userData["Name"].trim()) ||
      "Unknown company";
    cache.set(adsAccountRef.id, company);
    return company;
  } catch {
    cache.set(adsAccountRef.id, "Unknown company");
    return "Unknown company";
  }
}

async function loadAlertsSnapshot(limit = 1200) {
  const db = getAdminFirestore();
  try {
    return await db
      .collection(COLLECTIONS.ALERTS)
      .orderBy("Date Found", "desc")
      .limit(limit)
      .get();
  } catch {
    return await db.collection(COLLECTIONS.ALERTS).limit(limit).get();
  }
}

async function loadAlertsData(range: DashboardDateRange) {
  const previous = previousRange(range);
  const snap = await loadAlertsSnapshot();
  const companyCache = new Map<string, string>();

  let openInRange = 0;
  let openInPrevious = 0;
  let openTotal = 0;

  const candidates: Array<{
    id: string;
    company: string;
    message: string;
    date: string;
    tone: AlertTone;
    foundAt: Date;
    isOpen: boolean;
  }> = [];

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const isArchived = data["Is Archived"] === true;
    if (!isArchived) {
      openTotal += 1;
    }

    const foundAt =
      data["Date Found"] instanceof admin.firestore.Timestamp
        ? data["Date Found"].toDate()
        : null;
    if (!foundAt) continue;

    if (!isArchived && isInRange(foundAt, range)) openInRange += 1;
    if (!isArchived && isInRange(foundAt, previous)) openInPrevious += 1;

    const adsAccountRef = data["Ads Account"];
    const company =
      adsAccountRef instanceof admin.firestore.DocumentReference
        ? await resolveCompanyNameByAdsAccountRef(adsAccountRef, companyCache)
        : "Unknown company";

    const message =
      (typeof data["Long Description Plain Text"] === "string" &&
        data["Long Description Plain Text"].trim()) ||
      (typeof data.Alert === "string" && data.Alert.trim()) ||
      (typeof data["Long Description"] === "string" && data["Long Description"].trim()) ||
      "Alert detected";

    candidates.push({
      id: doc.id,
      company,
      message,
      date: formatAlertDate(data["Date Found"]),
      tone: severityToTone(data.Severity),
      foundAt,
      isOpen: !isArchived,
    });
  }

  const recentAlerts = candidates
    .filter((row) => row.isOpen)
    .sort((a, b) => b.foundAt.getTime() - a.foundAt.getTime())
    .slice(0, 8)
    .map(({ id, company, message, date, tone }) => ({ id, company, message, date, tone }));

  return {
    openTotal,
    openInRange,
    openInPrevious,
    recentAlerts,
  };
}

function dayChartLabel(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

async function listAllStripeInvoicesInWindow(
  stripe: NonNullable<ReturnType<typeof getStripeServer>>,
  fromUnix: number,
  toUnix: number,
) {
  const invoices: Awaited<ReturnType<typeof stripe.invoices.list>>["data"] = [];
  let startingAfter: string | undefined;

  while (true) {
    const page = await stripe.invoices.list({
      limit: 100,
      created: { gte: fromUnix, lte: toUnix },
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    invoices.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1]?.id;
  }

  return invoices;
}

async function loadStripeRevenue(range: DashboardDateRange) {
  const previous = previousRange(range);
  const stripe = getStripeServer();
  if (!stripe) {
    return {
      total: 0,
      previousTotal: 0,
      chart: buildEmptyDailyChart(range),
    };
  }

  const fromUnix = Math.floor(range.from.getTime() / 1000);
  const toUnix = Math.floor(range.to.getTime() / 1000);
  const prevFromUnix = Math.floor(previous.from.getTime() / 1000);
  const prevToUnix = Math.floor(previous.to.getTime() / 1000);

  const [currentInvoices, previousInvoices] = await Promise.all([
    listAllStripeInvoicesInWindow(stripe, fromUnix, toUnix),
    listAllStripeInvoicesInWindow(stripe, prevFromUnix, prevToUnix),
  ]);

  let total = 0;
  let previousTotal = 0;
  const daily = new Map<string, number>();

  for (const invoice of currentInvoices) {
    if (invoice.status !== "paid") continue;
    const amount = (invoice.amount_paid ?? 0) / 100;
    if (amount <= 0) continue;
    total += amount;
    const paidAt =
      invoice.status_transitions?.paid_at ??
      invoice.effective_at ??
      invoice.created;
    const label = dayChartLabel(paidAt);
    daily.set(label, (daily.get(label) ?? 0) + amount);
  }

  for (const invoice of previousInvoices) {
    if (invoice.status !== "paid") continue;
    const amount = (invoice.amount_paid ?? 0) / 100;
    if (amount <= 0) continue;
    previousTotal += amount;
  }

  return {
    total: Math.round(total * 100) / 100,
    previousTotal: Math.round(previousTotal * 100) / 100,
    chart: buildDailyChartFromMap(range, daily),
  };
}

function buildEmptyDailyChart(range: DashboardDateRange) {
  return buildDailyChartFromMap(range, new Map());
}

function buildDailyChartFromMap(range: DashboardDateRange, daily: Map<string, number>) {
  const points: Array<{ label: string; value: number }> = [];
  const cursor = startOfDay(range.from);
  const end = startOfDay(range.to);

  while (cursor.getTime() <= end.getTime()) {
    const label = cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    points.push({ label, value: Math.round(daily.get(label) ?? 0) });
    cursor.setDate(cursor.getDate() + 1);
  }

  return points;
}

async function countCustomersCreatedInRange(range: DashboardDateRange): Promise<number> {
  const db = getAdminFirestore();
  const snap = await db.collection(COLLECTIONS.USERS).get();
  let count = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const companyAdmin = data["Company Admin"];
    const isCompanyAdmin =
      companyAdmin instanceof admin.firestore.DocumentReference
        ? companyAdmin.id === doc.id
        : true;
    if (!isCompanyAdmin) continue;

    const created =
      data["Created Date"] instanceof admin.firestore.Timestamp
        ? data["Created Date"].toDate()
        : data.createdAt instanceof admin.firestore.Timestamp
          ? data.createdAt.toDate()
          : null;
    if (created && isInRange(created, range)) {
      count += 1;
    }
  }

  return count;
}

async function countAdAccountsConnectedInRange(range: DashboardDateRange): Promise<number> {
  const db = getAdminFirestore();
  const snap = await db.collection(COLLECTIONS.ADS_ACCOUNTS).where("Is Connected", "==", true).get();
  let count = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const created =
      data["Created Date"] instanceof admin.firestore.Timestamp
        ? data["Created Date"].toDate()
        : null;
    if (!created || isInRange(created, range)) {
      count += 1;
    }
  }

  return count;
}

export async function loadAdminDashboardOverview(
  range: DashboardDateRange,
): Promise<DashboardOverview> {
  const previous = previousRange(range);

  const [customers, alertsData, revenue, customersInRange, customersInPrevious, accountsInRange, accountsInPrevious] =
    await Promise.all([
      loadCustomersList(),
      loadAlertsData(range),
      loadStripeRevenue(range),
      countCustomersCreatedInRange(range),
      countCustomersCreatedInRange(previous),
      countAdAccountsConnectedInRange(range),
      countAdAccountsConnectedInRange(previous),
    ]);

  const [connectedAdAccounts] = await Promise.all([
    (async () => {
      const db = getAdminFirestore();
      const snap = await db
        .collection(COLLECTIONS.ADS_ACCOUNTS)
        .where("Is Connected", "==", true)
        .get();
      return snap.size;
    })(),
  ]);

  const customerTrend = formatTrend(customersInRange, customersInPrevious);
  const adAccountTrend = formatTrend(accountsInRange, accountsInPrevious);
  const alertTrend = formatTrend(alertsData.openInRange, alertsData.openInPrevious);
  const revenueTrend = formatTrend(revenue.total, revenue.previousTotal);

  return {
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    },
    kpis: {
      totalCustomers: {
        value: customers.metrics.total,
        displayValue: formatCount(customers.metrics.total),
        trendLabel: customerTrend.label,
        trendPositive: customerTrend.positive,
      },
      activeAdAccounts: {
        value: connectedAdAccounts,
        displayValue: formatCount(connectedAdAccounts),
        trendLabel: adAccountTrend.label,
        trendPositive: adAccountTrend.positive,
      },
      monthlyRecurringRevenue: {
        value: customers.metrics.mrr,
        displayValue: formatCurrency(customers.metrics.mrr),
        trendLabel: `${formatCount(customers.metrics.active)} active · ${formatCount(customers.metrics.pastDue)} past due`,
        trendPositive: customers.metrics.pastDue === 0,
      },
      openAlerts: {
        value: alertsData.openTotal,
        displayValue: formatCount(alertsData.openTotal),
        trendLabel: alertTrend.label,
        trendPositive: alertsData.openInRange <= alertsData.openInPrevious,
      },
    },
    revenue: {
      total: revenue.total,
      displayTotal: formatCurrency(revenue.total),
      trendLabel: revenueTrend.label,
      trendPositive: revenueTrend.positive,
      chart: revenue.chart,
    },
    recentAlerts: alertsData.recentAlerts,
  };
}
