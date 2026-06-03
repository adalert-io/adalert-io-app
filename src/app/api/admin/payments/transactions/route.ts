import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { parseDashboardRange } from "@/app/api/admin/dashboard/_lib";
import { getStripeServer } from "@/lib/stripe/get-stripe-server";

const ADMIN_PREVIEW_COOKIE = "admin_preview_gate";

function ensureAdminAccess(request: NextRequest): NextResponse | null {
  if (request.cookies.get(ADMIN_PREVIEW_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function formatDateTime(unix: number): string {
  return new Date(unix * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeMethod(value: string): string {
  const raw = value.toLowerCase();
  if (raw.includes("master")) return "mastercard";
  if (raw.includes("amex") || raw.includes("american")) return "amex";
  if (raw.includes("ach") || raw.includes("bank")) return "ach";
  return "visa";
}

function normalizeStatus(
  status: string,
): "succeeded" | "pending" | "failed" {
  if (status === "succeeded") return "succeeded";
  if (status === "pending") return "pending";
  return "failed";
}

function invoiceLabel(invoice: unknown): string {
  if (!invoice) return "—";
  if (typeof invoice === "string") return invoice;
  if (typeof invoice === "object" && invoice !== null) {
    const record = invoice as { number?: string | null; id?: string };
    return record.number ?? record.id ?? "—";
  }
  return "—";
}

async function listAllCharges(stripe: Stripe) {
  const charges: Stripe.Charge[] = [];
  let startingAfter: string | undefined;

  while (true) {
    const page = await stripe.charges.list({
      limit: 100,
      expand: ["data.customer", "data.payment_method_details", "data.invoice"],
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    charges.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1]?.id;
  }

  return charges;
}

export async function GET(request: NextRequest) {
  const denied = ensureAdminAccess(request);
  if (denied) return denied;

  try {
    const stripe = getStripeServer();
    if (!stripe) {
      return NextResponse.json({
        transactions: [],
        metrics: {
          total: 0,
          succeeded: 0,
          pending: 0,
          failed: 0,
          totalAmount: 0,
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const hasRangeFilter =
      searchParams.has("from") || searchParams.has("to");
    const range = hasRangeFilter
      ? parseDashboardRange(searchParams.get("from"), searchParams.get("to"))
      : null;

    const charges = await listAllCharges(stripe);

    let succeeded = 0;
    let pending = 0;
    let failed = 0;
    let totalAmount = 0;

    const inRange = (unixSeconds: number) => {
      if (!range) return true;
      const at = unixSeconds * 1000;
      return at >= range.from.getTime() && at <= range.to.getTime();
    };

    const transactions = charges
      .filter((charge) => inRange(charge.created))
      .map((charge, index) => {
      const status = normalizeStatus(charge.status);
      const amount = (charge.amount || 0) / 100;
      if (status === "succeeded") {
        succeeded += 1;
        totalAmount += amount;
      } else if (status === "pending") {
        pending += 1;
      } else {
        failed += 1;
      }

      const customerObject = charge.customer as Stripe.Customer | null;
      const customerName =
        customerObject?.name?.trim() ||
        customerObject?.email?.trim() ||
        "Unknown Customer";
      const methodType = charge.payment_method_details?.type ?? "card";
      const brand =
        charge.payment_method_details?.card?.brand ??
        (methodType === "us_bank_account" ? "ach" : "visa");
      const last4 = charge.payment_method_details?.card?.last4 ?? "—";

      return {
        id: charge.id,
        transactionId: charge.id,
        invoiceNumber: invoiceLabel(
          (charge as Stripe.Charge & { invoice?: unknown }).invoice,
        ),
        companyName: customerName,
        initials: customerName
          .split(/\s+/)
          .filter(Boolean)
          .map((word) => word[0] ?? "")
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        avatarToneIndex: index % 5,
        dateTimeLabel: formatDateTime(charge.created),
        amount,
        method: normalizeMethod(brand),
        last4,
        status,
        description: charge.description || "Stripe charge",
        receiptUrl: charge.receipt_url ?? null,
        currency: charge.currency?.toUpperCase() ?? "USD",
      };
    });

    return NextResponse.json({
      transactions,
      metrics: {
        total: transactions.length,
        succeeded,
        pending,
        failed,
        totalAmount: Math.round(totalAmount * 100) / 100,
      },
      range: range
        ? { from: range.from.toISOString(), to: range.to.toISOString() }
        : null,
      revenueNote:
        "Total Amount sums succeeded Stripe charges by charge date. The admin dashboard Total Revenue uses paid Stripe invoices by payment date—the two can differ for refunds, retries, or non-invoice charges.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load transactions" },
      { status: 500 },
    );
  }
}
