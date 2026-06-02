import { NextRequest, NextResponse } from "next/server";
import type admin from "firebase-admin";

import { COLLECTIONS } from "@/lib/constants";
import { getAdminFirestore } from "@/lib/firebase/admin";

const ADMIN_PREVIEW_COOKIE = "admin_preview_gate";

type AdminTicketStatus = "open" | "in_progress" | "pending_customer" | "resolved";
type AdminTicketPriority = "low" | "medium" | "high";

interface AdminSupportTicketDto {
  id: string;
  ticketCode: string;
  subject: string;
  companyName: string;
  email: string;
  status: AdminTicketStatus;
  priority: AdminTicketPriority;
  categoryLabel: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  adminUnread: boolean;
}

function timestampToIso(value: admin.firestore.Timestamp | null | undefined): string {
  if (!value) return new Date(0).toISOString();
  return value.toDate().toISOString();
}

function normalizeStatus(value: unknown): AdminTicketStatus {
  if (value === "open" || value === "in_progress" || value === "resolved") return value;
  if (value === "pending_customer" || value === "waiting") return "pending_customer";
  return "open";
}

function normalizePriority(value: unknown): AdminTicketPriority {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "medium";
}

async function resolveCompanyName({
  db,
  createdByUid,
  createdByName,
  createdByEmail,
}: {
  db: admin.firestore.Firestore;
  createdByUid?: string;
  createdByName?: string;
  createdByEmail?: string;
}): Promise<string> {
  if (!createdByUid) return createdByName || createdByEmail || "Customer";

  try {
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(createdByUid).get();
    if (!userDoc.exists) return createdByName || createdByEmail || "Customer";
    const userData = userDoc.data() as Record<string, unknown>;
    const companyField = userData["Company Name"] ?? userData["Company"] ?? userData["Name"];
    if (typeof companyField === "string" && companyField.trim()) return companyField;
    return createdByName || createdByEmail || "Customer";
  } catch {
    return createdByName || createdByEmail || "Customer";
  }
}

export async function GET(request: NextRequest) {
  if (request.cookies.get(ADMIN_PREVIEW_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminFirestore();
    const { searchParams } = new URL(request.url);
    const archivedParam = searchParams.get("archived");
    const shouldLoadArchived = archivedParam === "1" || archivedParam === "true";
    const snap = await db.collection("supportTickets").orderBy("updatedAt", "desc").get();

    const tickets = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data() as Record<string, unknown>;
        const isArchived = data.isArchived === true;
        if (isArchived !== shouldLoadArchived) return null;
        const createdByEmail =
          typeof data.createdByEmail === "string" ? data.createdByEmail : "";
        const createdByName =
          typeof data.createdByName === "string" ? data.createdByName : "";
        const createdByUid = typeof data.createdByUid === "string" ? data.createdByUid : "";

        const companyName = await resolveCompanyName({
          db,
          createdByUid,
          createdByName,
          createdByEmail,
        });

        const ticket: AdminSupportTicketDto = {
          id: doc.id,
          ticketCode:
            typeof data.ticketCode === "string" && data.ticketCode.trim()
              ? data.ticketCode
              : doc.id,
          subject:
            typeof data.subject === "string" && data.subject.trim()
              ? data.subject
              : "Untitled ticket",
          companyName,
          email: createdByEmail || "unknown@customer",
          status: normalizeStatus(data.status),
          priority: normalizePriority(data.priority),
          categoryLabel:
            typeof data.category === "string" && data.category.trim()
              ? data.category
              : "General",
          description: typeof data.description === "string" ? data.description : "",
          createdAt: timestampToIso(data.createdAt as admin.firestore.Timestamp | undefined),
          updatedAt: timestampToIso(data.updatedAt as admin.firestore.Timestamp | undefined),
          adminUnread: data.adminUnread === true,
        };

        return ticket;
      }),
    );
    return NextResponse.json({ tickets: tickets.filter((ticket): ticket is AdminSupportTicketDto => ticket !== null) });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load admin tickets" },
      { status: 500 },
    );
  }
}
