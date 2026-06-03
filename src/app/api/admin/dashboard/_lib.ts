import admin from "firebase-admin";
import type Stripe from "stripe";

import { formatDateLabel } from "@/app/api/admin/customers/_lib";
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
  revenueReconciliation: {
    rangeLabel: string;
    invoiceRevenue: number;
    displayInvoiceRevenue: string;
    paidInvoiceCount: number;
    chartSeriesTotal: number;
    displayChartSeriesTotal: string;
    totalsAligned: boolean;
    transactionsSucceededAmount: number;
    displayTransactionsSucceededAmount: string;
    transactionsSucceededCount: number;
    amountsAligned: boolean;
    summary: string;
    detailPoints: string[];
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
  const fallbackTo = endOfDay(new Date());
  const defaultFrom = startOfDay(new Date(fallbackTo));
  defaultFrom.setDate(defaultFrom.getDate() - 29);
  const to = toParam ? endOfDay(new Date(toParam)) : fallbackTo;
  const from = fromParam
    ? startOfDay(new Date(fromParam))
    : defaultFrom;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    const fallbackFrom = defaultFrom;
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

function monthKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function monthlyRangeLabels(range: DashboardDateRange): Array<{ key: string; label: string }> {
  const cursor = new Date(range.from.getFullYear(), range.from.getMonth(), 1);
  const end = new Date(range.to.getFullYear(), range.to.getMonth(), 1);
  const out: Array<{ key: string; label: string }> = [];
  while (cursor.getTime() <= end.getTime()) {
    out.push({ key: monthKey(cursor), label: formatMonthLabel(cursor) });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

function invoicePaidAtUnix(invoice: Stripe.Invoice): number {
  return (
    invoice.status_transitions?.paid_at ??
    invoice.effective_at ??
    invoice.created
  );
}

async function loadPaidInvoiceMetrics(range: DashboardDateRange) {
  const previous = previousRange(range);
  const stripe = getStripeServer();
  const emptyChart = buildEmptyMonthlyChart(range);
  if (!stripe) {
    return {
      total: 0,
      previousTotal: 0,
      paidInvoices: 0,
      averageInvoiceValue: 0,
      collectionRatePct: 0,
      bestMonthRevenue: 0,
      chart: emptyChart,
      countInRange: 0,
      countInPrevious: 0,
      totalPaidAmountInRange: 0,
      recent: [] as DashboardOverview["invoices"]["recent"],
    };
  }

  const invoices = await listAllStripeInvoices(stripe);
  const paidInvoicesAll = invoices.filter((invoice) => invoice.status === "paid");

  const paidInRange = paidInvoicesAll.filter((invoice) =>
    inRangeFromUnix(invoicePaidAtUnix(invoice), range),
  );
  const paidInPrevious = paidInvoicesAll.filter((invoice) =>
    inRangeFromUnix(invoicePaidAtUnix(invoice), previous),
  );

  const invoicesCreatedInRange = invoices.filter((invoice) =>
    inRangeFromUnix(invoice.created, range),
  );

  let total = 0;
  let previousTotal = 0;
  const monthlyRevenue = new Map<string, number>();
  const monthlyPaidInvoices = new Map<string, number>();

  for (const invoice of paidInRange) {
    const amount = (invoice.amount_paid ?? 0) / 100;
    const paidDate = new Date(invoicePaidAtUnix(invoice) * 1000);
    const key = monthKey(paidDate);
    monthlyPaidInvoices.set(key, (monthlyPaidInvoices.get(key) ?? 0) + 1);
    if (amount <= 0) continue;
    total += amount;
    monthlyRevenue.set(key, (monthlyRevenue.get(key) ?? 0) + amount);
  }

  for (const invoice of paidInPrevious) {
    const amount = (invoice.amount_paid ?? 0) / 100;
    if (amount <= 0) continue;
    previousTotal += amount;
  }

  const paidCreatedInRange = invoicesCreatedInRange.filter(
    (invoice) => invoice.status === "paid",
  ).length;

  const recent = paidInRange
    .sort((a, b) => invoicePaidAtUnix(b) - invoicePaidAtUnix(a))
    .slice(0, 6)
    .map((invoice) => {
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
        date: formatDateTime(new Date(invoicePaidAtUnix(invoice) * 1000)),
      };
    });

  const roundedTotal = Math.round(total * 100) / 100;

  return {
    total: roundedTotal,
    previousTotal: Math.round(previousTotal * 100) / 100,
    paidInvoices: paidInRange.length,
    averageInvoiceValue:
      paidInRange.length > 0 ? Math.round((total / paidInRange.length) * 100) / 100 : 0,
    collectionRatePct:
      invoicesCreatedInRange.length > 0
        ? Math.round((paidCreatedInRange / invoicesCreatedInRange.length) * 1000) / 10
        : 0,
    bestMonthRevenue: Math.max(...Array.from(monthlyRevenue.values()), 0),
    chart: buildMonthlyChartFromMaps(range, monthlyRevenue, monthlyPaidInvoices),
    countInRange: paidInRange.length,
    countInPrevious: paidInPrevious.length,
    totalPaidAmountInRange: roundedTotal,
    recent,
  };
}

async function loadSucceededChargesInRange(range: DashboardDateRange) {
  const stripe = getStripeServer();
  if (!stripe) {
    return { amount: 0, count: 0 };
  }

  const charges = await listAllStripeCharges(stripe);
  let amount = 0;
  let count = 0;

  for (const charge of charges) {
    if (charge.status !== "succeeded") continue;
    if (!inRangeFromUnix(charge.created, range)) continue;
    const chargeAmount = (charge.amount ?? 0) / 100;
    if (chargeAmount <= 0) continue;
    count += 1;
    amount += chargeAmount;
  }

  return {
    amount: Math.round(amount * 100) / 100,
    count,
  };
}

function formatDashboardRangeLabel(range: DashboardDateRange): string {
  const from = range.from.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const to = range.to.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${from} – ${to}`;
}

function buildRevenueReconciliation(
  range: DashboardDateRange,
  invoiceMetrics: Awaited<ReturnType<typeof loadPaidInvoiceMetrics>>,
  chargesInRange: Awaited<ReturnType<typeof loadSucceededChargesInRange>>,
): DashboardOverview["revenueReconciliation"] {
  const chartSeriesTotal = Math.round(
    invoiceMetrics.chart.reduce((sum, point) => sum + point.value, 0) * 100,
  ) / 100;
  const totalsAligned = invoiceMetrics.total === invoiceMetrics.totalPaidAmountInRange
    && invoiceMetrics.total === chartSeriesTotal;
  const amountsAligned = invoiceMetrics.total === chargesInRange.amount;

  const summary = totalsAligned
    ? "Dashboard revenue figures use one Stripe source: paid invoices by payment date in the selected range."
    : "Review the reconciliation details below—figures should align when Stripe data is complete.";

  const detailPoints = [
    "Total Revenue (top KPI), the revenue chart, and Paid Invoices in this section all use paid Stripe invoices where the payment date falls inside your selected range.",
    `Invoice revenue in range: ${formatCurrency(invoiceMetrics.total)} across ${invoiceMetrics.paidInvoices} paid invoice(s). Chart bars sum to ${formatCurrency(chartSeriesTotal)} (monthly buckets use the same payment dates).`,
    `Transactions page comparison: succeeded Stripe charges with a charge date in this range total ${formatCurrency(chargesInRange.amount)} (${chargesInRange.count} charge(s)). This can differ from invoice revenue when partial payments, refunds, retries, or non-invoice charges occur.`,
    "Trend percentages compare the current range to the immediately preceding period of equal length (not calendar month-over-month).",
    "MRR and subscriber metrics on other admin pages come from Firestore subscriptions, not from this Stripe revenue total.",
  ];

  return {
    rangeLabel: formatDashboardRangeLabel(range),
    invoiceRevenue: invoiceMetrics.total,
    displayInvoiceRevenue: formatCurrency(invoiceMetrics.total),
    paidInvoiceCount: invoiceMetrics.paidInvoices,
    chartSeriesTotal,
    displayChartSeriesTotal: formatCurrency(chartSeriesTotal),
    totalsAligned,
    transactionsSucceededAmount: chargesInRange.amount,
    displayTransactionsSucceededAmount: formatCurrency(chargesInRange.amount),
    transactionsSucceededCount: chargesInRange.count,
    amountsAligned,
    summary,
    detailPoints,
  };
}

function buildEmptyMonthlyChart(
  range: DashboardDateRange,
): Array<{ label: string; value: number; invoiceCount: number }> {
  return buildMonthlyChartFromMaps(range, new Map(), new Map());
}

function buildMonthlyChartFromMaps(
  range: DashboardDateRange,
  monthlyRevenue: Map<string, number>,
  monthlyInvoices: Map<string, number>,
) {
  const labels = monthlyRangeLabels(range);
  return labels.map(({ key, label }) => ({
    label,
    value: Math.round((monthlyRevenue.get(key) ?? 0) * 100) / 100,
    invoiceCount: monthlyInvoices.get(key) ?? 0,
  }));
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
    invoiceMetrics,
    chargesInRange,
    subscriberData,
    failedPaymentsData,
  ] =
    await Promise.all([
      loadPaidInvoiceMetrics(range),
      loadSucceededChargesInRange(range),
      loadSubscriberData(range),
      loadFailedPayments(range),
    ]);

  const revenueReconciliation = buildRevenueReconciliation(
    range,
    invoiceMetrics,
    chargesInRange,
  );

  const paidInvoiceTrend = formatTrend(
    invoiceMetrics.countInRange,
    invoiceMetrics.countInPrevious,
  );
  const revenueTrend = formatTrend(invoiceMetrics.total, invoiceMetrics.previousTotal);
  const failedPaymentsTrend = formatTrend(failedPaymentsData.total, failedPaymentsData.previousTotal);

  return {
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    },
    kpis: {
      totalRevenue: {
        value: invoiceMetrics.total,
        displayValue: formatCurrency(invoiceMetrics.total),
        trendLabel: revenueTrend.label,
        trendPositive: revenueTrend.positive,
      },
      paidInvoices: {
        value: invoiceMetrics.countInRange,
        displayValue: formatCount(invoiceMetrics.countInRange),
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
      total: invoiceMetrics.total,
      displayTotal: formatCurrency(invoiceMetrics.total),
      trendLabel: revenueTrend.label,
      trendPositive: revenueTrend.positive,
      paidInvoices: invoiceMetrics.paidInvoices,
      averageInvoiceValue: invoiceMetrics.averageInvoiceValue,
      displayAverageInvoiceValue: formatCurrency(invoiceMetrics.averageInvoiceValue),
      collectionRatePct: invoiceMetrics.collectionRatePct,
      bestMonthRevenue: invoiceMetrics.bestMonthRevenue,
      displayBestMonthRevenue: formatCurrency(invoiceMetrics.bestMonthRevenue),
      chart: invoiceMetrics.chart,
    },
    invoices: {
      totalPaidCount: invoiceMetrics.countInRange,
      totalPaidAmount: invoiceMetrics.totalPaidAmountInRange,
      displayTotalPaidAmount: formatCurrency(invoiceMetrics.totalPaidAmountInRange),
      recent: invoiceMetrics.recent,
    },
    revenueReconciliation,
    subscribers: subscriberData.subscribers,
    trialUsers: subscriberData.trialUsers,
    expiredTrialUsers: subscriberData.expiredTrialUsers,
    failedPayments: {
      total: failedPaymentsData.total,
      rows: failedPaymentsData.rows,
    },
  };
}
