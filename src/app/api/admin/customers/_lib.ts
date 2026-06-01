import admin from "firebase-admin";

import { COLLECTIONS, SUBSCRIPTION_PRICES, SUBSCRIPTION_STATUS } from "@/lib/constants";
import { getAdminFirestore } from "@/lib/firebase/admin";

export const ADMIN_PREVIEW_COOKIE = "admin_preview_gate";

export type CustomerUiStatus =
  | "active"
  | "trial"
  | "past_due"
  | "paused"
  | "not_connected";

export interface CustomerListItem {
  id: string;
  companyName: string;
  email: string;
  initials: string;
  avatarKind: "initials" | "logo";
  avatarToneIndex: number;
  contacts: number;
  adAccounts: number;
  mrr: number;
  status: CustomerUiStatus;
  plan: "Professional" | "Starter";
  nextBillingLabel: string;
}

function asTimestamp(value: unknown): admin.firestore.Timestamp | null {
  if (value instanceof admin.firestore.Timestamp) return value;
  return null;
}

export function initialsFromCompany(name: string): string {
  const cleaned = name.replace(/&/g, " ").replace(/[^\w\s]/g, " ");
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
  const firstLetter = words[0]?.[0];
  const secondLetter = words.length > 1 ? words[1]?.[0] : words[0]?.[1];
  return `${firstLetter ?? "?"}${secondLetter ?? "?"}`.toUpperCase().slice(0, 2);
}

