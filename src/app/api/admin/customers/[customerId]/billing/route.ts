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

function formatUnixDate(unix: number | null | undefined): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

    const [subscriptionSnap, stripeCompanySnap] = await Promise.all([
      db.collection(COLLECTIONS.SUBSCRIPTIONS).where("User", "==", userRef).limit(1).get(),
      db.collection(COLLECTIONS.STRIPE_COMPANIES).where("User", "==", userRef).limit(1).get(),
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

    const [customer, invoices, paymentMethods] = await Promise.all([
      stripe.customers.retrieve(stripeCustomerId, {
        expand: ["invoice_settings.default_payment_method"],
      }),
      stripe.invoices.list({ customer: stripeCustomerId, limit: 5 }),
      stripe.paymentMethods.list({ customer: stripeCustomerId, type: "card", limit: 1 }),
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

    const nextInvoice = invoices.data.find(
      (invoice) => invoice.status === "open" || invoice.status === "draft",
    );

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
        nextBillingDate: nextInvoice ? formatUnixDate(nextInvoice.created) : "—",
        monthlyRecurringRevenue:
          typeof subscriptionData["Monthly Recurring Revenue"] === "number"
            ? subscriptionData["Monthly Recurring Revenue"]
            : 0,
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
