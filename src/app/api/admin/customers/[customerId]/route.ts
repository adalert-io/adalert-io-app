import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

import { COLLECTIONS } from "@/lib/constants";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { formatAccountNumber } from "@/lib/utils";

import {
  ADMIN_PREVIEW_COOKIE,
  formatDateLabel,
  subscriptionToUiStatus,
  uiStatusToSubscriptionStatus,
  type CustomerUiStatus,
} from "../_lib";

interface UpdateCustomerBody {
  companyName?: string;
  contactName?: string;
  status?: CustomerUiStatus;
  plan?: "Professional" | "Starter";
}

function ensureAdminAccess(request: NextRequest): NextResponse | null {
  if (request.cookies.get(ADMIN_PREVIEW_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function isSelectedForUser({
  selectedUsers,
  userId,
}: {
  selectedUsers: unknown;
  userId: string;
}): boolean {
  if (!Array.isArray(selectedUsers)) return false;
  return selectedUsers.some((value) => {
    if (value instanceof admin.firestore.DocumentReference) {
      return value.id === userId;
    }
    return false;
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
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const userData = (userSnap.data() ?? {}) as Record<string, unknown>;
    const companyAdminRef =
      userData["Company Admin"] instanceof admin.firestore.DocumentReference
        ? userData["Company Admin"]
        : userRef;
    const userType = typeof userData["User Type"] === "string" ? userData["User Type"] : "";
    const isAdminUser = userType === "Admin" || companyAdminRef.id === userRef.id;

    const [subscriptionsSnap, paymentMethodsSnap, adsAccountsSnap] = await Promise.all([
      db.collection(COLLECTIONS.SUBSCRIPTIONS)
        .where("User", "==", companyAdminRef)
        .limit(1)
        .get(),
      db.collection("paymentMethods").where("User", "==", companyAdminRef).limit(1).get(),
      db.collection(COLLECTIONS.ADS_ACCOUNTS)
        .where("User", "==", companyAdminRef)
        .where("Is Connected", "==", true)
        .get(),
    ]);

    const subscription = subscriptionsSnap.empty
      ? null
      : ((subscriptionsSnap.docs[0]?.data() ?? {}) as Record<string, unknown>);
    const paymentMethod = paymentMethodsSnap.empty
      ? null
      : ((paymentMethodsSnap.docs[0]?.data() ?? {}) as Record<string, unknown>);
    const adAccounts = adsAccountsSnap.docs
      .filter((doc) => {
        if (isAdminUser) return true;
        const data = (doc.data() ?? {}) as Record<string, unknown>;
        return isSelectedForUser({
          selectedUsers: data["Selected Users"],
          userId: userRef.id,
        });
      })
      .map((doc) => {
        const data = (doc.data() ?? {}) as Record<string, unknown>;
        const consumerLikeNameCandidates = [
          data["Account Name Editable"],
          data["Account Name Original"],
          data["Account Name"],
          data["Ads Account Name"],
          data["Google Ads Account Name"],
          data["Name"],
          data["Display Name"],
        ];
        const name = consumerLikeNameCandidates.find(
          (value) => typeof value === "string" && value.trim().length > 0,
        );
        if (typeof name === "string" && name.trim()) return name.trim();
        const accountId =
          typeof data["Id"] === "string" && data["Id"].trim()
            ? data["Id"].trim()
            : null;
        if (accountId) return formatAccountNumber(accountId);
        return doc.id;
      })
      .filter((item, index, list) => list.indexOf(item) === index);

    return NextResponse.json({
      customer: {
        id: userSnap.id,
        companyName:
          (typeof userData["Company Name"] === "string" && userData["Company Name"]) ||
          (typeof userData["Name"] === "string" && userData["Name"]) ||
          "Unknown Company",
        contactName:
          (typeof userData["Name"] === "string" && userData["Name"]) || "Unknown Contact",
        email:
          (typeof userData["Email"] === "string" && userData["Email"]) ||
          (typeof userData.email === "string" && userData.email) ||
          "unknown@example.com",
        phone:
          (typeof userData["Telephone"] === "string" && userData["Telephone"]) || null,
        adAccounts,
        adAccountsCount: adAccounts.length,
        status: subscriptionToUiStatus(subscription?.["User Status"]),
        billingSnapshot: {
          plan:
            (typeof subscription?.["Subscription Plan"] === "string" &&
              subscription?.["Subscription Plan"]) ||
            "Starter",
          subscriptionStatus:
            (typeof subscription?.["User Status"] === "string" && subscription?.["User Status"]) ||
            "Unknown",
          nextBillingDate: formatDateLabel(subscription?.["Next Billing Date"]),
          monthlyRecurringRevenue:
            (typeof subscription?.["Monthly Recurring Revenue"] === "number" &&
              subscription?.["Monthly Recurring Revenue"]) ||
            0,
          cardBrand:
            (typeof paymentMethod?.["Stripe Card Brand"] === "string" &&
              paymentMethod?.["Stripe Card Brand"]) ||
            null,
          cardLast4:
            (typeof paymentMethod?.["Stripe Last 4 Digits"] === "string" &&
              paymentMethod?.["Stripe Last 4 Digits"]) ||
            null,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load customer details" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ customerId: string }> },
) {
  const denied = ensureAdminAccess(request);
  if (denied) return denied;

  try {
    const { customerId } = await context.params;
    const body = (await request.json()) as UpdateCustomerBody;
    const db = getAdminFirestore();
    const userRef = db.collection(COLLECTIONS.USERS).doc(customerId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const userUpdate: Record<string, unknown> = {
      modified_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (typeof body.companyName === "string" && body.companyName.trim()) {
      userUpdate["Company Name"] = body.companyName.trim();
    }
    if (typeof body.contactName === "string" && body.contactName.trim()) {
      userUpdate["Name"] = body.contactName.trim();
    }
    await userRef.update(userUpdate);

    const subSnap = await db
      .collection(COLLECTIONS.SUBSCRIPTIONS)
      .where("User", "==", userRef)
      .limit(1)
      .get();
    if (!subSnap.empty) {
      const subRef = subSnap.docs[0]!.ref;
      const subUpdate: Record<string, unknown> = {
        modified_at: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (body.status) {
        subUpdate["User Status"] = uiStatusToSubscriptionStatus(body.status);
      }
      if (body.plan) {
        subUpdate["Subscription Plan"] = body.plan;
      }
      await subRef.update(subUpdate);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to update customer" },
      { status: 500 },
    );
  }
}
