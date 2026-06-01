import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

import { sendEmail } from "@/lib/email/sendgrid";
import {
  SUPPORT_NO_REPLY_EMAIL,
  buildConsumerAdminReplyEmail,
  buildConsumerSupportNoteEmail,
} from "@/lib/email/support-ticket-emails";
import {
  normalizeMessageVisibility,
  type SupportMessageVisibility,
} from "@/lib/support/message-visibility";
import { getAdminFirestore } from "@/lib/firebase/admin";

const ADMIN_PREVIEW_COOKIE = "admin_preview_gate";

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

type MessageAuthorType = "customer" | "agent";

interface MessageAttachmentInput {
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  contentBase64?: string;
}

interface CreateMessageBody {
  body?: string;
  visibility?: SupportMessageVisibility;
  attachment?: MessageAttachmentInput;
}

function timestampToIso(value: admin.firestore.Timestamp | null | undefined): string {
  if (!value) return new Date().toISOString();
  return value.toDate().toISOString();
}

function hasAdminAccess(request: NextRequest): boolean {
  return request.cookies.get(ADMIN_PREVIEW_COOKIE)?.value === "1";
}

function parseAttachment(input: MessageAttachmentInput | undefined) {
  if (!input?.fileName?.trim() || !input.contentBase64?.trim()) {
    return null;
  }

  const fileName = input.fileName.trim();
  const mimeType = (input.mimeType?.trim() || "application/octet-stream").toLowerCase();
  const sizeBytes = typeof input.sizeBytes === "number" ? input.sizeBytes : 0;

  if (!ALLOWED_ATTACHMENT_TYPES.has(mimeType)) {
    throw new Error("Attachment type is not allowed");
  }
  if (sizeBytes > MAX_ATTACHMENT_BYTES) {
    throw new Error("Attachment exceeds maximum size");
  }

  return {
    fileName,
    mimeType,
    sizeBytes,
    contentBase64: input.contentBase64.trim(),
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ticketId: string }> },
) {
  if (!hasAdminAccess(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ticketId } = await context.params;
    if (!ticketId) {
      return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const ticketRef = db.collection("supportTickets").doc(ticketId);
    const ticketSnap = await ticketRef.get();
    if (!ticketSnap.exists) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    const ticketData = ticketSnap.data() as Record<string, unknown>;
    const initialDescription =
      typeof ticketData.description === "string" ? ticketData.description.trim() : "";
    const createdByName =
      typeof ticketData.createdByName === "string" && ticketData.createdByName.trim()
        ? ticketData.createdByName.trim()
        : "Customer";
    const createdAtIso = timestampToIso(
      ticketData.createdAt as admin.firestore.Timestamp | undefined,
    );

    let messagesSnap: admin.firestore.QuerySnapshot;
    try {
      messagesSnap = await ticketRef.collection("messages").orderBy("createdAt", "asc").get();
    } catch {
      messagesSnap = await ticketRef.collection("messages").get();
    }
    const messages = messagesSnap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        authorType: (data.authorType as MessageAuthorType) ?? "agent",
        authorName: (data.authorName as string) ?? "adAlert Support",
        body: (data.body as string) ?? "",
        visibility: normalizeMessageVisibility(data.visibility),
        attachment: data.attachment ?? null,
        createdAt: timestampToIso(data.createdAt as admin.firestore.Timestamp | undefined),
      };
    });

    if (initialDescription) {
      messages.unshift({
        id: "initial-description",
        authorType: "customer",
        authorName: createdByName,
        body: initialDescription,
        visibility: "public",
        attachment: null,
        createdAt: createdAtIso,
      });
    }

    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load messages" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ ticketId: string }> },
) {
  if (!hasAdminAccess(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ticketId } = await context.params;
    if (!ticketId) {
      return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
    }

    const body = (await request.json()) as CreateMessageBody;
    const content = body.body?.trim() ?? "";
    const visibility = normalizeMessageVisibility(body.visibility);

    if (!content) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    let attachment: ReturnType<typeof parseAttachment> = null;
    try {
      attachment = parseAttachment(body.attachment);
    } catch (attachmentError) {
      return NextResponse.json(
        { error: (attachmentError as Error).message || "Invalid attachment" },
        { status: 400 },
      );
    }

    if (attachment && visibility !== "public") {
      return NextResponse.json(
        { error: "Attachments are only supported on public replies" },
        { status: 400 },
      );
    }

    const db = getAdminFirestore();
    const ticketRef = db.collection("supportTickets").doc(ticketId);
    const ticketSnap = await ticketRef.get();
    if (!ticketSnap.exists) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    const ticketData = ticketSnap.data() as Record<string, unknown>;

    const now = admin.firestore.FieldValue.serverTimestamp();
    const messageRef = ticketRef.collection("messages").doc();
    const messagePayload: Record<string, unknown> = {
      authorType: "agent",
      authorName: "adAlert Support",
      body: content,
      visibility,
      createdAt: now,
    };

    if (attachment) {
      messagePayload.attachment = {
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
      };
    }

    await messageRef.set(messagePayload);

    const ticketUpdate: Record<string, unknown> = {
      updatedAt: now,
      lastMessagePreview: content.length > 140 ? `${content.slice(0, 140)}…` : content,
    };

    if (visibility === "public") {
      ticketUpdate.status = "pending_customer";
    }

    await ticketRef.update(ticketUpdate);

    const customerEmail =
      typeof ticketData.createdByEmail === "string" ? ticketData.createdByEmail.trim() : "";
    const ticketCode =
      typeof ticketData.ticketCode === "string" && ticketData.ticketCode.trim()
        ? ticketData.ticketCode
        : ticketId;
    const ticketSubject =
      typeof ticketData.subject === "string" && ticketData.subject.trim()
        ? ticketData.subject
        : "Support ticket update";

    if (customerEmail && (visibility === "public" || visibility === "note")) {
      try {
        const emailContent =
          visibility === "note"
            ? buildConsumerSupportNoteEmail({
                request,
                ticketCode,
                subject: ticketSubject,
                noteBody: content,
              })
            : buildConsumerAdminReplyEmail({
                request,
                ticketCode,
                subject: ticketSubject,
                replyBody: content,
              });

        await sendEmail({
          to: [customerEmail],
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html,
          from: SUPPORT_NO_REPLY_EMAIL,
          attachments: attachment
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
      } catch (emailError) {
        console.error("Failed to send customer support message email:", emailError);
      }
    }

    const saved = await messageRef.get();
    const savedData = saved.data() as Record<string, unknown>;
    return NextResponse.json({
      message: {
        id: saved.id,
        authorType: "agent" as const,
        authorName: (savedData.authorName as string) ?? "adAlert Support",
        body: (savedData.body as string) ?? content,
        visibility: normalizeMessageVisibility(savedData.visibility),
        attachment: savedData.attachment ?? null,
        createdAt: timestampToIso(savedData.createdAt as admin.firestore.Timestamp | undefined),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to send message" },
      { status: 500 },
    );
  }
}
