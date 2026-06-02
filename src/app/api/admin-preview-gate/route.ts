import { NextResponse } from "next/server";
import { COLLECTIONS } from "@/lib/constants";
import { getAdminFirestore } from "@/lib/firebase/admin";

const ADMIN_PREVIEW_COOKIE = "admin_preview_gate";

/** Temporary preview credentials — replace before launch */
const ADMIN_PREVIEW_EMAIL = "admin@adalert.io";
const ADMIN_PREVIEW_PASSWORD = "eyJhbGciOiJIUzI1N12@";

interface BodyPayload {
  email?: string;
  password?: string;
}

async function verifyWithFirebasePasswordLogin(email: string, password: string): Promise<boolean> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) return false;

  const signInResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    },
  );

  if (!signInResponse.ok) {
    return false;
  }

  const db = getAdminFirestore();
  const snap = await db
    .collection(COLLECTIONS.ADMIN_USERS)
    .where("loginEmail", "==", email)
    .limit(1)
    .get();

  if (snap.empty) return false;

  const row = (snap.docs[0]?.data() ?? {}) as Record<string, unknown>;
  return row.status !== "inactive";
}

export async function POST(request: Request) {
  let body: BodyPayload = {};
  try {
    body = (await request.json()) as BodyPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const isMasterPreviewValid =
    email === ADMIN_PREVIEW_EMAIL.toLowerCase() &&
    password === ADMIN_PREVIEW_PASSWORD;

  let isValid = isMasterPreviewValid;
  if (!isValid) {
    try {
      isValid = await verifyWithFirebasePasswordLogin(email, password);
    } catch {
      isValid = false;
    }
  }

  if (!isValid) {
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(ADMIN_PREVIEW_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_PREVIEW_COOKIE);
  return response;
}
