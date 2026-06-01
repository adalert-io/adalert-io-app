import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

import { sendEmail } from "@/lib/email/sendgrid";
import {
  SUPPORT_NO_REPLY_EMAIL,
  buildConsumerStatusUpdateEmail,
} from "@/lib/email/support-ticket-emails";
import { getAdminFirestore } from "@/lib/firebase/admin";

const ADMIN_PREVIEW_COOKIE = "admin_preview_gate";

type AdminTicketStatus = "open" | "in_progress" | "pending_customer" | "resolved";
type AdminTicketPriority = "low" | "medium" | "high";

interface UpdateTicketBody {
  status?: AdminTicketStatus;
  priority?: AdminTicketPriority;
  markRead?: boolean;
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

function normalizeStatus(value: unknown): AdminTicketStatus {
  if (value === "open" || value === "in_progress" || value === "resolved") return value;
  if (value === "pending_customer" || value === "waiting") return "pending_customer";
  return "open";
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

    const db = getAdminFirestore();
    const docRef = db.collection("supportTickets").doc(ticketId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const previousData = docSnap.data() as Record<string, unknown>;
    const previousStatus = normalizeStatus(previousData.status);

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

    if (body.markRead === true) {
      updateData.adminUnread = false;
      updateData.adminReadAt = admin.firestore.FieldValue.serverTimestamp();
    }

    const hasFieldUpdates =
      body.status !== undefined || body.priority !== undefined || body.markRead === true;

    if (!hasFieldUpdates) {
      return NextResponse.json(
        { error: "Provide status, priority, or markRead to update" },
        { status: 400 },
      );
    }

    await docRef.update(updateData);

    const statusChanged =
      body.status !== undefined && body.status !== previousStatus;
    const customerEmail =
      typeof previousData.createdByEmail === "string"
        ? previousData.createdByEmail.trim()
        : "";
    const ticketCode =
      typeof previousData.ticketCode === "string" && previousData.ticketCode.trim()
        ? previousData.ticketCode
        : ticketId;
    const ticketSubject =
      typeof previousData.subject === "string" && previousData.subject.trim()
        ? previousData.subject
        : "Support ticket update";

    if (statusChanged && customerEmail && body.status) {
      try {
        const statusEmail = buildConsumerStatusUpdateEmail({
          request,
          ticketCode,
          subject: ticketSubject,
          status: body.status,
        });
        await sendEmail({
          to: [customerEmail],
          subject: statusEmail.subject,
          text: statusEmail.text,
          html: statusEmail.html,
          from: SUPPORT_NO_REPLY_EMAIL,
        });
      } catch (emailError) {
        console.error("Failed to send ticket status update email:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      statusChanged,
      adminUnread: body.markRead === true ? false : previousData.adminUnread !== false,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to update ticket" },
      { status: 500 },
    );
  }
}
