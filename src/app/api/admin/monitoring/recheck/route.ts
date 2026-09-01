import { NextRequest, NextResponse } from "next/server";

import { getFirebaseFnPath } from "@/lib/utils";

import { ensureAdminAccess } from "../_lib";

interface RecheckBody {
  monitorId?: string;
  force?: boolean;
  maxPerTick?: number;
}

export async function POST(request: NextRequest) {
  const denied = ensureAdminAccess(request);
  if (denied) return denied;

  try {
    const body = (await request.json().catch(() => ({}))) as RecheckBody;
    const monitorId = body.monitorId?.trim();

    if (!monitorId) {
      return NextResponse.json(
        { error: "monitorId is required" },
        { status: 400 },
      );
    }

    const path = getFirebaseFnPath("landing-page-monitor-tick-fb");
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        force: body.force !== false,
        monitorId,
        ...(typeof body.maxPerTick === "number"
          ? { maxPerTick: body.maxPerTick }
          : {}),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            (payload as { error?: string }).error ||
            "Failed to recheck monitor",
        },
        { status: response.status >= 400 ? response.status : 500 },
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to recheck monitor" },
      { status: 500 },
    );
  }
}