export function formatDateLabel(value: unknown): string {
  const timestamp = asTimestamp(value);
  const date = timestamp ? timestamp.toDate() : value instanceof Date ? value : null;
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizePlan(value: unknown): "Professional" | "Starter" {
  const raw = typeof value === "string" ? value.toLowerCase() : "";
  if (raw.includes("starter")) return "Starter";
  return "Professional";
}

export function subscriptionToUiStatus(value: unknown): CustomerUiStatus {
  if (value === SUBSCRIPTION_STATUS.TRIAL_NEW) return "trial";
  if (value === SUBSCRIPTION_STATUS.PAYMENT_FAILED) return "past_due";
  if (value === SUBSCRIPTION_STATUS.CANCELED) return "paused";
  if (value === SUBSCRIPTION_STATUS.TRIAL_ENDED) return "paused";
  if (value === SUBSCRIPTION_STATUS.PAYING || value === SUBSCRIPTION_STATUS.ACTIVE) {
    return "active";
  }
  return "not_connected";
}

export function uiStatusToSubscriptionStatus(status: CustomerUiStatus): string {
  if (status === "trial") return SUBSCRIPTION_STATUS.TRIAL_NEW;
  if (status === "past_due") return SUBSCRIPTION_STATUS.PAYMENT_FAILED;
  if (status === "paused") return SUBSCRIPTION_STATUS.CANCELED;
  if (status === "active") return SUBSCRIPTION_STATUS.ACTIVE;
  return SUBSCRIPTION_STATUS.TRIAL_ENDED;
}

function toRecord(data: admin.firestore.DocumentData | undefined): Record<string, unknown> {
  return (data ?? {}) as Record<string, unknown>;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/** Matches consumer billing when Firestore MRR is not stored. */
export function estimateMrrFromAdAccountCount(adAccountsCount: number): number {
  if (adAccountsCount <= 0) return 0;
  if (adAccountsCount === 1) return SUBSCRIPTION_PRICES.FIRST_ADS_ACCOUNT;
  return (
    SUBSCRIPTION_PRICES.FIRST_ADS_ACCOUNT +
    SUBSCRIPTION_PRICES.ADDITIONAL_ADS_ACCOUNT * (adAccountsCount - 1)
  );
}

function resolveCustomerMrr({
  subscription,
  adAccountsCount,
  uiStatus,
}: {
  subscription: Record<string, unknown> | undefined;
  adAccountsCount: number;
  uiStatus: CustomerUiStatus;
}): number {
  const stored = toNumber(
    subscription?.["Monthly Recurring Revenue"] ?? subscription?.["Monthly Price"],
    0,
  );
  if (stored > 0) return stored;
  if (uiStatus === "active" || uiStatus === "trial" || uiStatus === "past_due") {
    return estimateMrrFromAdAccountCount(Math.max(adAccountsCount, 1));
  }
  return 0;
}

function mapUserDocToCompanyName(userData: Record<string, unknown>): string {
  const candidates = [
    userData["Company Name"],
    userData["Company"],
    userData["Name"],
    userData["Email"],
  ];
  const match = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
  return typeof match === "string" ? match.trim() : "Unknown Company";
}

function isUserInSelectedUsers({
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

export interface CustomerListResult {
  rows: CustomerListItem[];
  metrics: {
    total: number;
    active: number;
    trial: number;
    pastDue: number;
    mrr: number;
  };
}

export async function loadCustomersList(): Promise<CustomerListResult> {
  const db = getAdminFirestore();
  const [usersSnap, subscriptionsSnap, adsAccountsSnap] = await Promise.all([
    db.collection(COLLECTIONS.USERS).get(),
    db.collection(COLLECTIONS.SUBSCRIPTIONS).get(),
    db.collection(COLLECTIONS.ADS_ACCOUNTS).where("Is Connected", "==", true).get(),
  ]);

  const subscriptionsByUserId = new Map<string, Record<string, unknown>>();
  subscriptionsSnap.forEach((doc) => {
    const data = toRecord(doc.data());
    const userRef = data["User"];
    if (userRef instanceof admin.firestore.DocumentReference) {
      subscriptionsByUserId.set(userRef.id, data);
    }
  });

  const connectedAccountsByCompanyAdminId = new Map<
    string,
    Array<{
      selectedUsers: unknown;
    }>
  >();
  adsAccountsSnap.forEach((doc) => {
    const data = toRecord(doc.data());
    const userRef = data["User"];
    if (userRef instanceof admin.firestore.DocumentReference) {
      const current = connectedAccountsByCompanyAdminId.get(userRef.id) ?? [];
      current.push({
        selectedUsers: data["Selected Users"],
      });
      connectedAccountsByCompanyAdminId.set(userRef.id, current);
    }
  });

  const rows = usersSnap.docs
    .map((doc, idx) => {
      const userData = toRecord(doc.data());
      const companyAdmin = userData["Company Admin"];
      const companyAdminId =
        companyAdmin instanceof admin.firestore.DocumentReference ? companyAdmin.id : doc.id;
      if (companyAdminId !== doc.id) {
        return null;
      }

      const subscription = subscriptionsByUserId.get(doc.id);
      const subscriptionStatus = subscription?.["User Status"];
      const uiStatus = subscriptionToUiStatus(subscriptionStatus);
      const plan = normalizePlan(subscription?.["Subscription Plan"]);

      const userType = typeof userData["User Type"] === "string" ? userData["User Type"] : "";
      const isAdminUser = userType === "Admin" || companyAdminId === doc.id;
      const linkedAccounts = connectedAccountsByCompanyAdminId.get(companyAdminId) ?? [];
      const adAccountsCount = isAdminUser
        ? linkedAccounts.length
        : linkedAccounts.filter((account) =>
            isUserInSelectedUsers({
              selectedUsers: account.selectedUsers,
              userId: doc.id,
            }),
          ).length;

      const mrr = resolveCustomerMrr({
        subscription,
        adAccountsCount,
        uiStatus,
      });

      const row: CustomerListItem = {
        id: doc.id,
        companyName: mapUserDocToCompanyName(userData),
        email:
          (typeof userData["Email"] === "string" && userData["Email"]) ||
          (typeof userData.email === "string" && userData.email) ||
          "unknown@example.com",
        initials: initialsFromCompany(mapUserDocToCompanyName(userData)),
        avatarKind: idx % 6 === 0 ? "logo" : "initials",
        avatarToneIndex: idx % 5,
        contacts: toNumber(userData["Team Size"] ?? 1, 1),
        adAccounts: adAccountsCount,
        mrr,
        status: uiStatus,
        plan,
        nextBillingLabel: formatDateLabel(subscription?.["Next Billing Date"]),
      };
      return row;
    })
    .filter((row): row is CustomerListItem => row !== null);

  const metrics = {
    total: rows.length,
    active: rows.filter((row) => row.status === "active").length,
    trial: rows.filter((row) => row.status === "trial").length,
    pastDue: rows.filter((row) => row.status === "past_due").length,
    mrr: rows.reduce((sum, row) => sum + row.mrr, 0),
  };

  return { rows, metrics };
}
