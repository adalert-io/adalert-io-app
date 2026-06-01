import { NextRequest, NextResponse } from "next/server";

import { ADMIN_PREVIEW_COOKIE } from "@/app/api/admin/customers/_lib";
import { loadAdminDashboardOverview, parseDashboardRange } from "./_lib";

function ensureAdminAccess(request: NextRequest): NextResponse | null {
  if (request.cookies.get(ADMIN_PREVIEW_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = ensureAdminAccess(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const range = parseDashboardRange(
      searchParams.get("from"),
      searchParams.get("to"),
    );

    const overview = await loadAdminDashboardOverview(range);
    return NextResponse.json(overview);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load admin dashboard" },
      { status: 500 },
    );
  }
}
