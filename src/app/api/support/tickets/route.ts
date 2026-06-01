import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

import { getAdminFirestore, verifyFirebaseIdToken } from "@/lib/firebase/admin";
import {
  buildSupportAttachmentStoragePath,
  uploadSupportAttachment,
} from "@/lib/support/storage-attachments";
import { sendEmail } from "@/lib/email/sendgrid";
import {
  SUPPORT_ALERT_RECIPIENTS,
  SUPPORT_NO_REPLY_EMAIL,
  buildAdminNewTicketEmail,
  buildConsumerTicketSubmittedEmail,
} from "@/lib/email/support-ticket-emails";

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
    const initialStoragePath = buildSupportAttachmentStoragePath({
      ticketId: docRef.id,
      scopeId: "initial",
      fileName: attachment.fileName,
    });

    await uploadSupportAttachment({
      storagePath: initialStoragePath,
      buffer: Buffer.from(attachment.contentBase64 ?? "", "base64"),
      mimeType: attachment.mimeType,
    });

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
          storagePath: initialStoragePath,
        },
      ],
      adminUnread: true,
      createdAt: now,
      updatedAt: now,
    });

    const createdSnap = await docRef.get();
    const createdTicket = docToDto(createdSnap);

    try {
      const requester = decoded.email ?? decoded.uid;
      const adminEmail = buildAdminNewTicketEmail({
        request,
        ticketCode: createdTicket.id,
        subject: createdTicket.subject,
        category: createdTicket.category,
        priority: createdTicket.priority,
        requesterLabel: requester,
        description,
      });

      await sendEmail({
        to: SUPPORT_ALERT_RECIPIENTS,
        subject: adminEmail.subject,
        text: adminEmail.text,
        html: adminEmail.html,
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
        const customerEmail = buildConsumerTicketSubmittedEmail({
          request,
          ticketCode: createdTicket.id,
          subject: createdTicket.subject,
        });
        await sendEmail({
          to: [decoded.email],
          subject: customerEmail.subject,
          text: customerEmail.text,
          html: customerEmail.html,
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
