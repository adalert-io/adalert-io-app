import type { SupportTicket } from "./types";

/** Placeholder data for help center UI until backend is wired. */
export const MOCK_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: "TKT-1042",
    subject: "Google Ads account not appearing after OAuth",
    category: "Ad account connection",
    status: "in_progress",
    priority: "high",
    createdAt: "2026-05-22T14:30:00.000Z",
    updatedAt: "2026-05-24T09:15:00.000Z",
    lastMessagePreview:
      "Our team is reviewing your connection logs. We'll update you within one business day.",
  },
  {
    id: "TKT-1038",
    subject: "Invoice PDF download link expired",
    category: "Billing & subscription",
    status: "waiting",
    priority: "medium",
    createdAt: "2026-05-18T11:00:00.000Z",
    updatedAt: "2026-05-23T16:42:00.000Z",
    lastMessagePreview:
      "Could you confirm the billing email on file so we can resend the receipt?",
  },
  {
    id: "TKT-1021",
    subject: "Severity colors on dashboard look different than expected",
    category: "Dashboard & reporting",
    status: "open",
    priority: "low",
    createdAt: "2026-05-25T08:20:00.000Z",
    updatedAt: "2026-05-25T08:20:00.000Z",
    lastMessagePreview: "Ticket received. A support specialist will respond shortly.",
  },
  {
    id: "TKT-0994",
    subject: "Invite email not received for new team member",
    category: "Users & permissions",
    status: "resolved",
    priority: "medium",
    createdAt: "2026-05-10T09:45:00.000Z",
    updatedAt: "2026-05-12T13:30:00.000Z",
    lastMessagePreview:
      "Resolved — invitation resent successfully. Please ask them to check spam.",
  },
];
