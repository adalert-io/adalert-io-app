export type SupportTicketStatus =
  | "open"
  | "in_progress"
  | "waiting"
  | "resolved";

export type SupportTicketPriority = "low" | "medium" | "high";

export type SupportTicketFilter = "all" | SupportTicketStatus;

export interface SupportTicketAttachmentMeta {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath?: string;
  previewUrl?: string | null;
  downloadUrl?: string | null;
}

export interface SupportTicket {
  id: string;
  documentId: string;
  subject: string;
  category: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string;
  attachments?: SupportTicketAttachmentMeta[];
}

export interface SupportTicketMessage {
  id: string;
  authorType: "customer" | "agent";
  authorName: string;
  body: string;
  createdAt: string;
  attachment?: SupportTicketAttachmentMeta | null;
}

export interface NewSupportTicketForm {
  subject: string;
  category: string;
  priority: SupportTicketPriority;
  description: string;
  attachment: File | null;
}

export interface SupportTicketAttachment {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}
