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

export interface AdminCompanyDetailsPayload {
  companyName?: string;
  contactName?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  website?: string;
  vat?: string;
  telephone?: string;
  telephoneCountryCode?: string;
  timezone?: string;
}

interface UpdateCustomerBody extends AdminCompanyDetailsPayload {
  status?: CustomerUiStatus;
  plan?: "Professional" | "Starter";
}

function mapStripeCompanyToDetails(data: Record<string, unknown>) {
  const countryCode = data["Telephone Country Code"];
  const countryCodeString = Array.isArray(countryCode)
    ? String(countryCode[0] ?? "")
    : countryCode != null
      ? String(countryCode)
      : "";

  return {
    companyName: (typeof data["Company Name"] === "string" && data["Company Name"]) || "",
    email: (typeof data["Email"] === "string" && data["Email"]) || "",
    address: (typeof data["Street Address"] === "string" && data["Street Address"]) || "",
    city: (typeof data["City"] === "string" && data["City"]) || "",
    state: (typeof data["State"] === "string" && data["State"]) || "",
    zipCode: (typeof data["Zip"] === "string" && data["Zip"]) || "",
    country: (typeof data["Country"] === "string" && data["Country"]) || "",
    website: (typeof data["Website"] === "string" && data["Website"]) || "",
    vat: data["VAT"] != null ? String(data["VAT"]) : "",
    telephone: (typeof data["Telephone"] === "string" && data["Telephone"]) || "",
    telephoneCountryCode: countryCodeString,
    timezone: (typeof data["Time Zone"] === "string" && data["Time Zone"]) || "",
  };
}

function buildStripeCompanyUpdates(body: UpdateCustomerBody): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (typeof body.companyName === "string") {
    updates["Company Name"] = body.companyName.trim();
  }
  if (typeof body.email === "string") {
    updates["Email"] = body.email.trim();
  }
  if (typeof body.address === "string") {
    updates["Street Address"] = body.address.trim();
  }
  if (typeof body.city === "string") {
    updates["City"] = body.city.trim();
  }
  if (typeof body.state === "string") {
    updates["State"] = body.state.trim();
  }
  if (typeof body.zipCode === "string") {
    updates["Zip"] = body.zipCode.trim();
  }
  if (typeof body.country === "string") {
    updates["Country"] = body.country.trim();
  }
  if (typeof body.website === "string") {
    updates["Website"] = body.website.trim();
  }
  if (typeof body.vat === "string") {
    const trimmed = body.vat.trim();
    updates["VAT"] = trimmed ? Number.parseFloat(trimmed) : null;
  }
  if (typeof body.telephone === "string") {
    updates["Telephone"] = body.telephone.trim();
  }
  if (typeof body.telephoneCountryCode === "string") {
    updates["Telephone Country Code"] = body.telephoneCountryCode.trim();
  }
  if (typeof body.timezone === "string") {
    updates["Time Zone"] = body.timezone.trim();
  }
  return updates;
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

    const [subscriptionsSnap, paymentMethodsSnap, adsAccountsSnap, stripeCompanySnap] =
      await Promise.all([
      db.collection(COLLECTIONS.SUBSCRIPTIONS)
        .where("User", "==", companyAdminRef)
        .limit(1)
        .get(),
      db.collection("paymentMethods").where("User", "==", companyAdminRef).limit(1).get(),
      db.collection(COLLECTIONS.ADS_ACCOUNTS)
        .where("User", "==", companyAdminRef)
        .where("Is Connected", "==", true)
        .get(),
      db.collection(COLLECTIONS.STRIPE_COMPANIES)
        .where("User", "==", companyAdminRef)
        .limit(1)
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

    const stripeCompanyData = stripeCompanySnap.empty
      ? ({} as Record<string, unknown>)
      : ((stripeCompanySnap.docs[0]?.data() ?? {}) as Record<string, unknown>);
    const companyDetails = mapStripeCompanyToDetails(stripeCompanyData);
    const companyName =
      companyDetails.companyName ||
      (typeof userData["Company Name"] === "string" && userData["Company Name"]) ||
      (typeof userData["Name"] === "string" && userData["Name"]) ||
      "Unknown Company";
    const contactName =
      (typeof userData["Name"] === "string" && userData["Name"]) || "Unknown Contact";
    const email =
      companyDetails.email ||
      (typeof userData["Email"] === "string" && userData["Email"]) ||
      (typeof userData.email === "string" && userData.email) ||
      "unknown@example.com";
    const phone =
      companyDetails.telephone ||
      (typeof userData["Telephone"] === "string" && userData["Telephone"]) ||
      null;

    return NextResponse.json({
      customer: {
        id: userSnap.id,
        companyName,
        contactName,
        email,
        phone,
        companyDetails: {
          ...companyDetails,
          companyName: companyName,
          contactName,
          email,
        },
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

    const userData = (userSnap.data() ?? {}) as Record<string, unknown>;
    const companyAdminRef =
      userData["Company Admin"] instanceof admin.firestore.DocumentReference
        ? userData["Company Admin"]
        : userRef;

    const userUpdate: Record<string, unknown> = {
      modified_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (typeof body.companyName === "string" && body.companyName.trim()) {
      userUpdate["Company Name"] = body.companyName.trim();
    }
    if (typeof body.contactName === "string" && body.contactName.trim()) {
      userUpdate["Name"] = body.contactName.trim();
    }
    if (typeof body.email === "string" && body.email.trim()) {
      userUpdate["Email"] = body.email.trim();
    }
    if (typeof body.telephone === "string") {
      userUpdate["Telephone"] = body.telephone.trim();
    }
    await userRef.update(userUpdate);

    const stripeUpdates = buildStripeCompanyUpdates(body);
    if (Object.keys(stripeUpdates).length > 0) {
      const stripeCompanySnap = await db
        .collection(COLLECTIONS.STRIPE_COMPANIES)
        .where("User", "==", companyAdminRef)
        .limit(1)
        .get();

      if (stripeCompanySnap.empty) {
        await db.collection(COLLECTIONS.STRIPE_COMPANIES).add({
          User: companyAdminRef,
          ...stripeUpdates,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          modified_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await stripeCompanySnap.docs[0]!.ref.update({
          ...stripeUpdates,
          modified_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

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
