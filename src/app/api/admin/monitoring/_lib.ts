import admin from "firebase-admin";

import { ADMIN_PREVIEW_COOKIE } from "@/app/api/admin/customers/_lib";
import { COLLECTIONS } from "@/lib/constants";
import { getAdminFirestore } from "@/lib/firebase/admin";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export type MonitorLifecycleStatus = "pending" | "active" | "paused";
export type MonitorCheckStatus = "pending" | "up" | "down" | "degraded";

export interface LandingPageMonitorRow {
  id: string;
  monitorKey: string;
  url: string;
  hostname: string;
  adsAccountId: string;
  adminUserId: string;
  adminEmail: string;
  adminEmailTransformed: string;
  status: MonitorLifecycleStatus;
  checkFrequencySeconds: number;
  lastCheckedAt: string | null;
  lastCheckStatus: MonitorCheckStatus;
  lastHttpCode: number | null;
  lastResponseMs: number | null;
  lastErrorMessage: string | null;
  lastSyncedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MonitoringMetrics {
  total: number;
  active: number;
  down: number;
  degraded: number;
  pendingCheck: number;
  paused: number;
}

function asTimestamp(value: unknown): admin.firestore.Timestamp | null {
  if (value instanceof admin.firestore.Timestamp) return value;
  return null;
}

function toIso(value: unknown): string | null {
  const timestamp = asTimestamp(value);
  if (timestamp) return timestamp.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeLifecycle(value: unknown): MonitorLifecycleStatus {
  if (value === "paused" || value === "pending" || value === "active") return value;
  return "active";
}

function normalizeCheckStatus(value: unknown): MonitorCheckStatus {
  if (
    value === "up" ||
    value === "down" ||
    value === "degraded" ||
    value === "pending"
  ) {
    return value;
  }
  return "pending";
}

export function ensureAdminAccess(request: NextRequest): NextResponse | null {
  if (request.cookies.get(ADMIN_PREVIEW_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function mapMonitorDoc(
  id: string,
  data: admin.firestore.DocumentData,
): LandingPageMonitorRow {
  return {
    id,
    monitorKey: asString(data.monitorKey, id),
    url: asString(data.url),
    hostname: asString(data.hostname),
    adsAccountId: asString(data.adsAccountId),
    adminUserId: asString(data.adminUserId),
    adminEmail: asString(data.adminEmail),
    adminEmailTransformed: asString(data.adminEmailTransformed),
    status: normalizeLifecycle(data.status),
    checkFrequencySeconds:
      typeof data.checkFrequencySeconds === "number"
        ? data.checkFrequencySeconds
        : 21600,
    lastCheckedAt: toIso(data.lastCheckedAt),
    lastCheckStatus: normalizeCheckStatus(data.lastCheckStatus),
    lastHttpCode: asNumberOrNull(data.lastHttpCode),
    lastResponseMs: asNumberOrNull(data.lastResponseMs),
    lastErrorMessage:
      typeof data.lastErrorMessage === "string" ? data.lastErrorMessage : null,
    lastSyncedAt: toIso(data.lastSyncedAt),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export async function loadLandingPageMonitors(): Promise<{
  monitors: LandingPageMonitorRow[];
  metrics: MonitoringMetrics;
}> {
  const db = getAdminFirestore();
  const snap = await db.collection(COLLECTIONS.LANDING_PAGE_MONITORS).get();

  const monitors = snap.docs
    .map((docSnap) => mapMonitorDoc(docSnap.id, docSnap.data()))
    .sort((a, b) => {
      const aTime = a.lastCheckedAt ? Date.parse(a.lastCheckedAt) : 0;
      const bTime = b.lastCheckedAt ? Date.parse(b.lastCheckedAt) : 0;
      return bTime - aTime;
    });

  const metrics: MonitoringMetrics = {
    total: monitors.length,
    active: monitors.filter((m) => m.status === "active").length,
    down: monitors.filter((m) => m.lastCheckStatus === "down").length,
    degraded: monitors.filter((m) => m.lastCheckStatus === "degraded").length,
    pendingCheck: monitors.filter((m) => m.lastCheckStatus === "pending").length,
    paused: monitors.filter((m) => m.status === "paused").length,
  };

  return { monitors, metrics };
}
