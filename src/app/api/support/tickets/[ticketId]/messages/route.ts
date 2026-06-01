import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

import { sendEmail } from "@/lib/email/sendgrid";
import {
  SUPPORT_ALERT_RECIPIENTS,
  SUPPORT_NO_REPLY_EMAIL,
  buildAdminCustomerReplyEmail,
} from "@/lib/email/support-ticket-emails";
import {
  parseSupportAttachment,
  type SupportMessageAttachmentDto,
  type SupportMessageAttachmentInput,
  type SupportMessageAttachmentMeta,
} from "@/lib/support/attachments";
import {
  isConversationMessage,
  isCustomerNote,
  normalizeMessageVisibility,
} from "@/lib/support/message-visibility";
import {
  buildSupportAttachmentStoragePath,
  enrichAttachmentWithUrls,
  uploadSupportAttachment,
} from "@/lib/support/storage-attachments";
import { getAdminFirestore, verifyFirebaseIdToken } from "@/lib/firebase/admin";

type MessageAuthorType = "customer" | "agent";

interface CreateMessageBody {
  body?: string;
  attachment?: SupportMessageAttachmentInput;
}

function mapAttachmentMeta(
  data: Record<string, unknown>,
): SupportMessageAttachmentMeta | null {
  const raw = data.attachment;
  if (!raw || typeof raw !== "object") return null;
  const attachment = raw as Record<string, unknown>;
  const fileName = typeof attachment.fileName === "string" ? attachment.fileName : "";
  if (!fileName) return null;
  const storagePath =
    typeof attachment.storagePath === "string" && attachment.storagePath.trim()
      ? attachment.storagePath.trim()
      : undefined;

  return {
    fileName,
    mimeType:
      typeof attachment.mimeType === "string" ? attachment.mimeType : "application/octet-stream",
    sizeBytes: typeof attachment.sizeBytes === "number" ? attachment.sizeBytes : 0,
    storagePath,
  };
}

type ThreadMessageDto = {
  id: string;
  authorType: MessageAuthorType;
  authorName: string;
  body: string;
  attachment: SupportMessageAttachmentDto | null;
  createdAt: string;
};

async function enrichThreadMessage(message: {
  id: string;
  authorType: MessageAuthorType;
  authorName: string;
  body: string;
  attachment: SupportMessageAttachmentMeta | null;
  createdAt: string;
}): Promise<ThreadMessageDto> {
  return {
    ...message,
    attachment: await enrichAttachmentWithUrls(message.attachment),
  };
}
function timestampToIso(value: admin.firestore.Timestamp | null | undefined): string {
  if (!value) return new Date().toISOString();
  return value.toDate().toISOString();
}

