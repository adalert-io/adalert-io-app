import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
  const denied = ensureAdminAccess(request);
  if (denied) return denied;

  try {
    const stripe = getStripeServer();
    if (!stripe) {
      return NextResponse.json({ transactions: [] });
    }

    const charges = await stripe.charges.list({
      limit: 100,
      expand: ["data.customer", "data.payment_method_details"],
    });

    const transactions = charges.data.map((charge) => {
      const customerObject = charge.customer as { name?: string } | null;
      const customerName = customerObject?.name?.trim() || "Unknown Customer";
      const methodType = charge.payment_method_details?.type ?? "card";
      const brand =
        charge.payment_method_details?.card?.brand ??
        (methodType === "us_bank_account" ? "ach" : "visa");
      const last4 = charge.payment_method_details?.card?.last4 ?? "—";

      return {
        id: charge.id,
        transactionId: charge.id,
        invoiceNumber: typeof charge.invoice === "string" ? charge.invoice : "—",
        companyName: customerName,
        initials: customerName
          .split(/\s+/)
          .filter(Boolean)
          .map((word) => word[0] ?? "")
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        avatarToneIndex: 0,
        dateTimeLabel: formatDateTime(charge.created),
        amount: (charge.amount || 0) / 100,
        method: brand,
        last4,
        status: charge.status === "succeeded" ? "succeeded" : charge.status === "pending" ? "pending" : "failed",
        description: charge.description || "Stripe charge",
      };
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load transactions" },
      { status: 500 },
    );
  }
}
