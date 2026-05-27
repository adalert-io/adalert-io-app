export type SupportTicketStatus =
  | "open"
  | "in_progress"
  | "waiting"
  | "resolved";

export type SupportTicketPriority = "low" | "medium" | "high";

export type SupportTicketFilter = "all" | SupportTicketStatus;

export interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string;
}

export interface NewSupportTicketForm {
  subject: string;
  category: string;
  priority: SupportTicketPriority;
  description: string;
}
