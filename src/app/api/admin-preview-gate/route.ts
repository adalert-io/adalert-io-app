import { NextResponse } from "next/server";

const ADMIN_PREVIEW_COOKIE = "admin_preview_gate";

/** Temporary preview credentials — replace before launch */
const ADMIN_PREVIEW_EMAIL = "admin@adalert.io";
const ADMIN_PREVIEW_PASSWORD = "eyJhbGciOiJIUzI1N12@";

interface BodyPayload {
  email?: string;
  password?: string;
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

  const isValid =
    email === ADMIN_PREVIEW_EMAIL.toLowerCase() &&
    password === ADMIN_PREVIEW_PASSWORD;

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