async function findOwnedTicketRef({
  db,
  uid,
  ticketId,
}: {
  db: admin.firestore.Firestore;
  uid: string;
  ticketId: string;
}) {
  const byDocId = await db.collection("supportTickets").doc(ticketId).get();
  if (byDocId.exists) {
    const data = byDocId.data() as Record<string, unknown>;
    if (data.createdByUid === uid) return byDocId.ref;
  }

  const byCode = await db
    .collection("supportTickets")
    .where("createdByUid", "==", uid)
    .where("ticketCode", "==", ticketId)
    .limit(1)
    .get();

  if (!byCode.empty) return byCode.docs[0].ref;
  return null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ticketId: string }> },
) {
  try {
    const decoded = await verifyFirebaseIdToken(request.headers.get("authorization"));
    const { ticketId } = await context.params;

    if (!ticketId) {
      return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const ticketRef = await findOwnedTicketRef({
      db,
      uid: decoded.uid,
      ticketId: decodeURIComponent(ticketId),
    });

    if (!ticketRef) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const ticketSnap = await ticketRef.get();
    const ticketData = ticketSnap.data() as Record<string, unknown>;
    const initialDescription =
      typeof ticketData.description === "string" ? ticketData.description.trim() : "";
    const createdByName =
      typeof ticketData.createdByName === "string" && ticketData.createdByName.trim()
        ? ticketData.createdByName.trim()
        : "You";

    const createdAtIso = timestampToIso(
      ticketData.createdAt as admin.firestore.Timestamp | undefined,
    );

    let messagesSnap: admin.firestore.QuerySnapshot;
    try {
      messagesSnap = await ticketRef.collection("messages").orderBy("createdAt", "asc").get();
    } catch {
      messagesSnap = await ticketRef.collection("messages").get();
    }

    const conversation: Array<{
      id: string;
      authorType: MessageAuthorType;
      authorName: string;
      body: string;
      attachment: SupportMessageAttachmentMeta | null;
      createdAt: string;
    }> = [];
    const notes: Array<{
      id: string;
      authorType: MessageAuthorType;
      authorName: string;
      body: string;
      attachment: SupportMessageAttachmentMeta | null;
      createdAt: string;
    }> = [];

    for (const doc of messagesSnap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const visibility = normalizeMessageVisibility(data.visibility);
      if (!isConversationMessage(visibility) && !isCustomerNote(visibility)) continue;

      const item = {
        id: doc.id,
        authorType: (data.authorType as MessageAuthorType) ?? "agent",
        authorName: (data.authorName as string) ?? "adAlert Support",
        body: (data.body as string) ?? "",
        attachment: mapAttachmentMeta(data),
        createdAt: timestampToIso(data.createdAt as admin.firestore.Timestamp | undefined),
      };

      if (isCustomerNote(visibility)) {
        notes.push(item);
      } else {
        conversation.push(item);
      }
    }

    const ticketAttachments = Array.isArray(ticketData.attachments)
      ? (ticketData.attachments as SupportMessageAttachmentMeta[])
      : [];

    if (initialDescription) {
      conversation.unshift({
        id: "initial-description",
        authorType: "customer",
        authorName: createdByName,
        body: initialDescription,
        attachment: ticketAttachments[0] ?? null,
        createdAt: createdAtIso,
      });
    }

    const [enrichedMessages, enrichedNotes] = await Promise.all([
      Promise.all(conversation.map((message) => enrichThreadMessage(message))),
      Promise.all(notes.map((message) => enrichThreadMessage(message))),
    ]);

    return NextResponse.json({ messages: enrichedMessages, notes: enrichedNotes });
  } catch (error) {
    const status =
      typeof (error as { status?: number }).status === "number"
        ? (error as { status: number }).status
        : 500;
    return NextResponse.json(
      { error: (error as Error).message ?? "Failed to load messages" },
      { status },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ ticketId: string }> },
) {
  try {
    const decoded = await verifyFirebaseIdToken(request.headers.get("authorization"));
    const { ticketId } = await context.params;

    if (!ticketId) {
      return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
    }

    const body = (await request.json()) as CreateMessageBody;
    const content = body.body?.trim() ?? "";
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

    const db = getAdminFirestore();
    const ticketRef = await findOwnedTicketRef({
      db,
      uid: decoded.uid,
      ticketId: decodeURIComponent(ticketId),
    });

    if (!ticketRef) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const messageRef = ticketRef.collection("messages").doc();
    const messagePayload: Record<string, unknown> = {
      authorType: "customer",
      authorName: decoded.name ?? decoded.email ?? "You",
      body: content,
      visibility: "public",
      createdAt: now,
    };

    if (attachment) {
      const storagePath = buildSupportAttachmentStoragePath({
        ticketId: ticketRef.id,
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

    await ticketRef.update({
      updatedAt: now,
      status: "in_progress",
      adminUnread: true,
      lastMessagePreview: content.length > 140 ? `${content.slice(0, 140)}…` : content,
    });

    try {
      const ticketSnap = await ticketRef.get();
      const ticketData = ticketSnap.data() as Record<string, unknown>;
      const ticketCode =
        typeof ticketData.ticketCode === "string" && ticketData.ticketCode.trim()
          ? ticketData.ticketCode
          : ticketId;
      const ticketSubject =
        typeof ticketData.subject === "string" && ticketData.subject.trim()
          ? ticketData.subject
          : "Support ticket update";
      const customerName = decoded.name ?? decoded.email ?? "Customer";
      const customerEmail = decoded.email ?? "unknown@customer";
      const adminEmail = buildAdminCustomerReplyEmail({
        request,
        ticketCode,
        subject: ticketSubject,
        customerName,
        customerEmail,
        replyBody: content,
      });

      await sendEmail({
        to: SUPPORT_ALERT_RECIPIENTS,
        subject: adminEmail.subject,
        text: adminEmail.text,
        html: adminEmail.html,
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
      console.error("Failed to send admin alert for customer reply:", emailError);
    }

    const saved = await messageRef.get();
    const savedData = saved.data() as Record<string, unknown>;
    const savedMessage = await enrichThreadMessage({
      id: saved.id,
      authorType: "customer",
      authorName: (savedData.authorName as string) ?? "You",
      body: (savedData.body as string) ?? content,
      attachment: mapAttachmentMeta(savedData),
      createdAt: timestampToIso(savedData.createdAt as admin.firestore.Timestamp | undefined),
    });

    return NextResponse.json({ message: savedMessage });
  } catch (error) {
    const status =
      typeof (error as { status?: number }).status === "number"
        ? (error as { status: number }).status
        : 500;
    return NextResponse.json(
      { error: (error as Error).message ?? "Failed to send message" },
      { status },
    );
  }
}
