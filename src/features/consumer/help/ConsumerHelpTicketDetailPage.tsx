"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  FileText,
  Headphones,
  Mail,
  Paperclip,
  Send,
  StickyNote,
  Tag,
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

function EmailMetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[56px_1fr] gap-x-3 gap-y-0.5 text-[13px]">
      <span className="pt-0.5 text-slate-500">{label}</span>
      <div className="min-w-0 text-slate-900">{children}</div>
    </div>
  );
}

function AttachmentChip({ attachment }: { attachment: SupportTicketAttachmentMeta }) {
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-700">
      <FileText className="size-4 shrink-0 text-[#015AFD]" aria-hidden />
      <span className="truncate font-medium">{attachment.fileName}</span>
      <span className="shrink-0 text-slate-400">
        {formatAttachmentSize(attachment.sizeBytes)}
      </span>
    </div>
  );
}

function EmailThreadMessage({
  message,
  customerDisplayName,
  customerEmail,
  isOriginal,
}: {
  message: SupportTicketMessage;
  customerDisplayName: string;
  customerEmail: string;
  isOriginal?: boolean;
}) {
  const isCustomer = message.authorType === "customer";
  const fromLabel = isCustomer
    ? `${customerDisplayName}${customerEmail ? ` <${customerEmail}>` : ""}`
    : `${message.authorName || SUPPORT_INBOX_LABEL} <support@adalert.io>`;
  const toLabel = isCustomer ? SUPPORT_INBOX_LABEL : customerDisplayName;

  return (
    <article
      className={cn(
        "border-b border-slate-200/90 bg-white px-5 py-5 last:border-b-0 sm:px-6",
        isOriginal && "bg-slate-50/40",
      )}
    >
      <div className="mb-4 space-y-1.5 border-b border-slate-100 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                isCustomer ? "bg-[#015AFD]" : "bg-slate-700",
              )}
            >
              {isCustomer ? (
                customerDisplayName.slice(0, 1).toUpperCase() || "Y"
              ) : (
                <Headphones className="size-4" aria-hidden />
              )}
            </span>
            <div>
              {isOriginal ? (
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#015AFD]">
                  Original message
                </p>
              ) : null}
              <p className="text-[14px] font-semibold text-slate-900">
                {isCustomer ? customerDisplayName : message.authorName || SUPPORT_INBOX_LABEL}
              </p>
            </div>
          </div>
          <time
            className="shrink-0 text-[12px] text-slate-500 tabular-nums"
            dateTime={message.createdAt}
          >
            {formatMessageTime(message.createdAt)}
          </time>
        </div>
        <EmailMetaRow label="From">{fromLabel}</EmailMetaRow>
        <EmailMetaRow label="To">{toLabel}</EmailMetaRow>
      </div>
      <div className="whitespace-pre-wrap text-[14px] leading-[1.65] text-slate-800">
        {message.body}
      </div>
      {message.attachment ? (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Attachment
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
    <div className="min-h-full bg-slate-100/90 pb-12">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-9 rounded-lg px-2 text-slate-600 hover:text-slate-900"
          >
            <Link href={CONSUMER_HELP_HREF}>
              <ArrowLeft className="mr-1.5 size-4" aria-hidden />
              All tickets
            </Link>
          </Button>
          <div className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden />
          <div className="flex min-w-0 items-center gap-2 text-[13px] text-slate-600">
            <Mail className="size-4 shrink-0 text-[#015AFD]" aria-hidden />
            <span className="truncate font-medium text-slate-800">Support ticket thread</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6">
        {isLoadingTicket ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-[13px] text-slate-500 shadow-sm">
            Loading ticket...
          </div>
        ) : !ticket ? (
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-[13px] text-slate-500 shadow-sm">
            This ticket could not be found.
          </div>
        ) : (
          <>
            <header className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[12px] font-semibold text-[#015AFD]">
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
                </div>
                <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  {ticket.subject}
                </h1>
              </div>
              <dl className="grid gap-3 px-5 py-4 sm:grid-cols-3 sm:px-6">
                <div className="flex items-start gap-2 text-[13px]">
                  <Tag className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                  <div>
                    <dt className="text-slate-500">Category</dt>
                    <dd className="font-medium text-slate-900">{ticket.category}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-[13px]">
                  <Clock className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                  <div>
                    <dt className="text-slate-500">Last updated</dt>
                    <dd className="font-medium text-slate-900">
                      {formatTicketRelative(ticket.updatedAt)}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-[13px]">
                  <Mail className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                  <div>
                    <dt className="text-slate-500">Opened</dt>
                    <dd className="font-medium text-slate-900">
                      {formatTicketDate(ticket.createdAt)}
                    </dd>
                  </div>
                </div>
              </dl>
            </header>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3 sm:px-6">
                <h2 className="text-[13px] font-semibold text-slate-800">
                  Message thread
                  {!isLoadingMessages && messages.length > 0 ? (
                    <span className="ms-2 font-normal text-slate-500">
                      ({messages.length} {messages.length === 1 ? "message" : "messages"})
                    </span>
                  ) : null}
                </h2>
                <span className="text-[12px] text-slate-500">{priorityLabel(ticket.priority)} priority</span>
              </div>

              {isLoadingMessages ? (
                <p className="px-6 py-10 text-center text-[13px] text-slate-500">
                  Loading messages...
                </p>
              ) : messages.length === 0 ? (
                <p className="px-6 py-10 text-center text-[13px] text-slate-500">
                  No messages yet. Our team will respond by email and here in this thread.
                </p>
              ) : (
                <div>
                  {messages.map((message, index) => (
                    <EmailThreadMessage
                      key={message.id}
                      message={message}
                      customerDisplayName={customerDisplayName}
                      customerEmail={customerEmail}
                      isOriginal={index === 0}
                    />
                  ))}
                </div>
              )}
            </section>

            {notes.length > 0 ? (
              <section className="overflow-hidden rounded-xl border border-amber-200/80 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50/80 px-5 py-3 sm:px-6">
                  <StickyNote className="size-4 text-amber-700" aria-hidden />
                  <h2 className="text-[13px] font-semibold text-amber-950">Updates from support</h2>
                </div>
                <div className="divide-y divide-amber-100/80">
                  {notes.map((note) => (
                    <article key={note.id} className="px-5 py-4 sm:px-6">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold text-amber-950">
                          {note.authorName || SUPPORT_INBOX_LABEL}
                        </p>
                        <time
                          className="text-[12px] text-amber-800/70 tabular-nums"
                          dateTime={note.createdAt}
                        >
                          {formatMessageTime(note.createdAt)}
                        </time>
                      </div>
                      <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-amber-950/90">
                        {note.body}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3 sm:px-6">
                <h2 className="text-[13px] font-semibold text-slate-800">Compose reply</h2>
              </div>
              <div className="space-y-0 border-b border-slate-100 px-5 py-4 sm:px-6">
                <EmailMetaRow label="To">
                  <span className="font-medium">{SUPPORT_INBOX_LABEL}</span>
                </EmailMetaRow>
                <div className="mt-2">
                  <EmailMetaRow label="Subject">
                    <span className="text-slate-700">Re: {ticket.subject}</span>
                  </EmailMetaRow>
                </div>
              </div>
              <div className="px-5 py-4 sm:px-6">
                <Textarea
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  rows={6}
                  className="min-h-[140px] resize-y rounded-lg border-slate-200 bg-white text-[14px] leading-relaxed shadow-none focus-visible:ring-[#015AFD]/25"
                  placeholder="Write your reply to the support team..."
                  disabled={isSendingReply}
                />
                {pendingAttachment ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <AttachmentChip attachment={pendingAttachment} />
                    <button
                      type="button"
                      className="text-[12px] font-medium text-[#015AFD] hover:underline"
                      onClick={() => setPendingAttachment(null)}
                    >
                      Remove attachment
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3 sm:px-6">
                <div className="flex items-center gap-2">
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
                    className="rounded-lg border-slate-200 bg-white"
                    disabled={isSendingReply}
                    onClick={() =>
                      document.getElementById("consumer-reply-attachment")?.click()
                    }
                  >
                    <Paperclip className="mr-1.5 size-4" aria-hidden />
                    Attach file
                  </Button>
                  <span className="hidden text-[12px] text-slate-500 sm:inline">
                    PDF, images, or documents up to 15 MB
                  </span>
                </div>
                <Button
                  type="button"
                  className="rounded-lg bg-[#015AFD] px-5 font-semibold text-white hover:bg-[#0146ca]"
                  disabled={!canSendReply}
                  onClick={() => void sendReply()}
                >
                  <Send className="mr-1.5 size-4" aria-hidden />
                  {isSendingReply ? "Sending..." : "Send reply"}
                </Button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
