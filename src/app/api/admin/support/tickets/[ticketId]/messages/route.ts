import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

import { sendEmail } from "@/lib/email/sendgrid";
import {
  SUPPORT_NO_REPLY_EMAIL,
  buildConsumerAdminReplyEmail,
  buildConsumerSupportNoteEmail,
} from "@/lib/email/support-ticket-emails";
import {
  parseSupportAttachment,
  type SupportMessageAttachmentInput,
} from "@/lib/support/attachments";
import {
  normalizeMessageVisibility,
  type SupportMessageVisibility,
} from "@/lib/support/message-visibility";
import {
  buildSupportAttachmentStoragePath,
  enrichAttachmentWithUrls,
  uploadSupportAttachment,
} from "@/lib/support/storage-attachments";
import { getAdminFirestore } from "@/lib/firebase/admin";

const ADMIN_PREVIEW_COOKIE = "admin_preview_gate";

type MessageAuthorType = "customer" | "agent";

interface CreateMessageBody {
  body?: string;
  visibility?: SupportMessageVisibility;
  attachment?: SupportMessageAttachmentInput;
}

function timestampToIso(value: admin.firestore.Timestamp | null | undefined): string {
  if (!value) return new Date().toISOString();
  return value.toDate().toISOString();
}

function hasAdminAccess(request: NextRequest): boolean {
  return request.cookies.get(ADMIN_PREVIEW_COOKIE)?.value === "1";
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
    const ticketAttachments = Array.isArray(ticketData.attachments)
      ? ticketData.attachments
      : [];

    const messages = await Promise.all(
      messagesSnap.docs.map(async (doc) => {
        const data = doc.data() as Record<string, unknown>;
        const rawAttachment = data.attachment;
        return {
          id: doc.id,
          authorType: (data.authorType as MessageAuthorType) ?? "agent",
          authorName: (data.authorName as string) ?? "adAlert Support",
          body: (data.body as string) ?? "",
          visibility: normalizeMessageVisibility(data.visibility),
          attachment: await enrichAttachmentWithUrls(
            rawAttachment && typeof rawAttachment === "object"
              ? (rawAttachment as {
                  fileName: string;
                  mimeType: string;
                  sizeBytes: number;
                  storagePath?: string;
                })
              : null,
          ),
          createdAt: timestampToIso(data.createdAt as admin.firestore.Timestamp | undefined),
        };
      }),
    );

    if (initialDescription) {
      const initialAttachment = ticketAttachments[0];
      messages.unshift({
        id: "initial-description",
        authorType: "customer",
        authorName: createdByName,
        body: initialDescription,
        visibility: "public",
        attachment: await enrichAttachmentWithUrls(
          initialAttachment && typeof initialAttachment === "object"
            ? (initialAttachment as {
                fileName: string;
                mimeType: string;
                sizeBytes: number;
                storagePath?: string;
              })
            : null,
        ),
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

    let attachment: ReturnType<typeof parseSupportAttachment> = null;
    try {
      attachment = parseSupportAttachment(body.attachment);
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
      const storagePath = buildSupportAttachmentStoragePath({
        ticketId,
        scopeId: messageRef.id,
        fileName: attachment.fileName,
      });
      await uploadSupportAttachment({
        storagePath,
        buffer: Buffer.from(attachment.contentBase64, "base64"),
        mimeType: attachment.mimeType,
      });
      messagePayload.attachment = {
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        storagePath,
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
    const rawAttachment = savedData.attachment;
    return NextResponse.json({
      message: {
        id: saved.id,
        authorType: "agent" as const,
        authorName: (savedData.authorName as string) ?? "adAlert Support",
        body: (savedData.body as string) ?? content,
        visibility: normalizeMessageVisibility(savedData.visibility),
        attachment: await enrichAttachmentWithUrls(
          rawAttachment && typeof rawAttachment === "object"
            ? (rawAttachment as {
                fileName: string;
                mimeType: string;
                sizeBytes: number;
                storagePath?: string;
              })
            : null,
        ),
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
