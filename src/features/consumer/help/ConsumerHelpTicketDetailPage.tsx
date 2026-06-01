"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Paperclip,
  Send,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  formatAttachmentSize,
  SUPPORT_MAX_ATTACHMENT_BYTES,
} from "@/lib/support/attachments";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";

import { FormattedEmailBody } from "./FormattedEmailBody";
import {
  CONSUMER_HELP_HREF,
  formatTicketDate,
  formatTicketRelative,
  priorityLabel,
  statusBadgeClass,
  statusLabel,
} from "./helpers";
import type {
  SupportTicket,
  SupportTicketAttachmentMeta,
  SupportTicketMessage,
} from "./types";

const SUPPORT_INBOX_LABEL = "adAlert Support";
const SUPPORT_INBOX_EMAIL = "support@adalert.io";

interface PendingReplyAttachment extends SupportTicketAttachmentMeta {
  contentBase64: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read attachment"));
        return;
      }
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 ?? "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read attachment"));
    reader.readAsDataURL(file);
  });
}

function formatMessageTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function EmailAddress({ name, email }: { name: string; email?: string }) {
  if (email) {
    return (
      <span>
        <span className="font-semibold text-slate-900">{name}</span>
        <span className="text-slate-500">
          {" "}
          &lt;{email}&gt;
        </span>
      </span>
    );
  }
  return <span className="font-semibold text-slate-900">{name}</span>;
}

function EmailMetaLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[3.5rem_1fr] gap-x-2 text-[13px] leading-snug sm:grid-cols-[4.5rem_1fr]">
      <span className="pt-0.5 font-medium text-slate-500">{label}</span>
      <div className="min-w-0 text-slate-800">{children}</div>
    </div>
  );
}

function AttachmentChip({ attachment }: { attachment: SupportTicketAttachmentMeta }) {
  return (
    <div className="inline-flex max-w-full items-center gap-2.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] shadow-sm">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white ring-1 ring-slate-200">
        <FileText className="size-4 text-[#015AFD]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900">{attachment.fileName}</p>
        <p className="text-[12px] text-slate-500">{formatAttachmentSize(attachment.sizeBytes)}</p>
      </div>
    </div>
  );
}

