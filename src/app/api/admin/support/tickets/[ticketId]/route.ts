import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

import { getAdminFirestore } from "@/lib/firebase/admin";

const ADMIN_PREVIEW_COOKIE = "admin_preview_gate";

type AdminTicketStatus = "open" | "in_progress" | "pending_customer" | "resolved";
type AdminTicketPriority = "low" | "medium" | "high";

interface UpdateTicketBody {
  status?: AdminTicketStatus;
  priority?: AdminTicketPriority;
}

function isValidStatus(value: unknown): value is AdminTicketStatus {
  return (
    value === "open" ||
    value === "in_progress" ||
    value === "pending_customer" ||
    value === "resolved"
  );
}

function isValidPriority(value: unknown): value is AdminTicketPriority {
  return value === "low" || value === "medium" || value === "high";
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ ticketId: string }> },
) {
  if (request.cookies.get(ADMIN_PREVIEW_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ticketId } = await context.params;
    if (!ticketId) {
      return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
    }

    const body = (await request.json()) as UpdateTicketBody;
    const updateData: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (body.status !== undefined) {
      if (!isValidStatus(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updateData.status = body.status;
    }

    if (body.priority !== undefined) {
      if (!isValidPriority(body.priority)) {
        return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
      }
      updateData.priority = body.priority;
    }

    if (Object.keys(updateData).length === 1) {
      return NextResponse.json(
        { error: "Provide status or priority to update" },
        { status: 400 },
      );
    }

    const db = getAdminFirestore();
    const docRef = db.collection("supportTickets").doc(ticketId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    await docRef.update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to update ticket" },
      { status: 500 },
    );
  }
}
