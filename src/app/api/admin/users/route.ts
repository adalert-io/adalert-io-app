import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

import { ADMIN_PREVIEW_COOKIE } from "@/app/api/admin/customers/_lib";
import { COLLECTIONS } from "@/lib/constants";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";

type ManagementRole = "Master Admin" | "Admin" | "IT Support";

interface ManagedUserRow {
  uid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  username: string;
  loginEmail: string;
  notificationEmail: string | null;
  role: ManagementRole;
  isMasterAdmin: boolean;
  isDisabled: boolean;
  status: "active" | "inactive";
  lastSignInLabel: string;
  createdLabel: string;
}

interface CreateAdminUserBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  password?: string;
  role?: Exclude<ManagementRole, "Master Admin">;
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

function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toRole({
  isMasterAdmin,
  userType,
  explicitRole,
}: {
  isMasterAdmin: boolean;
  userType: string;
  explicitRole: unknown;
}): ManagementRole {
  if (isMasterAdmin) return "Master Admin";
  if (typeof explicitRole === "string" && explicitRole.toLowerCase() === "it support") {
    return "IT Support";
  }
  if (typeof userType === "string" && userType.toLowerCase() === "manager") {
    return "IT Support";
  }
  return "Admin";
}

function toUserType(role: Exclude<ManagementRole, "Master Admin">): "Admin" | "Manager" {
  return role === "IT Support" ? "Manager" : "Admin";
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ".");
}

function buildLoginEmail(username: string): string {
  const normalized = normalizeUsername(username);
  if (normalized.includes("@")) return normalized;
  return `${normalized}@login.adalert.io`;
}

async function resolveMasterAdminRef() {
  const db = getAdminFirestore();
  const usersSnap = await db.collection(COLLECTIONS.USERS).get();
  for (const doc of usersSnap.docs) {
    const data = (doc.data() ?? {}) as Record<string, unknown>;
    const companyAdmin = data["Company Admin"];
    if (companyAdmin instanceof admin.firestore.DocumentReference && companyAdmin.id === doc.id) {
      return db.collection(COLLECTIONS.USERS).doc(doc.id);
    }
  }
  return null;
}

function actorContextFromHeaders(request: NextRequest): { role: ManagementRole; uid: string | null } {
  const headerRole = request.headers.get("x-admin-role");
  const headerUid = request.headers.get("x-admin-uid");
  const role: ManagementRole =
    headerRole === "Admin" || headerRole === "IT Support" || headerRole === "Master Admin"
      ? headerRole
      : "Master Admin";
  return { role, uid: headerUid?.trim() || null };
}