function EmailThreadMessage({
  message,
  customerDisplayName,
  customerEmail,
  threadSubject,
  isOriginal,
}: {
  message: SupportTicketMessage;
  customerDisplayName: string;
  customerEmail: string;
  threadSubject: string;
  isOriginal?: boolean;
}) {
  const isCustomer = message.authorType === "customer";
  const fromName = isCustomer
    ? customerDisplayName
    : message.authorName || SUPPORT_INBOX_LABEL;
  const fromEmail = isCustomer ? customerEmail : SUPPORT_INBOX_EMAIL;

  return (
    <article
      className={cn(
        "border-b border-slate-200 px-5 py-6 last:border-b-0 sm:px-8 lg:px-10",
        isOriginal ? "bg-slate-50/50" : "bg-white",
      )}
    >
      {isOriginal ? (
        <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-[#015AFD]">
          Original message
        </p>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <EmailMetaLine label="From">
            <EmailAddress name={fromName} email={fromEmail || undefined} />
          </EmailMetaLine>
          <EmailMetaLine label="To">
            {isCustomer ? (
              <EmailAddress name={SUPPORT_INBOX_LABEL} email={SUPPORT_INBOX_EMAIL} />
            ) : (
              <EmailAddress name={customerDisplayName} email={customerEmail || undefined} />
            )}
          </EmailMetaLine>
          {isOriginal ? (
            <EmailMetaLine label="Subject">
              <span className="font-medium text-slate-900">{threadSubject}</span>
            </EmailMetaLine>
          ) : (
            <EmailMetaLine label="Subject">
              <span className="text-slate-700">Re: {threadSubject}</span>
            </EmailMetaLine>
          )}
        </div>
        <time
          className="shrink-0 text-[12px] font-medium text-slate-500 tabular-nums sm:text-end"
          dateTime={message.createdAt}
        >
          {formatMessageTime(message.createdAt)}
        </time>
      </div>

      <div className="max-w-none">
        <FormattedEmailBody body={message.body} />
      </div>

      {message.attachment ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            1 attachment
          </p>
          <AttachmentChip attachment={message.attachment} />
        </div>
      ) : null}
    </article>
  );
}

export interface ConsumerHelpTicketDetailPageProps {
  ticketId: string;
}

export function ConsumerHelpTicketDetailPage({ ticketId }: ConsumerHelpTicketDetailPageProps) {
  const { user, userDoc } = useAuthStore();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [notes, setNotes] = useState<SupportTicketMessage[]>([]);
  const [replyBody, setReplyBody] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<PendingReplyAttachment | null>(
    null,
  );
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);

  const ticketKey = useMemo(() => decodeURIComponent(ticketId), [ticketId]);

  const customerDisplayName = useMemo(() => {
    const fromDoc =
      userDoc && typeof userDoc.Name === "string" && userDoc.Name.trim()
        ? userDoc.Name.trim()
        : "";
    return fromDoc || user?.displayName || user?.email?.split("@")[0] || "You";
  }, [user, userDoc]);

  const customerEmail = user?.email ?? "";

  useEffect(() => {
    if (!user || !ticketKey) return;
    const activeUser = user;
    let isUnmounted = false;

    async function loadTicket() {
      setIsLoadingTicket(true);
      try {
        const idToken = await activeUser.getIdToken();
        const response = await fetch(`/api/support/tickets/${encodeURIComponent(ticketKey)}`, {
          method: "GET",
          headers: { authorization: `Bearer ${idToken}` },
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          ticket?: SupportTicket;
          error?: string;
        };
        if (!response.ok || !payload.ticket) {
          throw new Error(payload.error || "Failed to load ticket");
        }
        if (!isUnmounted) setTicket(payload.ticket);
      } catch (error) {
        console.error("Failed to load ticket detail:", error);
        if (!isUnmounted) {
          setTicket(null);
          toast.error("Couldn't load ticket detail.");
        }
      } finally {
        if (!isUnmounted) setIsLoadingTicket(false);
      }
    }

    void loadTicket();
    return () => {
      isUnmounted = true;
    };
  }, [ticketKey, user]);

  useEffect(() => {
    if (!user || !ticketKey) return;
    const activeUser = user;
    let isUnmounted = false;

    async function loadMessages() {
      setIsLoadingMessages(true);
      try {
        const idToken = await activeUser.getIdToken();
        const response = await fetch(
          `/api/support/tickets/${encodeURIComponent(ticketKey)}/messages`,
          {
            method: "GET",
            headers: { authorization: `Bearer ${idToken}` },
            cache: "no-store",
          },
        );
        const payload = (await response.json()) as {
          messages?: SupportTicketMessage[];
          notes?: SupportTicketMessage[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load conversation");
        }
        if (!isUnmounted) {
          setMessages(payload.messages ?? []);
          setNotes(payload.notes ?? []);
        }
      } catch (error) {
        console.error("Failed to load ticket conversation:", error);
        if (!isUnmounted) {
          setMessages([]);
          setNotes([]);
        }
      } finally {
        if (!isUnmounted) setIsLoadingMessages(false);
      }
    }

    void loadMessages();
    return () => {
      isUnmounted = true;
    };
  }, [ticketKey, user]);

  const canSendReply =
    Boolean(replyBody.trim()) && Boolean(ticket) && Boolean(user) && !isSendingReply;

  const sendReply = async () => {
    if (!ticket || !user) return;
    const content = replyBody.trim();
    if (!content) return;

    setIsSendingReply(true);
    try {
      const idToken = await user.getIdToken();
      const postTicketId = ticket.documentId || ticket.id;
      const response = await fetch(
        `/api/support/tickets/${encodeURIComponent(postTicketId)}/messages`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            body: content,
            attachment: pendingAttachment ?? undefined,
          }),
        },
      );
      const payload = (await response.json()) as {
        message?: SupportTicketMessage;
        error?: string;
      };
      if (!response.ok || !payload.message) {
        throw new Error(payload.error || "Failed to send reply");
      }

      setMessages((prev) => [...prev, payload.message!]);
      setReplyBody("");
      setPendingAttachment(null);
      toast.success("Reply sent to support");
    } catch (error) {
      console.error("Failed to send customer reply:", error);
      toast.error("Couldn't send your reply.");
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="-mx-4 -mt-6 flex w-[calc(100%+2rem)] min-w-0 flex-col bg-white md:-mx-6 md:w-[calc(100%+3rem)] lg:-mx-8 lg:w-[calc(100%+4rem)]">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-3 backdrop-blur-sm sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ms-2 h-8 rounded-md px-2 text-slate-600 hover:text-slate-900"
          >
            <Link href={CONSUMER_HELP_HREF}>
              <ArrowLeft className="mr-1 size-4" aria-hidden />
              All tickets
            </Link>
          </Button>
          <ChevronRight className="size-3.5 text-slate-300" aria-hidden />
          <span className="truncate font-medium text-slate-700">Ticket thread</span>
        </div>
      </header>

      {isLoadingTicket ? (
        <div className="px-8 py-16 text-center text-[14px] text-slate-500">Loading ticket...</div>
      ) : !ticket ? (
        <div className="px-8 py-16 text-center text-[14px] text-slate-500">
          This ticket could not be found.
        </div>
      ) : (
        <>
          <div className="border-b border-slate-200 bg-white px-5 py-6 sm:px-8 lg:px-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[12px] font-semibold tracking-wide text-[#015AFD]">
                {ticket.id}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                  statusBadgeClass(ticket.status),
                )}
              >
                {statusLabel(ticket.status)}
              </span>
              <span className="text-[12px] text-slate-400">·</span>
              <span className="text-[12px] text-slate-600">{priorityLabel(ticket.priority)} priority</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.65rem] sm:leading-tight">
              {ticket.subject}
            </h1>
            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
              <div>
                <dt className="text-slate-500">Category</dt>
                <dd className="font-medium text-slate-800">{ticket.category}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Last updated</dt>
                <dd className="font-medium text-slate-800">{formatTicketRelative(ticket.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Opened</dt>
                <dd className="font-medium text-slate-800">{formatTicketDate(ticket.createdAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-2.5 sm:px-8 lg:px-10">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">
              Conversation
              {!isLoadingMessages && messages.length > 0 ? (
                <span className="ms-1.5 font-normal normal-case text-slate-500">
                  ({messages.length})
                </span>
              ) : null}
            </h2>
          </div>

          {isLoadingMessages ? (
            <p className="border-b border-slate-200 px-8 py-12 text-center text-[14px] text-slate-500">
              Loading messages...
            </p>
          ) : messages.length === 0 ? (
            <p className="border-b border-slate-200 px-8 py-12 text-center text-[14px] text-slate-500">
              No messages yet. Our team will respond in this thread.
            </p>
          ) : (
            <div className="border-b border-slate-200">
              {messages.map((message, index) => (
                <EmailThreadMessage
                  key={message.id}
                  message={message}
                  customerDisplayName={customerDisplayName}
                  customerEmail={customerEmail}
                  threadSubject={ticket.subject}
                  isOriginal={index === 0}
                />
              ))}
            </div>
          )}

          {notes.length > 0 ? (
            <>
              <div className="border-b border-amber-200/80 bg-amber-50/90 px-5 py-2.5 sm:px-8 lg:px-10">
                <div className="flex items-center gap-2">
                  <StickyNote className="size-4 text-amber-800" aria-hidden />
                  <h2 className="text-[12px] font-semibold uppercase tracking-wide text-amber-950">
                    Updates from support
                  </h2>
                </div>
              </div>
              {notes.map((note) => (
                <article
                  key={note.id}
                  className="border-b border-amber-100 bg-amber-50/30 px-5 py-5 sm:px-8 lg:px-10"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-amber-100/80 pb-3">
                    <EmailMetaLine label="From">
                      <EmailAddress
                        name={note.authorName || SUPPORT_INBOX_LABEL}
                        email={SUPPORT_INBOX_EMAIL}
                      />
                    </EmailMetaLine>
                    <time
                      className="text-[12px] text-amber-900/60 tabular-nums"
                      dateTime={note.createdAt}
                    >
                      {formatMessageTime(note.createdAt)}
                    </time>
                  </div>
                  <FormattedEmailBody body={note.body} />
                </article>
              ))}
            </>
          ) : null}

          <section className="bg-slate-50/80 px-5 py-6 sm:px-8 lg:px-10">
            <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-wide text-slate-600">
              Reply
            </h2>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="space-y-1.5 border-b border-slate-100 px-4 py-3 sm:px-5">
                <EmailMetaLine label="To">
                  <EmailAddress name={SUPPORT_INBOX_LABEL} email={SUPPORT_INBOX_EMAIL} />
                </EmailMetaLine>
                <EmailMetaLine label="Subject">
                  <span className="text-slate-800">Re: {ticket.subject}</span>
                </EmailMetaLine>
              </div>
              <div className="px-4 py-3 sm:px-5">
                <Textarea
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  rows={8}
                  className="min-h-[160px] resize-y border-0 bg-transparent p-0 text-[15px] leading-[1.75] shadow-none focus-visible:ring-0"
                  placeholder="Type your reply..."
                  disabled={isSendingReply}
                />
              </div>
              {pendingAttachment ? (
                <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
                  <AttachmentChip attachment={pendingAttachment} />
                  <button
                    type="button"
                    className="mt-2 text-[12px] font-medium text-[#015AFD] hover:underline"
                    onClick={() => setPendingAttachment(null)}
                  >
                    Remove attachment
                  </button>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id="consumer-reply-attachment"
                    type="file"
                    className="sr-only"
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx"
                    disabled={isSendingReply}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      if (file.size > SUPPORT_MAX_ATTACHMENT_BYTES) {
                        toast.error("Attachment must be 15 MB or smaller.");
                        return;
                      }
                      try {
                        const contentBase64 = await fileToBase64(file);
                        setPendingAttachment({
                          fileName: file.name,
                          mimeType: file.type || "application/octet-stream",
                          sizeBytes: file.size,
                          contentBase64,
                        });
                      } catch {
                        toast.error("Couldn't read attachment.");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-md border-slate-200 bg-white"
                    disabled={isSendingReply}
                    onClick={() =>
                      document.getElementById("consumer-reply-attachment")?.click()
                    }
                  >
                    <Paperclip className="mr-1.5 size-4" aria-hidden />
                    Attach
                  </Button>
                  <span className="text-[12px] text-slate-500">Up to 15 MB</span>
                </div>
                <Button
                  type="button"
                  className="rounded-md bg-[#015AFD] px-6 font-semibold text-white hover:bg-[#0146ca]"
                  disabled={!canSendReply}
                  onClick={() => void sendReply()}
                >
                  <Send className="mr-1.5 size-4" aria-hidden />
                  {isSendingReply ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
