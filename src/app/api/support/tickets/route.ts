import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

import { getAdminFirestore, verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { sendEmail } from "@/lib/email/sendgrid";

interface TicketAttachment {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64?: string;
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
  attachments?: TicketAttachment[];
}

const SUPPORT_ALERT_RECIPIENTS = ["support@adalert.io", "info@webds.com", "mohit@webds.com"];
const SUPPORT_NO_REPLY_EMAIL =
  process.env.SENDGRID_SUPPORT_NO_REPLY_SENDER ?? "no-reply@adalert.io";
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

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
    attachments: Array.isArray(data.attachments)
      ? (data.attachments as TicketAttachment[])
      : [],
  };
}

function buildPortalTicketLink({ request, ticketId }: { request: NextRequest; ticketId: string }) {
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
  return `${appBaseUrl}/consumer/help/${encodeURIComponent(ticketId)}`;
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
    const contentType = request.headers.get("content-type") ?? "";
    let subject = "";
    let category = "";
    let priority: "low" | "medium" | "high" = "medium";
    let description = "";
    let attachment: TicketAttachment | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      subject = String(formData.get("subject") ?? "").trim();
      category = String(formData.get("category") ?? "").trim();
      const priorityValue = String(formData.get("priority") ?? "medium").trim();
      priority = priorityValue === "low" || priorityValue === "high" ? priorityValue : "medium";
      description = String(formData.get("description") ?? "").trim();
      const file = formData.get("attachment");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Attachment is required" }, { status: 400 });
      }
      if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `Unsupported attachment type: ${file.type || "unknown"}` },
          { status: 400 },
        );
      }
      if (file.size <= 0 || file.size > MAX_ATTACHMENT_BYTES) {
        return NextResponse.json(
          { error: "Attachment must be between 1 byte and 15 MB" },
          { status: 400 },
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      attachment = {
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        contentBase64: Buffer.from(arrayBuffer).toString("base64"),
      };
    } else {
      const body = (await request.json()) as {
        subject?: string;
        category?: string;
        priority?: "low" | "medium" | "high";
        description?: string;
      };
      subject = body.subject?.trim() ?? "";
      category = body.category?.trim() ?? "";
      priority = body.priority ?? "medium";
      description = body.description?.trim() ?? "";
    }

    if (!subject || !description || !attachment) {
      return NextResponse.json(
        { error: "Subject, description, and one attachment are required" },
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
      attachments: [
        {
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    const createdSnap = await docRef.get();
    const createdTicket = docToDto(createdSnap);

    try {
      const requester = decoded.email ? `${decoded.email}` : decoded.uid;
      const emailSubject = `[adAlert Support] New Ticket ${createdTicket.id}`;
      const ticketPortalLink = buildPortalTicketLink({
        request,
        ticketId: createdTicket.id,
      });
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
          <h2 style="margin: 0 0 12px;">adAlert Support: New Ticket Submitted</h2>
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
        from: SUPPORT_NO_REPLY_EMAIL,
        attachments: attachment.contentBase64
          ? [
              {
                filename: attachment.fileName,
                type: attachment.mimeType,
                disposition: "attachment",
                content: attachment.contentBase64,
              },
            ]
          : undefined,
      });

      if (decoded.email) {
        const customerSubject = `[adAlert Support] Ticket Received ${createdTicket.id}`;
        const customerText = [
          "Your support ticket has been received.",
          "",
          `Ticket: ${createdTicket.id}`,
          `Subject: ${createdTicket.subject}`,
          "",
          "You can view and reply to this ticket from the support portal:",
          ticketPortalLink,
          "",
          "This email is sent from a no-reply mailbox.",
        ].join("\n");
        const customerHtml = `
          <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.45;">
            <h2 style="margin: 0 0 12px;">adAlert Support: Ticket Received</h2>
            <p style="margin: 0 0 10px;">We've received your support ticket.</p>
            <p style="margin: 0 0 14px; color: #334155;">
              <strong>Ticket:</strong> ${escapeHtml(createdTicket.id)}<br />
              <strong>Subject:</strong> ${escapeHtml(createdTicket.subject)}
            </p>
            <p style="margin: 0 0 8px;">
              <a href="${ticketPortalLink}" style="color: #015AFD; text-decoration: none; font-weight: 600;">
                Open ticket thread in support portal
              </a>
            </p>
            <p style="margin: 14px 0 0; color: #475569; font-size: 12px;">
              This is a no-reply email. Please respond from the support portal.
            </p>
          </div>
        `;
        await sendEmail({
          to: [decoded.email],
          subject: customerSubject,
          text: customerText,
          html: customerHtml,
          from: SUPPORT_NO_REPLY_EMAIL,
        });
      }
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
