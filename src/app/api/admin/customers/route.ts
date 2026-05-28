import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

import { COLLECTIONS, USER_TYPES } from "@/lib/constants";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";

import {
  ADMIN_PREVIEW_COOKIE,
  loadCustomersList,
  subscriptionToUiStatus,
  uiStatusToSubscriptionStatus,
  type CustomerUiStatus,
} from "./_lib";

interface CreateCustomerBody {
  companyName?: string;
  email?: string;
  contactName?: string;
  plan?: "Professional" | "Starter";
  status?: CustomerUiStatus;
}

function ensureAdminAccess(request: NextRequest): NextResponse | null {
  if (request.cookies.get(ADMIN_PREVIEW_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function randomPassword(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `AdAlert!${random}9`;
}

export async function GET(request: NextRequest) {
  const denied = ensureAdminAccess(request);
  if (denied) return denied;

  try {
    const { rows, metrics } = await loadCustomersList();
    return NextResponse.json({ customers: rows, metrics });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load customers" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const denied = ensureAdminAccess(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as CreateCustomerBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    const companyName = body.companyName?.trim() ?? "";
    const contactName = body.contactName?.trim() || companyName;
    const status = body.status ?? "trial";

    if (!email || !companyName) {
      return NextResponse.json(
        { error: "companyName and email are required" },
        { status: 400 },
      );
    }

    const password = randomPassword();
    const auth = getAdminAuth();
    const created = await auth.createUser({
      email,
      password,
      displayName: contactName,
      emailVerified: false,
      disabled: false,
    });

    const db = getAdminFirestore();
    const userRef = db.collection(COLLECTIONS.USERS).doc(created.uid);
    await userRef.set({
      "Company Admin": userRef,
      "Is Google Sign Up": false,
      "Name": companyName,
      "User Access": "All ad accounts",
      "Avatar": null,
      "User Type": USER_TYPES.ADMIN,
      "Email": email,
      email,
      uid: created.uid,
      "Telephone": null,
      "Company Name": companyName,
      modified_at: admin.firestore.FieldValue.serverTimestamp(),
      "Opt In For Text Message": false,
    });

    const subscriptionRef = db.collection(COLLECTIONS.SUBSCRIPTIONS).doc(created.uid);
    await subscriptionRef.set({
      User: userRef,
      "User Status": uiStatusToSubscriptionStatus(status),
      "Subscription Plan": body.plan ?? "Starter",
      "Free Trial Start Date": admin.firestore.FieldValue.serverTimestamp(),
      "Next Billing Date": null,
      modified_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      {
        customer: {
          id: created.uid,
          companyName,
          email,
          status: subscriptionToUiStatus(uiStatusToSubscriptionStatus(status)),
          plan: body.plan ?? "Starter",
          tempPassword: password,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to create customer" },
      { status: 500 },
    );
  }
}
