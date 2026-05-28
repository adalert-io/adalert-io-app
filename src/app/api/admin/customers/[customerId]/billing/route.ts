import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

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

function formatUnixDate(unix: number | null | undefined): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toMonthlyAmount(amount: number, interval: string | null | undefined): number {
  if (!interval || interval === "month") return amount;
  if (interval === "year") return amount / 12;
  if (interval === "week") return amount * 4.345;
  if (interval === "day") return amount * 30;
  return amount;
}

function getSubscriptionPeriodEnd(subscription: unknown): number | null {
  if (!subscription || typeof subscription !== "object") return null;
  const candidate = (subscription as Record<string, unknown>)["current_period_end"];
  return typeof candidate === "number" ? candidate : null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ customerId: string }> },
) {
  const denied = ensureAdminAccess(request);
  if (denied) return denied;

  try {
    const { customerId } = await context.params;
    const db = getAdminFirestore();
    const userRef = db.collection(COLLECTIONS.USERS).doc(customerId);
    const userSnap = await userRef.get();
    const userData = (userSnap.data() ?? {}) as Record<string, unknown>;
    const billingOwnerRef =
      userData["Company Admin"] instanceof admin.firestore.DocumentReference
        ? userData["Company Admin"]
        : userRef;

    const [subscriptionSnap, stripeCompanySnap] = await Promise.all([
      db.collection(COLLECTIONS.SUBSCRIPTIONS).where("User", "==", billingOwnerRef).limit(1).get(),
      db.collection(COLLECTIONS.STRIPE_COMPANIES).where("User", "==", billingOwnerRef).limit(1).get(),
    ]);

    const subscriptionData = subscriptionSnap.empty
      ? ({} as Record<string, unknown>)
      : ((subscriptionSnap.docs[0]?.data() ?? {}) as Record<string, unknown>);
    const stripeCompanyData = stripeCompanySnap.empty
      ? ({} as Record<string, unknown>)
      : ((stripeCompanySnap.docs[0]?.data() ?? {}) as Record<string, unknown>);

    const stripeCustomerId =
      (typeof stripeCompanyData["Stripe Customer Id"] === "string" &&
        stripeCompanyData["Stripe Customer Id"]) ||
      null;

    const stripe = getStripeServer();
    if (!stripe || !stripeCustomerId) {
      return NextResponse.json({
        billing: {
          stripeCustomerId,
          plan:
            (typeof subscriptionData["Subscription Plan"] === "string" &&
              subscriptionData["Subscription Plan"]) ||
            "Starter",
          subscriptionStatus:
            (typeof subscriptionData["User Status"] === "string" &&
              subscriptionData["User Status"]) ||
            "Unknown",
          nextBillingDate: "—",
          monthlyRecurringRevenue:
            typeof subscriptionData["Monthly Recurring Revenue"] === "number"
              ? subscriptionData["Monthly Recurring Revenue"]
              : 0,
          paymentMethod: null,
          invoices: [],
        },
      });
    }

    const [customer, invoices, paymentMethods, subscriptions] = await Promise.all([
      stripe.customers.retrieve(stripeCustomerId, {
        expand: ["invoice_settings.default_payment_method"],
      }),
      stripe.invoices.list({ customer: stripeCustomerId, limit: 5 }),
      stripe.paymentMethods.list({ customer: stripeCustomerId, type: "card", limit: 1 }),
      stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "all",
        limit: 10,
        expand: ["data.items.data.price"],
      }),
    ]);

    const defaultPm = (customer as { invoice_settings?: { default_payment_method?: unknown } })
      ?.invoice_settings?.default_payment_method as
      | { card?: { brand?: string; last4?: string } }
      | undefined;
    const fallbackPm = paymentMethods.data[0];
    const cardBrand = defaultPm?.card?.brand ?? fallbackPm?.card?.brand ?? null;
    const cardLast4 = defaultPm?.card?.last4 ?? fallbackPm?.card?.last4 ?? null;

    const invoiceRows = invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number ?? invoice.id,
      status: invoice.status ?? "unknown",
      amount: (invoice.amount_paid || invoice.amount_due || 0) / 100,
      createdAt: formatUnixDate(invoice.created),
    }));

    const activeSubscription = subscriptions.data.find((subscription) =>
      ["active", "trialing", "past_due", "unpaid"].includes(subscription.status),
    );

    const derivedMrr = activeSubscription
      ? activeSubscription.items.data.reduce((sum, item) => {
          const unitAmount = (item.price?.unit_amount ?? 0) / 100;
          const quantity = item.quantity ?? 1;
          const interval = item.price?.recurring?.interval ?? null;
          const lineTotal = unitAmount * quantity;
          return sum + toMonthlyAmount(lineTotal, interval);
        }, 0)
      : null;

    const storedMrr = toNumber(subscriptionData["Monthly Recurring Revenue"]);
    const monthlyRecurringRevenue = storedMrr && storedMrr > 0 ? storedMrr : derivedMrr ?? 0;

    return NextResponse.json({
      billing: {
        stripeCustomerId,
        plan:
          (typeof subscriptionData["Subscription Plan"] === "string" &&
            subscriptionData["Subscription Plan"]) ||
          "Starter",
        subscriptionStatus:
          (typeof subscriptionData["User Status"] === "string" &&
            subscriptionData["User Status"]) ||
          "Unknown",
        nextBillingDate: formatUnixDate(getSubscriptionPeriodEnd(activeSubscription)),
        monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue * 100) / 100,
        paymentMethod:
          cardBrand || cardLast4
            ? {
                brand: cardBrand,
                last4: cardLast4,
              }
            : null,
        invoices: invoiceRows,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load billing details" },
      { status: 500 },
    );
  }
}
