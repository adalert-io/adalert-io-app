import { NextResponse } from "next/server";

const ADMIN_PREVIEW_COOKIE = "admin_preview_gate";

/** Temporary staging PIN — rotate before production-wide release */
const ADMIN_PREVIEW_PIN = "140209";

interface BodyPayload {
  code?: string;
}

export async function POST(request: Request) {
  let body: BodyPayload = {};
  try {
    body = (await request.json()) as BodyPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const raw = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
  if (raw !== ADMIN_PREVIEW_PIN || raw.length !== 6) {
    return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 401 });
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
