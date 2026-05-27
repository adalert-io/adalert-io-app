import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

import { getAdminFirestore } from "@/lib/firebase/admin";

const ADMIN_PREVIEW_COOKIE = "admin_preview_gate";

type MessageAuthorType = "customer" | "agent";
type MessageVisibility = "public" | "internal";

interface CreateMessageBody {
  body?: string;
  visibility?: MessageVisibility;
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

    const messagesSnap = await ticketRef.collection("messages").orderBy("createdAt", "asc").get();
    const messages = messagesSnap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        authorType: (data.authorType as MessageAuthorType) ?? "agent",
        authorName: (data.authorName as string) ?? "AdAlert Support",
        body: (data.body as string) ?? "",
        visibility: (data.visibility as MessageVisibility) ?? "public",
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
    const visibility: MessageVisibility =
      body.visibility === "internal" ? "internal" : "public";

    if (!content) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const ticketRef = db.collection("supportTickets").doc(ticketId);
    const ticketSnap = await ticketRef.get();
    if (!ticketSnap.exists) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const messageRef = ticketRef.collection("messages").doc();
    await messageRef.set({
      authorType: "agent",
      authorName: "AdAlert Support",
      body: content,
      visibility,
      createdAt: now,
    });

    await ticketRef.update({
      updatedAt: now,
      lastMessagePreview: content.length > 140 ? `${content.slice(0, 140)}…` : content,
      ...(visibility === "public" ? { status: "pending_customer" } : {}),
    });

    const saved = await messageRef.get();
    const savedData = saved.data() as Record<string, unknown>;
    return NextResponse.json({
      message: {
        id: saved.id,
        authorType: "agent" as const,
        authorName: (savedData.authorName as string) ?? "AdAlert Support",
        body: (savedData.body as string) ?? content,
        visibility: (savedData.visibility as MessageVisibility) ?? visibility,
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
