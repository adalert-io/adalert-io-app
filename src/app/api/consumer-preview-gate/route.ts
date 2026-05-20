import { NextResponse } from "next/server";

import {
  CONSUMER_PREVIEW_COOKIE,
  CONSUMER_PREVIEW_PIN,
} from "@/lib/consumer-preview-gate";

interface BodyPayload {
  pin?: string;
}

export async function POST(request: Request) {
  let body: BodyPayload = {};
  try {
    body = (await request.json()) as BodyPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const pin = typeof body.pin === "string" ? body.pin.trim() : "";

  if (pin !== CONSUMER_PREVIEW_PIN) {
    return NextResponse.json({ ok: false, error: "invalid_pin" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(CONSUMER_PREVIEW_COOKIE, "1", {
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
  response.cookies.delete(CONSUMER_PREVIEW_COOKIE);
  return response;
}
