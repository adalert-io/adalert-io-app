import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

import { sendEmail } from "@/lib/email/sendgrid";
import { getAdminFirestore, verifyFirebaseIdToken } from "@/lib/firebase/admin";

type MessageAuthorType = "customer" | "agent";
interface CreateMessageBody {
  body?: string;
}
const SUPPORT_ALERT_RECIPIENTS = ["support@adalert.io", "info@webds.com", "mohit@webds.com"];

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

    const messages = messagesSnap.docs
      .map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const visibility = data.visibility === "internal" ? "internal" : "public";
        if (visibility === "internal") return null;

        return {
          id: doc.id,
          authorType: (data.authorType as MessageAuthorType) ?? "agent",
          authorName: (data.authorName as string) ?? "AdAlert Support",
          body: (data.body as string) ?? "",
          createdAt: timestampToIso(data.createdAt as admin.firestore.Timestamp | undefined),
        };
      })
      .filter((message): message is NonNullable<typeof message> => message !== null);

    if (initialDescription) {
      messages.unshift({
        id: "initial-description",
        authorType: "customer",
        authorName: createdByName,
        body: initialDescription,
        createdAt: createdAtIso,
      });
    }

    return NextResponse.json({ messages });
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
    await messageRef.set({
      authorType: "customer",
      authorName: decoded.name ?? decoded.email ?? "You",
      body: content,
      visibility: "public",
      createdAt: now,
    });

    await ticketRef.update({
      updatedAt: now,
      status: "in_progress",
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

      const emailSubject = `Customer replied: ${ticketCode}`;
      const text = [
        "A customer has replied on a support ticket.",
        "",
        `Ticket: ${ticketCode}`,
        `Subject: ${ticketSubject}`,
        `Customer: ${customerName}`,
        `Email: ${customerEmail}`,
        "",
        "Message:",
        content,
      ].join("\n");

      const html = `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.45;">
          <h2 style="margin: 0 0 12px;">Customer reply received</h2>
          <p style="margin: 0 0 12px;">A customer has replied on a support ticket.</p>
          <p style="margin: 0 0 14px; color: #334155;">
            <strong>Ticket:</strong> ${ticketCode}<br />
            <strong>Subject:</strong> ${ticketSubject}<br />
            <strong>Customer:</strong> ${customerName}<br />
            <strong>Email:</strong> ${customerEmail}
          </p>
          <div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; white-space: pre-wrap;">
            ${content}
          </div>
        </div>
      `;

      await sendEmail({
        to: SUPPORT_ALERT_RECIPIENTS,
        subject: emailSubject,
        text,
        html,
      });
    } catch (emailError) {
      console.error("Failed to send admin alert for customer reply:", emailError);
    }

    const saved = await messageRef.get();
    const savedData = saved.data() as Record<string, unknown>;
    return NextResponse.json({
      message: {
        id: saved.id,
        authorType: "customer" as const,
        authorName: (savedData.authorName as string) ?? "You",
        body: (savedData.body as string) ?? content,
        createdAt: timestampToIso(savedData.createdAt as admin.firestore.Timestamp | undefined),
      },
    });
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
