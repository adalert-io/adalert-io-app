import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

import { ADMIN_PREVIEW_COOKIE } from "@/app/api/admin/customers/_lib";
import { COLLECTIONS } from "@/lib/constants";
import { getAdminFirestore } from "@/lib/firebase/admin";

type ManagementRole = "Master Admin" | "Admin" | "IT Support";
type UserStatus = "active" | "inactive";
type AuthType = "sso" | "password";

interface ManagedUserRow {
  uid: string;
  fullName: string;
  username: string;
  loginEmail: string;
  notificationEmail: string | null;
  role: ManagementRole;
  status: UserStatus;
  isMasterAdmin: boolean;
  authType: AuthType;
  lastSignInLabel: string;
}

interface CreateAdminUserBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  role?: "Admin" | "IT Support";
}

interface UpdateAdminUserBody {
  uid?: string;
  action?: "disable" | "enable";
}

interface DeleteAdminUserBody {
  uid?: string;
}

function ensureAdminAccess(request: NextRequest): NextResponse | null {
  if (request.cookies.get(ADMIN_PREVIEW_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function formatDateTime(value: unknown): string {
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return "—";
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ".");
}

function buildLoginEmail(username: string): string {
  const normalized = normalizeUsername(username);
  if (normalized.includes("@")) return normalized;
  return `${normalized}@admin.adalert.io`;
}

function toUserRow(
  id: string,
  data: Record<string, unknown>,
): ManagedUserRow {
  const rawRole = typeof data.role === "string" ? data.role.trim() : "";
  const role: ManagementRole =
    rawRole === "Master Admin"
      ? "Master Admin"
      : rawRole === "IT Support"
        ? "IT Support"
        : "Admin";

  return {
    uid: id,
    fullName:
      (typeof data.fullName === "string" && data.fullName.trim()) || "Admin User",
    username:
      (typeof data.username === "string" && data.username.trim()) || id,
    loginEmail:
      (typeof data.loginEmail === "string" && data.loginEmail.trim()) || "—",
    notificationEmail:
      typeof data.notificationEmail === "string" && data.notificationEmail.trim()
        ? data.notificationEmail.trim()
        : null,
    role,
    status: data.status === "inactive" ? "inactive" : "active",
    isMasterAdmin: data.isMasterAdmin === true,
    authType: data.authType === "password" ? "password" : "sso",
    lastSignInLabel: formatDateTime(data.lastSignInAt),
  };
}

async function ensureMasterAdminSeeded() {
  const db = getAdminFirestore();
  const coll = db.collection(COLLECTIONS.ADMIN_USERS);
  const existingMaster = await coll.where("isMasterAdmin", "==", true).limit(1).get();
  if (!existingMaster.empty) {
    return;
  }

  const masterEmail = "admin@adalert.io";
  const now = admin.firestore.FieldValue.serverTimestamp();
  const masterRef = coll.doc("master-admin");
  await masterRef.set({
    fullName: "Master Admin",
    username: "master.admin",
    loginEmail: masterEmail,
    notificationEmail: masterEmail,
    role: "Master Admin",
    status: "active",
    isMasterAdmin: true,
    authType: "sso",
    createdAt: now,
    updatedAt: now,
    lastSignInAt: now,
  });
}

async function listManagedUsers(): Promise<ManagedUserRow[]> {
  await ensureMasterAdminSeeded();
  const snap = await getAdminFirestore().collection(COLLECTIONS.ADMIN_USERS).get();
  const rows = snap.docs.map((doc) =>
    toUserRow(doc.id, (doc.data() ?? {}) as Record<string, unknown>),
  );
  return rows.sort((a, b) => {
    if (a.isMasterAdmin && !b.isMasterAdmin) return -1;
    if (!a.isMasterAdmin && b.isMasterAdmin) return 1;
    return a.fullName.localeCompare(b.fullName);
  });
}

export async function GET(request: NextRequest) {
  const denied = ensureAdminAccess(request);
  if (denied) return denied;

  try {
    const rows = await listManagedUsers();
    return NextResponse.json({
      users: rows,
      actorRole: "Master Admin",
      actorUid: "master-admin",
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load users" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const denied = ensureAdminAccess(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as CreateAdminUserBody;
    const firstName = body.firstName?.trim() || "";
    const lastName = body.lastName?.trim() || "";
    const username = body.username?.trim() || "";
    const notificationEmail = body.email?.trim().toLowerCase() || "";
    const role = body.role;

    if (!firstName || !lastName || !username || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const loginEmail = buildLoginEmail(username);
    const uid = `${normalizeUsername(username)}-${Date.now().toString(36)}`;
    const now = admin.firestore.FieldValue.serverTimestamp();
    await getAdminFirestore().collection(COLLECTIONS.ADMIN_USERS).doc(uid).set({
      fullName: `${firstName} ${lastName}`.trim(),
      username: normalizeUsername(username),
      loginEmail,
      notificationEmail: notificationEmail || null,
      role,
      status: "active",
      isMasterAdmin: false,
      authType: "password",
      createdAt: now,
      updatedAt: now,
      lastSignInAt: null,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to create user" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const denied = ensureAdminAccess(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as UpdateAdminUserBody;
    const uid = body.uid?.trim();
    const action = body.action;
    if (!uid || (action !== "disable" && action !== "enable")) {
      return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
    }

    const userRef = getAdminFirestore().collection(COLLECTIONS.ADMIN_USERS).doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userData = (userSnap.data() ?? {}) as Record<string, unknown>;
    if (userData.isMasterAdmin === true) {
      return NextResponse.json({ error: "Master Admin cannot be modified" }, { status: 400 });
    }

    await userRef.update({
      status: action === "disable" ? "inactive" : "active",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to update user" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const denied = ensureAdminAccess(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as DeleteAdminUserBody;
    const uid = body.uid?.trim();
    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    const userRef = getAdminFirestore().collection(COLLECTIONS.ADMIN_USERS).doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userData = (userSnap.data() ?? {}) as Record<string, unknown>;
    if (userData.isMasterAdmin === true) {
      return NextResponse.json({ error: "Master Admin cannot be deleted" }, { status: 400 });
    }

    await userRef.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to delete user" },
      { status: 500 },
    );
  }
}
