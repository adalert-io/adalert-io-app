import { NextRequest, NextResponse } from "next/server";

import { COLLECTIONS } from "@/lib/constants";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { getStripeServer } from "@/lib/stripe/get-stripe-server";

const ADMIN_PREVIEW_COOKIE = "admin_preview_gate";

function ensureAdminAccess(request: NextRequest): NextResponse | null {
  if (request.cookies.get(ADMIN_PREVIEW_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function monthLabel(value: number): string {
  return new Date(value * 1000).toLocaleDateString("en-US", { month: "short" });
}

export async function GET(request: NextRequest) {
  const denied = ensureAdminAccess(request);
  if (denied) return denied;

  try {
    const stripe = getStripeServer();
    const db = getAdminFirestore();

    const subscriptionsSnap = await db.collection(COLLECTIONS.SUBSCRIPTIONS).get();
    const plans = { starter: 0, professional: 0 };

    for (const doc of subscriptionsSnap.docs) {
      const rawPlan = String(doc.data()["Subscription Plan"] ?? "").toLowerCase();
      if (rawPlan.includes("starter")) {
        plans.starter += 1;
      } else {
        plans.professional += 1;
      }
    }

    if (!stripe) {
      return NextResponse.json({
        metrics: {
          totalRevenue: 0,
          paid: 0,
          pending: 0,
          pastDue: 0,
          refunded: 0,
        },
        revenueTrend: [],
        breakdown: [],
        planMix: [
          { name: "Professional", pct: 0 },
          { name: "Starter", pct: 0 },
        ],
      });
    }

    const [invoiceList, refundList] = await Promise.all([
      stripe.invoices.list({ limit: 100 }),
      stripe.refunds.list({ limit: 100 }),
    ]);

    let totalRevenue = 0;
    let paid = 0;
    let pending = 0;
    let pastDue = 0;
    const monthly = new Map<string, number>();

    for (const invoice of invoiceList.data) {
      const amount = (invoice.amount_paid || invoice.amount_due || 0) / 100;
      totalRevenue += amount;
      if (invoice.status === "paid") paid += amount;
      if (invoice.status === "open" || invoice.status === "draft") pending += amount;
      if (invoice.status === "uncollectible") pastDue += amount;

      const month = monthLabel(invoice.created);
      monthly.set(month, (monthly.get(month) ?? 0) + amount);
    }

    const refunded = refundList.data.reduce((sum, refund) => {
      return sum + (refund.amount || 0) / 100;
    }, 0);

    const revenueTrend = Array.from(monthly.entries()).map(([label, value]) => ({
      label,
      value: Math.round(value),
    }));

    const totalPlanCount = Math.max(1, plans.starter + plans.professional);
    const planMix = [
      {
        name: "Professional",
        pct: Math.round((plans.professional / totalPlanCount) * 100),
      },
      {
        name: "Starter",
        pct: Math.round((plans.starter / totalPlanCount) * 100),
      },
    ];

    return NextResponse.json({
      metrics: {
        totalRevenue: Math.round(totalRevenue),
        paid: Math.round(paid),
        pending: Math.round(pending),
        pastDue: Math.round(pastDue),
        refunded: Math.round(refunded),
      },
      revenueTrend,
      breakdown: [
        { key: "paid", name: "Paid", amount: Math.round(paid) },
        { key: "pending", name: "Pending", amount: Math.round(pending) },
        { key: "past_due", name: "Past Due", amount: Math.round(pastDue) },
        { key: "refunded", name: "Refunded", amount: Math.round(refunded) },
      ],
      planMix,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load payments overview" },
      { status: 500 },
    );
  }
}
