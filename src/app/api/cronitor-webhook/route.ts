import { NextRequest, NextResponse } from 'next/server';

/**
 * Deprecated: Cronitor webhooks no longer create Landing Page alerts.
 * Uptime probing + LandingPageReturnError creation is owned by the backend
 * (`landingPageMonitorTick` / `landingPageMonitors`).
 *
 * Kept as a no-op so any leftover Cronitor notification list still gets HTTP 200
 * until monitors/webhooks are disabled in the Cronitor dashboard.
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      success: true,
      deprecated: true,
      message:
        'Cronitor webhooks are deprecated. Landing page uptime is handled by backend landingPageMonitorTick.',
    },
    { status: 200 },
  );
}
