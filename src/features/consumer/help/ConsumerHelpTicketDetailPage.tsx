"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Headphones, StickyNote } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import type { SupportTicket, SupportTicketMessage } from "./types";

function formatMessageTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMessageDateHeader(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "Earlier";
  const today = new Date();
  const isToday =
    parsed.getFullYear() === today.getFullYear() &&
    parsed.getMonth() === today.getMonth() &&
    parsed.getDate() === today.getDate();
  if (isToday) return "Today";
  return parsed.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function groupMessagesByDay(messages: SupportTicketMessage[]) {
  const groups: Array<{ day: string; items: SupportTicketMessage[] }> = [];
  for (const message of messages) {
    const day = formatMessageDateHeader(message.createdAt);
    const last = groups[groups.length - 1];
    if (last?.day === day) {
      last.items.push(message);
    } else {
      groups.push({ day, items: [message] });
    }
  }
  return groups;
}

export interface ConsumerHelpTicketDetailPageProps {
  ticketId: string;
}

export function ConsumerHelpTicketDetailPage({ ticketId }: ConsumerHelpTicketDetailPageProps) {
  const { user } = useAuthStore();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [notes, setNotes] = useState<SupportTicketMessage[]>([]);
  const [replyBody, setReplyBody] = useState("");
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);

  const ticketKey = useMemo(() => decodeURIComponent(ticketId), [ticketId]);
  const messageGroups = useMemo(() => groupMessagesByDay(messages), [messages]);

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

  const canSendReply = Boolean(replyBody.trim()) && Boolean(ticket) && Boolean(user) && !isSendingReply;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1100px] space-y-4 pb-10">
      <Button asChild variant="ghost" className="w-fit rounded-xl px-2 text-slate-600 hover:text-slate-900">
        <Link href={CONSUMER_HELP_HREF}>
          <ArrowLeft className="mr-1 size-4" aria-hidden />
          Back to all tickets
        </Link>
      </Button>

      {isLoadingTicket ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-[13px] text-slate-500 shadow-sm">
          Loading ticket detail...
        </section>
      ) : !ticket ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-[13px] text-slate-500 shadow-sm">
          This ticket could not be found.
        </section>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[12px] font-semibold text-[#015AFD]">{ticket.id}</span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                      statusBadgeClass(ticket.status),
                    )}
                  >
                    {statusLabel(ticket.status)}
                  </span>
                </div>
                <h1 className="mt-2 truncate text-xl font-bold text-slate-900">{ticket.subject}</h1>
                <p className="mt-1 text-[13px] text-slate-500">
                  {ticket.category} · {priorityLabel(ticket.priority)} priority · Updated{" "}
                  {formatTicketRelative(ticket.updatedAt)}
                </p>
              </div>
              <div className="text-end text-[12px] text-slate-500">
                <p>Created {formatTicketDate(ticket.createdAt)}</p>
              </div>
            </div>
          </header>

          <div className="flex min-h-[520px] flex-col">
            <div className="flex-1 overflow-y-auto bg-white px-4 py-5 sm:px-6">
              {isLoadingMessages ? (
                <p className="text-[13px] text-slate-500">Loading conversation...</p>
              ) : messages.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-[13px] text-slate-500">
                  No messages yet. Our team will respond here soon.
                </p>
              ) : (
                <div className="space-y-6">
                  {messageGroups.map((group) => (
                    <div key={group.day}>
                      <div className="mb-4 flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {group.day}
                        </span>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>
                      <div className="space-y-4">
                        {group.items.map((message) => {
                          const isCustomer = message.authorType === "customer";
                          return (
                            <div
                              key={message.id}
                              className={cn(
                                "flex gap-3",
                                isCustomer ? "flex-row-reverse" : "flex-row",
                              )}
                            >
                              <span
                                className={cn(
                                  "mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                                  isCustomer ? "bg-[#015AFD]" : "bg-slate-600",
                                )}
                              >
                                {isCustomer ? (
                                  "You"
                                ) : (
                                  <Headphones className="size-4" aria-hidden />
                                )}
                              </span>
                              <div
                                className={cn(
                                  "max-w-[min(100%,640px)] rounded-2xl px-4 py-3 shadow-sm",
                                  isCustomer
                                    ? "rounded-tr-md bg-[#015AFD] text-white"
                                    : "rounded-tl-md border border-slate-200 bg-slate-50 text-slate-800",
                                )}
                              >
                                <div
                                  className={cn(
                                    "mb-1 flex flex-wrap items-center justify-between gap-2 text-[11px]",
                                    isCustomer ? "text-blue-100" : "text-slate-500",
                                  )}
                                >
                                  <span className="font-semibold">
                                    {isCustomer
                                      ? message.authorName || "You"
                                      : message.authorName || "adAlert Support"}
                                  </span>
                                  <span>{formatMessageTime(message.createdAt)}</span>
                                </div>
                                <p
                                  className={cn(
                                    "whitespace-pre-wrap text-[14px] leading-relaxed",
                                    isCustomer ? "text-white" : "text-slate-700",
                                  )}
                                >
                                  {message.body}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {notes.length > 0 ? (
                <section className="mt-8 border-t border-slate-200 pt-6">
                  <div className="mb-3 flex items-center gap-2">
                    <StickyNote className="size-4 text-amber-600" aria-hidden />
                    <h2 className="text-[13px] font-semibold text-slate-900">Support notes</h2>
                  </div>
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <article
                        key={note.id}
                        className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-900/70">
                          <span className="font-semibold text-amber-900">
                            {note.authorName || "adAlert Support"}
                          </span>
                          <time dateTime={note.createdAt}>{formatMessageTime(note.createdAt)}</time>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-amber-950">
                          {note.body}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <footer className="border-t border-slate-200 bg-slate-50/50 px-4 py-4 sm:px-6">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Reply to support
              </p>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#015AFD]/25">
                <Textarea
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  rows={3}
                  className="min-h-[88px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                  placeholder="Write your reply..."
                  disabled={isSendingReply}
                />
                <div className="flex items-center justify-end border-t border-slate-100 px-3 py-2">
                  <Button
                    type="button"
                    className="rounded-lg bg-[#015AFD] font-semibold text-white hover:bg-[#0146ca]"
                    disabled={!canSendReply}
                    onClick={async () => {
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
                            body: JSON.stringify({ body: content }),
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
                      } catch (error) {
                        console.error("Failed to send customer reply:", error);
                        toast.error("Couldn't send your reply.");
                      } finally {
                        setIsSendingReply(false);
                      }
                    }}
                  >
                    {isSendingReply ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