async function listManagedUsers(): Promise<ManagedUserRow[]> {
  const [usersResult, usersSnap] = await Promise.all([
    getAdminAuth().listUsers(1000),
    getAdminFirestore().collection(COLLECTIONS.USERS).get(),
  ]);

  const authByUid = new Map(usersResult.users.map((user) => [user.uid, user]));
  const rows: ManagedUserRow[] = [];

  for (const doc of usersSnap.docs) {
    const data = (doc.data() ?? {}) as Record<string, unknown>;
    const authUser = authByUid.get(doc.id);
    if (!authUser) continue;

    const companyAdmin = data["Company Admin"];
    const isMasterAdmin =
      companyAdmin instanceof admin.firestore.DocumentReference && companyAdmin.id === doc.id;
    const firstNameRaw =
      (typeof data["First Name"] === "string" && data["First Name"].trim()) || "";
    const lastNameRaw =
      (typeof data["Last Name"] === "string" && data["Last Name"].trim()) || "";
    const displayName =
      authUser.displayName?.trim() ||
      (typeof data["Name"] === "string" ? data["Name"].trim() : "") ||
      "";
    const fullName = `${firstNameRaw} ${lastNameRaw}`.trim() || displayName || authUser.email || "User";
    const [derivedFirst, ...rest] = fullName.split(" ");
    const firstName = firstNameRaw || derivedFirst || "User";
    const lastName = lastNameRaw || rest.join(" ");
    const role = toRole({
      isMasterAdmin,
      userType: typeof data["User Type"] === "string" ? data["User Type"] : "",
      explicitRole: data["Role"],
    });
    const username =
      (typeof data["Username"] === "string" && data["Username"].trim()) ||
      authUser.email?.split("@")[0] ||
      doc.id;
    const notificationEmail =
      typeof data["Notification Email"] === "string" && data["Notification Email"].trim()
        ? data["Notification Email"].trim()
        : null;

    rows.push({
      uid: doc.id,
      firstName,
      lastName,
      fullName,
      username,
      loginEmail: authUser.email ?? "—",
      notificationEmail,
      role,
      isMasterAdmin,
      isDisabled: authUser.disabled,
      status: authUser.disabled ? "inactive" : "active",
      lastSignInLabel: formatDateTime(authUser.metadata.lastSignInTime),
      createdLabel: formatDateTime(authUser.metadata.creationTime),
    });
  }

  return rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function GET(request: NextRequest) {
  const denied = ensureAdminAccess(request);
  if (denied) return denied;

  try {
    const rows = await listManagedUsers();
    const actor = actorContextFromHeaders(request);
    return NextResponse.json({ users: rows, actorRole: actor.role, actorUid: actor.uid });
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
    const actor = actorContextFromHeaders(request);
    if (actor.role === "IT Support") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = (await request.json()) as CreateAdminUserBody;
    const firstName = body.firstName?.trim() || "";
    const lastName = body.lastName?.trim() || "";
    const username = body.username?.trim() || "";
    const password = body.password?.trim() || "";
    const notificationEmail = body.email?.trim().toLowerCase() || "";
    const role = body.role;

    if (!firstName || !lastName || !username || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const loginEmail = buildLoginEmail(username);
    const auth = getAdminAuth();
    const db = getAdminFirestore();
    const masterAdminRef = await resolveMasterAdminRef();
    if (!masterAdminRef) {
      return NextResponse.json({ error: "Master Admin account not found" }, { status: 400 });
    }

    const created = await auth.createUser({
      email: loginEmail,
      password,
      displayName: `${firstName} ${lastName}`.trim(),
      emailVerified: false,
      disabled: false,
    });

    const userRef = db.collection(COLLECTIONS.USERS).doc(created.uid);
    await userRef.set({
      "First Name": firstName,
      "Last Name": lastName,
      Name: `${firstName} ${lastName}`.trim(),
      Username: normalizeUsername(username),
      Role: role,
      "User Type": toUserType(role),
      Email: notificationEmail || loginEmail,
      "Notification Email": notificationEmail || null,
      uid: created.uid,
      "Company Admin": masterAdminRef,
      "Is Google Sign Up": false,
      modified_at: admin.firestore.FieldValue.serverTimestamp(),
      "Created Date": admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      {
        user: {
          uid: created.uid,
          fullName: `${firstName} ${lastName}`.trim(),
          username: normalizeUsername(username),
          role,
          loginEmail,
          notificationEmail: notificationEmail || null,
        },
      },
      { status: 201 },
    );
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
    const actor = actorContextFromHeaders(request);
    if (actor.role === "IT Support") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = (await request.json()) as UpdateAdminUserBody;
    const uid = body.uid?.trim();
    const action = body.action;
    if (!uid || (action !== "disable" && action !== "enable")) {
      return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
    }
    if (actor.uid && actor.uid === uid) {
      return NextResponse.json({ error: "You cannot modify your own account status" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const userSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userData = (userSnap.data() ?? {}) as Record<string, unknown>;
    const companyAdmin = userData["Company Admin"];
    const isMasterAdmin =
      companyAdmin instanceof admin.firestore.DocumentReference && companyAdmin.id === uid;
    if (isMasterAdmin) {
      return NextResponse.json({ error: "Master Admin cannot be modified" }, { status: 400 });
    }

    await getAdminAuth().updateUser(uid, { disabled: action === "disable" });
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
    const actor = actorContextFromHeaders(request);
    if (actor.role === "IT Support") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = (await request.json()) as DeleteAdminUserBody;
    const uid = body.uid?.trim();
    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }
    if (actor.uid && actor.uid === uid) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userData = (userSnap.data() ?? {}) as Record<string, unknown>;
    const companyAdmin = userData["Company Admin"];
    const isMasterAdmin =
      companyAdmin instanceof admin.firestore.DocumentReference && companyAdmin.id === uid;
    if (isMasterAdmin) {
      return NextResponse.json({ error: "Master Admin cannot be deleted" }, { status: 400 });
    }

    await Promise.all([getAdminAuth().deleteUser(uid), userRef.delete()]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to delete user" },
      { status: 500 },
    );
  }
}
