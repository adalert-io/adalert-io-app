import { NextRequest, NextResponse } from "next/server";
import type admin from "firebase-admin";

import { getAdminFirestore, verifyFirebaseIdToken } from "@/lib/firebase/admin";

interface SupportTicketAttachmentDto {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
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
  attachments?: SupportTicketAttachmentDto[];
}

function timestampToIso(value: admin.firestore.Timestamp | null | undefined): string {
  if (!value) return new Date(0).toISOString();
  return value.toDate().toISOString();
}

function normalizeConsumerStatus(value: unknown): SupportTicketApiDto["status"] {
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
      ? (data.attachments as SupportTicketAttachmentDto[])
      : [],
  };
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
    return NextResponse.json({ ticket: docToDto(ticketSnap) });
  } catch (error) {
    const status =
      typeof (error as { status?: number }).status === "number"
        ? (error as { status: number }).status
        : 500;
    return NextResponse.json(
      { error: (error as Error).message ?? "Failed to load ticket" },
      { status },
    );
  }
}
