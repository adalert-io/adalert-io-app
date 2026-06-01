import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

import { sendEmail } from "@/lib/email/sendgrid";
import { getAdminFirestore, verifyFirebaseIdToken } from "@/lib/firebase/admin";

type MessageAuthorType = "customer" | "agent";
interface CreateMessageBody {
  body?: string;
}
const SUPPORT_ALERT_RECIPIENTS = ["support@adalert.io", "info@webds.com", "mohit@webds.com"];
const SUPPORT_NO_REPLY_EMAIL =
  process.env.SENDGRID_SUPPORT_NO_REPLY_SENDER ?? "no-reply@adalert.io";

function timestampToIso(value: admin.firestore.Timestamp | null | undefined): string {
  if (!value) return new Date().toISOString();
  return value.toDate().toISOString();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildPortalTicketLink({
  request,
  ticketCode,
}: {
  request: NextRequest;
  ticketCode: string;
}): string {
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
  return `${appBaseUrl}/consumer/help/${encodeURIComponent(ticketCode)}`;
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
          authorName: (data.authorName as string) ?? "adAlert Support",
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
      const ticketPortalLink = buildPortalTicketLink({ request, ticketCode });

      const emailSubject = `[adAlert Support] Customer Reply ${ticketCode}`;
      const text = [
        "A customer has replied on a support ticket.",
        "",
        `Ticket: ${ticketCode}`,
        `Subject: ${ticketSubject}`,
        `Customer: ${customerName}`,
        `Email: ${customerEmail}`,
        "",
        "Customer Reply:",
        content,
        "",
        `Support portal thread: ${ticketPortalLink}`,
        "Please review and respond from the Support dashboard.",
      ].join("\n");

      const html = `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.45;">
          <h2 style="margin: 0 0 12px;">adAlert Support: Customer Reply Received</h2>
          <p style="margin: 0 0 12px;">A customer has posted a new message on a support ticket.</p>
          <p style="margin: 0 0 14px; color: #334155;">
            <strong>Ticket:</strong> ${escapeHtml(ticketCode)}<br />
            <strong>Subject:</strong> ${escapeHtml(ticketSubject)}<br />
            <strong>Customer:</strong> ${escapeHtml(customerName)}<br />
            <strong>Email:</strong> ${escapeHtml(customerEmail)}
          </p>
          <div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; white-space: pre-wrap;">
            ${escapeHtml(content)}
          </div>
          <p style="margin: 14px 0 0;">
            <a href="${ticketPortalLink}" style="color: #015AFD; text-decoration: none; font-weight: 600;">
              Open this ticket in the support portal
            </a>
          </p>
          <p style="margin: 14px 0 0; color: #475569; font-size: 12px;">
            This mailbox does not accept replies. Please use the support portal.
          </p>
        </div>
      `;

      await sendEmail({
        to: SUPPORT_ALERT_RECIPIENTS,
        subject: emailSubject,
        text,
        html,
        from: SUPPORT_NO_REPLY_EMAIL,
      });

      if (decoded.email) {
        const customerSubject = `[adAlert Support] Reply Received ${ticketCode}`;
        const customerText = [
          "Your reply has been posted to your support ticket.",
          "",
          `Ticket: ${ticketCode}`,
          `Subject: ${ticketSubject}`,
          "",
          "You can track and continue this conversation from the support portal:",
          ticketPortalLink,
          "",
          "This email is sent from a no-reply mailbox.",
        ].join("\n");
        const customerHtml = `
          <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.45;">
            <h2 style="margin: 0 0 12px;">adAlert Support: Reply Received</h2>
            <p style="margin: 0 0 10px;">We've posted your latest ticket reply.</p>
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
