import admin from "firebase-admin";
import type Stripe from "stripe";

import { formatDateLabel, loadCustomersList } from "@/app/api/admin/customers/_lib";
import { COLLECTIONS, SUBSCRIPTION_PERIODS, SUBSCRIPTION_STATUS } from "@/lib/constants";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getStripeServer } from "@/lib/stripe/get-stripe-server";

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

export interface DashboardOverview {
  range: { from: string; to: string };
  kpis: {
    totalRevenue: DashboardKpi;
    paidInvoices: DashboardKpi;
    activeSubscribers: DashboardKpi;
    usersOnFreeTrial: DashboardKpi;
    expiredTrialUsers: DashboardKpi;
    failedPayments: DashboardKpi;
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
    totalPaidAmount: number;
    displayTotalPaidAmount: string;
    recent: Array<{
      id: string;
      customerName: string;
      amount: number;
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
      amount: number;
      displayAmount: string;
      failureReason: string;
      retryStatus: string;
    }>;
  };
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
  const defaultAllTimeFrom = startOfDay(new Date("2000-01-01T00:00:00.000Z"));
  const to = toParam ? endOfDay(new Date(toParam)) : endOfDay(new Date());
  const from = fromParam
    ? startOfDay(new Date(fromParam))
    : defaultAllTimeFrom;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    const fallbackTo = endOfDay(new Date());
    const fallbackFrom = defaultAllTimeFrom;
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

function isInRange(date: Date, range: DashboardDateRange): boolean {
  return date.getTime() >= range.from.getTime() && date.getTime() <= range.to.getTime();
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

function buildEmptyDailyChart(range: DashboardDateRange): Array<{ label: string; value: number }> {
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

function formatDateTime(value: Date): string {
  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type StripeInvoicesList = Awaited<ReturnType<NonNullable<ReturnType<typeof getStripeServer>>["invoices"]["list"]>>["data"];

async function listAllStripeInvoices(stripe: NonNullable<ReturnType<typeof getStripeServer>>): Promise<StripeInvoicesList> {
  const invoices: StripeInvoicesList = [];
  let startingAfter: string | undefined;
  while (true) {
    const page = await stripe.invoices.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    invoices.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1]?.id;
  }
  return invoices;
}

async function listAllStripeCharges(stripe: NonNullable<ReturnType<typeof getStripeServer>>): Promise<Stripe.Charge[]> {
  const charges: Stripe.Charge[] = [];
  let startingAfter: string | undefined;
  while (true) {
    const page = await stripe.charges.list({
      limit: 100,
      expand: ["data.customer"],
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    charges.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1]?.id;
  }
  return charges;
}

function inRangeFromUnix(unixSeconds: number | null | undefined, range: DashboardDateRange): boolean {
  if (!unixSeconds) return false;
  const at = unixSeconds * 1000;
  return at >= range.from.getTime() && at <= range.to.getTime();
}

async function loadPaidInvoicesSummary(range: DashboardDateRange) {
  const previous = previousRange(range);
  const stripe = getStripeServer();
  if (!stripe) {
    return {
      countInRange: 0,
      countInPrevious: 0,
      totalPaidAmountInRange: 0,
      recent: [] as DashboardOverview["invoices"]["recent"],
    };
  }

  const invoices = await listAllStripeInvoices(stripe);
  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");
  const paidInRange = paidInvoices.filter((invoice) =>
    inRangeFromUnix(
      invoice.status_transitions?.paid_at ?? invoice.effective_at ?? invoice.created,
      range,
    ),
  );
  const paidInPrevious = paidInvoices.filter((invoice) =>
    inRangeFromUnix(
      invoice.status_transitions?.paid_at ?? invoice.effective_at ?? invoice.created,
      previous,
    ),
  );

  const recent = paidInRange
    .sort(
      (a, b) =>
        (b.status_transitions?.paid_at ?? b.effective_at ?? b.created) -
        (a.status_transitions?.paid_at ?? a.effective_at ?? a.created),
    )
    .slice(0, 6)
    .map((invoice) => {
      const paidAtUnix =
        invoice.status_transitions?.paid_at ?? invoice.effective_at ?? invoice.created;
      const customerName =
        typeof invoice.customer_name === "string" && invoice.customer_name.trim()
          ? invoice.customer_name.trim()
          : typeof invoice.customer_email === "string" && invoice.customer_email.trim()
            ? invoice.customer_email.trim()
            : "Unknown customer";
      const amount = (invoice.amount_paid ?? 0) / 100;
      return {
        id: invoice.number ?? invoice.id ?? "—",
        customerName,
        amount,
        displayAmount: formatCurrency(amount),
        status: statusLabel(invoice.status ?? "unknown"),
        date: formatDateTime(new Date(paidAtUnix * 1000)),
      };
    });

  const totalPaidAmountInRange = paidInRange.reduce((sum, invoice) => sum + (invoice.amount_paid ?? 0) / 100, 0);

  return {
    countInRange: paidInRange.length,
    countInPrevious: paidInPrevious.length,
    totalPaidAmountInRange: Math.round(totalPaidAmountInRange * 100) / 100,
    recent,
  };
}

async function loadSubscriberData(range: DashboardDateRange) {
  const db = getAdminFirestore();
  const [usersSnap, subscriptionsSnap, trackersSnap] = await Promise.all([
    db.collection(COLLECTIONS.USERS).get(),
    db.collection(COLLECTIONS.SUBSCRIPTIONS).get(),
    db.collection(COLLECTIONS.AUTH_TRACKERS).get(),
  ]);

  const usersById = new Map<string, Record<string, unknown>>();
  usersSnap.docs.forEach((doc) => usersById.set(doc.id, (doc.data() ?? {}) as Record<string, unknown>));

  const lastLoginByUserId = new Map<string, Date>();
  trackersSnap.docs.forEach((doc) => {
    const data = (doc.data() ?? {}) as Record<string, unknown>;
    const userRef = data["User"];
    const modified = data["Modified Date"];
    if (!(userRef instanceof admin.firestore.DocumentReference)) return;
    if (!(modified instanceof admin.firestore.Timestamp)) return;
    lastLoginByUserId.set(userRef.id, modified.toDate());
  });

  const now = new Date();
  const rows: DashboardOverview["subscribers"]["rows"] = [];
  const trialRows: DashboardOverview["trialUsers"]["rows"] = [];
  const expiredTrialRows: DashboardOverview["expiredTrialUsers"]["rows"] = [];

  let active = 0;
  let trial = 0;
  let canceled = 0;
  let pastDue = 0;

  subscriptionsSnap.docs.forEach((doc) => {
    const data = (doc.data() ?? {}) as Record<string, unknown>;
    const userRef = data["User"];
    if (!(userRef instanceof admin.firestore.DocumentReference)) return;
    const userData = usersById.get(userRef.id) ?? {};
    const statusRaw = typeof data["User Status"] === "string" ? data["User Status"] : "Unknown";
    const statusLower = statusRaw.toLowerCase();
    const planRaw = typeof data["Subscription Plan"] === "string" ? data["Subscription Plan"] : "Professional";
    const createdTimestamp = data["Created Date"] instanceof admin.firestore.Timestamp
      ? data["Created Date"]
      : data.createdAt instanceof admin.firestore.Timestamp
        ? data.createdAt
        : null;
    const joinDate = createdTimestamp?.toDate() ?? null;
    const name =
      (typeof userData["Company Name"] === "string" && userData["Company Name"].trim()) ||
      (typeof userData["Company"] === "string" && userData["Company"].trim()) ||
      (typeof userData["Name"] === "string" && userData["Name"].trim()) ||
      "Unknown customer";
    const email =
      (typeof userData["Email"] === "string" && userData["Email"].trim()) ||
      (typeof userData.email === "string" && userData.email.trim()) ||
      "unknown@example.com";

    if (statusRaw === SUBSCRIPTION_STATUS.ACTIVE || statusRaw === SUBSCRIPTION_STATUS.PAYING) {
      active += 1;
    } else if (statusRaw === SUBSCRIPTION_STATUS.TRIAL_NEW) {
      trial += 1;
    } else if (statusRaw === SUBSCRIPTION_STATUS.PAYMENT_FAILED) {
      pastDue += 1;
    } else if (statusRaw === SUBSCRIPTION_STATUS.CANCELED || statusRaw === SUBSCRIPTION_STATUS.TRIAL_ENDED) {
      canceled += 1;
    }

    rows.push({
      id: doc.id,
      name,
      email,
      subscriptionPlan: planRaw,
      paymentStatus: statusLabel(statusLower.replace(/\s+/g, "_")),
      lastLogin: lastLoginByUserId.get(userRef.id) ? formatDateTime(lastLoginByUserId.get(userRef.id) as Date) : "—",
      joinDate: joinDate ? formatDateLabel(joinDate) : "—",
      accountStatus: statusLabel(statusLower.replace(/\s+/g, "_")),
    });

    const trialStart = data["Free Trial Start Date"] instanceof admin.firestore.Timestamp
      ? data["Free Trial Start Date"].toDate()
      : null;
    if (!trialStart) return;

    const trialEnd = new Date(trialStart);
    trialEnd.setDate(trialEnd.getDate() + SUBSCRIPTION_PERIODS.TRIAL_DAYS);
    if (!isInRange(trialStart, range) && !isInRange(trialEnd, range)) return;

    const diffDays = Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    if (statusRaw === SUBSCRIPTION_STATUS.TRIAL_NEW && diffDays >= 0) {
      trialRows.push({
        id: doc.id,
        name,
        email,
        trialStartDate: formatDateLabel(trialStart),
        daysRemaining: diffDays,
        conversionStatus: "In trial",
      });
    }
    if (statusRaw === SUBSCRIPTION_STATUS.TRIAL_ENDED || diffDays < 0) {
      expiredTrialRows.push({
        id: doc.id,
        name,
        email,
        trialExpirationDate: formatDateLabel(trialEnd),
        daysSinceExpiration: Math.max(Math.abs(diffDays), 0),
        reengagementStatus:
          statusRaw === SUBSCRIPTION_STATUS.ACTIVE || statusRaw === SUBSCRIPTION_STATUS.PAYING
            ? "Converted"
            : "Needs outreach",
      });
    }
  });

  return {
    subscribers: {
      total: rows.length,
      active,
      trial,
      canceled,
      pastDue,
      rows: rows.slice(0, 8),
    },
    trialUsers: {
      total: trialRows.length,
      rows: trialRows.slice(0, 8),
    },
    expiredTrialUsers: {
      total: expiredTrialRows.length,
      rows: expiredTrialRows.slice(0, 8),
    },
  };
}

async function loadFailedPayments(range: DashboardDateRange) {
  const stripe = getStripeServer();
  if (!stripe) {
    return { total: 0, previousTotal: 0, rows: [] as DashboardOverview["failedPayments"]["rows"] };
  }

  const previous = previousRange(range);
  const charges = await listAllStripeCharges(stripe);
  const failedCharges = charges.filter((charge) => charge.status === "failed");

  const currentRows = failedCharges.filter((charge) => inRangeFromUnix(charge.created, range));
  const previousRows = failedCharges.filter((charge) => inRangeFromUnix(charge.created, previous));

  const rows = currentRows
    .sort((a, b) => b.created - a.created)
    .slice(0, 8)
    .map((charge) => {
      const customer = charge.customer as Stripe.Customer | null;
      const customerName =
        customer?.name?.trim() || customer?.email?.trim() || charge.billing_details?.name || "Unknown customer";
      const email = customer?.email?.trim() || charge.billing_details?.email || "—";
      const amount = (charge.amount ?? 0) / 100;
      return {
        id: charge.id,
        customerName,
        email,
        failedPaymentDate: formatDateTime(new Date(charge.created * 1000)),
        amount,
        displayAmount: formatCurrency(amount),
        failureReason: charge.failure_message || "Payment could not be processed",
        retryStatus: charge.paid ? "Recovered" : "Retry required",
      };
    });

  return {
    total: currentRows.length,
    previousTotal: previousRows.length,
    rows,
  };
}


export async function loadAdminDashboardOverview(
  range: DashboardDateRange,
): Promise<DashboardOverview> {
  const [
    customers,
    revenue,
    paidInvoices,
    subscriberData,
    failedPaymentsData,
  ] =
    await Promise.all([
      loadCustomersList(),
      loadStripeRevenue(range),
      loadPaidInvoicesSummary(range),
      loadSubscriberData(range),
      loadFailedPayments(range),
    ]);

  const paidInvoiceTrend = formatTrend(paidInvoices.countInRange, paidInvoices.countInPrevious);
  const revenueTrend = formatTrend(revenue.total, revenue.previousTotal);
  const failedPaymentsTrend = formatTrend(failedPaymentsData.total, failedPaymentsData.previousTotal);

  return {
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    },
    kpis: {
      totalRevenue: {
        value: revenue.total,
        displayValue: formatCurrency(revenue.total),
        trendLabel: revenueTrend.label,
        trendPositive: revenueTrend.positive,
      },
      paidInvoices: {
        value: paidInvoices.countInRange,
        displayValue: formatCount(paidInvoices.countInRange),
        trendLabel: paidInvoiceTrend.label,
        trendPositive: paidInvoiceTrend.positive,
      },
      activeSubscribers: {
        value: subscriberData.subscribers.active,
        displayValue: formatCount(subscriberData.subscribers.active),
        trendLabel: `${formatCount(subscriberData.subscribers.total)} total subscribers`,
        trendPositive: subscriberData.subscribers.active >= subscriberData.subscribers.pastDue,
      },
      usersOnFreeTrial: {
        value: subscriberData.trialUsers.total,
        displayValue: formatCount(subscriberData.trialUsers.total),
        trendLabel: `${formatCount(subscriberData.subscribers.trial)} trial subscriptions`,
        trendPositive: true,
      },
      expiredTrialUsers: {
        value: subscriberData.expiredTrialUsers.total,
        displayValue: formatCount(subscriberData.expiredTrialUsers.total),
        trendLabel: "Needs re-engagement",
        trendPositive: false,
      },
      failedPayments: {
        value: failedPaymentsData.total,
        displayValue: formatCount(failedPaymentsData.total),
        trendLabel: failedPaymentsTrend.label,
        trendPositive: failedPaymentsData.total <= failedPaymentsData.previousTotal,
      },
    },
    revenue: {
      total: revenue.total,
      displayTotal: formatCurrency(revenue.total),
      trendLabel: revenueTrend.label,
      trendPositive: revenueTrend.positive,
      chart: revenue.chart,
    },
    invoices: {
      totalPaidCount: paidInvoices.countInRange,
      totalPaidAmount: paidInvoices.totalPaidAmountInRange,
      displayTotalPaidAmount: formatCurrency(paidInvoices.totalPaidAmountInRange),
      recent: paidInvoices.recent,
    },
    subscribers: subscriberData.subscribers,
    trialUsers: subscriberData.trialUsers,
    expiredTrialUsers: subscriberData.expiredTrialUsers,
    failedPayments: {
      total: failedPaymentsData.total,
      rows: failedPaymentsData.rows,
    },
  };
}
