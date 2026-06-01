import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

import {
  ADMIN_PREVIEW_COOKIE,
  formatDateLabel,
  loadCustomersList,
  subscriptionToUiStatus,
  type CustomerUiStatus,
} from "@/app/api/admin/customers/_lib";
import { COLLECTIONS } from "@/lib/constants";
import { getAdminFirestore } from "@/lib/firebase/admin";

function ensureAdminAccess(request: NextRequest): NextResponse | null {
  if (request.cookies.get(ADMIN_PREVIEW_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

type SubscriptionUiStatus = "active" | "trial" | "paused" | "past_due" | "canceled";
type SubscriptionPlanKey = "professional" | "starter" | "trial";

function mapUiStatus(status: CustomerUiStatus): SubscriptionUiStatus {
  if (status === "active") return "active";
  if (status === "trial") return "trial";
  if (status === "past_due") return "past_due";
  if (status === "paused") return "paused";
  return "canceled";
}

function mapPlanKey(plan: string, status: SubscriptionUiStatus): SubscriptionPlanKey {
  if (status === "trial") return "trial";
  if (plan.toLowerCase().includes("starter")) return "starter";
  return "professional";
}

export async function GET(request: NextRequest) {
  const denied = ensureAdminAccess(request);
  if (denied) return denied;

  try {
    const { rows } = await loadCustomersList();
    const db = getAdminFirestore();

    const [subscriptionsSnap, paymentMethodsSnap] = await Promise.all([
      db.collection(COLLECTIONS.SUBSCRIPTIONS).get(),
      db.collection("paymentMethods").get(),
    ]);

    const subscriptionByUserId = new Map<string, Record<string, unknown>>();
    subscriptionsSnap.forEach((doc) => {
      const data = (doc.data() ?? {}) as Record<string, unknown>;
      const userRef = data["User"];
      if (userRef instanceof admin.firestore.DocumentReference) {
        subscriptionByUserId.set(userRef.id, {
          ...data,
          _docId: doc.id,
        });
      }
    });

    const paymentMethodByUserId = new Map<string, Record<string, unknown>>();
    paymentMethodsSnap.forEach((doc) => {
      const data = (doc.data() ?? {}) as Record<string, unknown>;
      const userRef = data["User"];
      if (userRef instanceof admin.firestore.DocumentReference) {
        paymentMethodByUserId.set(userRef.id, data);
      }
    });

    const subscriptions = rows
      .map((row, index) => {
        const sub = subscriptionByUserId.get(row.id);
        const pm = paymentMethodByUserId.get(row.id);
        const rawStatus = subscriptionToUiStatus(sub?.["User Status"]);
        const status = mapUiStatus(rawStatus);
        const planKey = mapPlanKey(row.plan, status);

        const stripeSubscriptionId =
          (typeof sub?.["Stripe Subscription Id"] === "string" &&
            sub["Stripe Subscription Id"]) ||
          (typeof sub?._docId === "string" && sub._docId) ||
          "—";

        return {
          id: row.id,
          companyName: row.companyName,
          email: row.email,
          initials: row.initials,
          avatarToneIndex: index % 5,
          planKey,
          status,
          nextBillingLabel: row.nextBillingLabel,
          mrr: row.mrr,
          adAccounts: row.adAccounts,
          subscriptionId: stripeSubscriptionId,
          customerSinceLabel: formatDateLabel(
            sub?.["Created Date"] ?? sub?.createdAt,
          ),
          cardLast4:
            (typeof pm?.["Stripe Last 4 Digits"] === "string" &&
              pm["Stripe Last 4 Digits"]) ||
            "—",
          cardBrand:
            (typeof pm?.["Stripe Card Brand"] === "string" && pm["Stripe Card Brand"]) ||
            null,
          billingHistory: [] as Array<{ dateLabel: string; amountLabel: string }>,
        };
      });

    const metrics = {
      total: subscriptions.length,
      active: subscriptions.filter((row) => row.status === "active").length,
      trial: subscriptions.filter((row) => row.status === "trial").length,
      canceled: subscriptions.filter(
        (row) => row.status === "canceled" || row.status === "paused",
      ).length,
      mrr: subscriptions.reduce((sum, row) => sum + row.mrr, 0),
    };

    return NextResponse.json({ subscriptions, metrics });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load subscriptions" },
      { status: 500 },
    );
  }
}
