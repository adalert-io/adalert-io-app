import { NextRequest, NextResponse } from "next/server";

import { ensureAdminAccess, loadLandingPageMonitors } from "./_lib";

export async function GET(request: NextRequest) {
  const denied = ensureAdminAccess(request);
  if (denied) return denied;

  try {
    const { monitors, metrics } = await loadLandingPageMonitors();
    return NextResponse.json({ monitors, metrics });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load monitors" },
      { status: 500 },
    );
  }
}
