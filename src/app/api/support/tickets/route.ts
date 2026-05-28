import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

import { getAdminFirestore, verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { sendEmail } from "@/lib/email/sendgrid";

interface CreateTicketRequestBody {
  subject?: string;
  category?: string;
  priority?: "low" | "medium" | "high";
  description?: string;
}

interface SupportTicketApiDto {
  id: string;
  documentId: string;
  subject: string;
  category: string;
  status: "open" | "in_progress" | "waiting" | "resolved";
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string;
}

const SUPPORT_ALERT_RECIPIENTS = ["support@adalert.io", "info@webds.com", "mohit@webds.com"];

function timestampToIso(value: admin.firestore.Timestamp | null | undefined): string {
  if (!value) return new Date(0).toISOString();
  return value.toDate().toISOString();
}

function toPreview(body: string): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  return normalized.length > 140 ? `${normalized.slice(0, 140)}…` : normalized;
}

function generateTicketId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TKT-${year}-${rand}`;
}

function normalizeConsumerStatus(
  value: unknown,
): SupportTicketApiDto["status"] {
  if (value === "pending_customer" || value === "waiting") return "waiting";
  if (value === "open" || value === "in_progress" || value === "resolved") return value;
  return "open";
}

function docToDto(
  doc: admin.firestore.QueryDocumentSnapshot | admin.firestore.DocumentSnapshot,
): SupportTicketApiDto {
  const data = (doc.data() ?? {}) as Record<string, unknown>;
  return {
    id: String(data.ticketCode ?? doc.id),
    documentId: doc.id,
    subject: String(data.subject ?? ""),
    category: String(data.category ?? ""),
    status: normalizeConsumerStatus(data.status),
    priority: (data.priority as SupportTicketApiDto["priority"]) ?? "medium",
    createdAt: timestampToIso(data.createdAt as admin.firestore.Timestamp | undefined),
    updatedAt: timestampToIso(data.updatedAt as admin.firestore.Timestamp | undefined),
    lastMessagePreview: String(data.lastMessagePreview ?? ""),
  };
}

export async function GET(request: NextRequest) {
  try {
    const decoded = await verifyFirebaseIdToken(request.headers.get("authorization"));

    const db = getAdminFirestore();
    const snap = await db
      .collection("supportTickets")
      .where("createdByUid", "==", decoded.uid)
      .get();

    const tickets = snap.docs
      .map((doc) => docToDto(doc))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return NextResponse.json({ tickets });
  } catch (error) {
    const status = typeof (error as { status?: number }).status === "number"
      ? (error as { status: number }).status
      : 500;
    return NextResponse.json(
      { error: (error as Error).message ?? "Failed to load tickets" },
      { status },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyFirebaseIdToken(request.headers.get("authorization"));
    const body = (await request.json()) as CreateTicketRequestBody;

    const subject = body.subject?.trim() ?? "";
    const category = body.category?.trim() ?? "";
    const priority = body.priority ?? "medium";
    const description = body.description?.trim() ?? "";

    if (!subject || !description) {
      return NextResponse.json(
        { error: "Subject and description are required" },
        { status: 400 },
      );
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const ticketCode = generateTicketId();

    const db = getAdminFirestore();
    const docRef = db.collection("supportTickets").doc();

    await docRef.set({
      ticketCode,
      subject,
      category,
      priority,
      status: "open",
      description,
      lastMessagePreview: toPreview(description),
      createdByUid: decoded.uid,
      createdByEmail: decoded.email ?? null,
      createdByName: decoded.name ?? null,
      createdAt: now,
      updatedAt: now,
    });

    const createdSnap = await docRef.get();
    const createdTicket = docToDto(createdSnap);

    try {
      const requester = decoded.email ? `${decoded.email}` : decoded.uid;
      const emailSubject = `[AdAlert Support] New Ticket ${createdTicket.id}`;
      const text = [
        "A new support ticket has been submitted.",
        "",
        `Ticket: ${createdTicket.id}`,
        `Subject: ${createdTicket.subject}`,
        `Category: ${createdTicket.category}`,
        `Priority: ${createdTicket.priority}`,
        `Requester: ${requester}`,
        "",
        "Customer Message:",
        description,
        "",
        "Please review and respond from the Support dashboard.",
      ].join("\n");

      const html = `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.45;">
          <h2 style="margin: 0 0 12px;">AdAlert Support: New Ticket Submitted</h2>
          <p style="margin: 0 0 12px;">A customer has submitted a new support ticket.</p>
          <table style="border-collapse: collapse; margin: 0 0 16px;">
            <tr><td style="padding: 4px 12px 4px 0; color: #475569;"><strong>Ticket</strong></td><td style="padding: 4px 0;">${createdTicket.id}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #475569;"><strong>Subject</strong></td><td style="padding: 4px 0;">${escapeHtml(createdTicket.subject)}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #475569;"><strong>Category</strong></td><td style="padding: 4px 0;">${escapeHtml(createdTicket.category)}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #475569;"><strong>Priority</strong></td><td style="padding: 4px 0;">${escapeHtml(createdTicket.priority)}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #475569;"><strong>Requester</strong></td><td style="padding: 4px 0;">${escapeHtml(requester)}</td></tr>
          </table>
          <div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc;">
            <div style="color: #475569; font-size: 12px; font-weight: 600; margin-bottom: 6px;">Customer Message</div>
            <div style="white-space: pre-wrap;">${escapeHtml(description)}</div>
          </div>
          <p style="margin: 14px 0 0; color: #475569; font-size: 12px;">
            Please review and respond from the Support dashboard.
          </p>
        </div>
      `;

      await sendEmail({
        to: SUPPORT_ALERT_RECIPIENTS,
        subject: emailSubject,
        text,
        html,
      });
    } catch (emailError) {
      console.error("Failed to send support ticket alert email:", emailError);
    }

    return NextResponse.json({ ticket: createdTicket }, { status: 201 });
  } catch (error) {
    const status = typeof (error as { status?: number }).status === "number"
      ? (error as { status: number }).status
      : 500;
    return NextResponse.json(
      { error: (error as Error).message ?? "Failed to create ticket" },
      { status },
    );
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
