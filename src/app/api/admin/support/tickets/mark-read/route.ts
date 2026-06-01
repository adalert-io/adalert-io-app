import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

import { getAdminFirestore } from "@/lib/firebase/admin";

const ADMIN_PREVIEW_COOKIE = "admin_preview_gate";

interface MarkReadBody {
  ticketIds?: string[];
}

export async function POST(request: NextRequest) {
  if (request.cookies.get(ADMIN_PREVIEW_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as MarkReadBody;
    const ticketIds = Array.isArray(body.ticketIds)
      ? body.ticketIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : [];

    if (ticketIds.length === 0) {
      return NextResponse.json({ error: "ticketIds is required" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const batch = db.batch();
    const now = admin.firestore.FieldValue.serverTimestamp();

    for (const ticketId of ticketIds) {
      const ref = db.collection("supportTickets").doc(ticketId);
      batch.update(ref, {
        adminUnread: false,
        adminReadAt: now,
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true, count: ticketIds.length });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to mark tickets as read" },
      { status: 500 },
    );
  }
}
