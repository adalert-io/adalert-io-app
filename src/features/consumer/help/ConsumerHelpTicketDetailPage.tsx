"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Headphones } from "lucide-react";
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

export interface ConsumerHelpTicketDetailPageProps {
  ticketId: string;
}

export function ConsumerHelpTicketDetailPage({ ticketId }: ConsumerHelpTicketDetailPageProps) {
  const { user } = useAuthStore();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [replyBody, setReplyBody] = useState("");
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);

  const ticketKey = useMemo(() => decodeURIComponent(ticketId), [ticketId]);

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
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load conversation");
        }
        if (!isUnmounted) {
          setMessages(payload.messages ?? []);
        }
      } catch (error) {
        console.error("Failed to load ticket conversation:", error);
        if (!isUnmounted) {
          setMessages([]);
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
    <div className="mx-auto w-full min-w-0 max-w-[1080px] space-y-4 pb-8">
      <Button asChild variant="ghost" className="w-fit rounded-xl px-2 text-slate-600 hover:text-slate-900">
        <Link href={CONSUMER_HELP_HREF}>
          <ArrowLeft className="mr-1 size-4" aria-hidden />
          Back to all tickets
        </Link>
      </Button>

      {isLoadingTicket ? (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 text-[13px] text-slate-500 shadow-sm">
          Loading ticket detail...
        </section>
      ) : !ticket ? (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 text-[13px] text-slate-500 shadow-sm">
          This ticket could not be found.
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <header className="border-b border-slate-100 px-6 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-lg border-slate-200 font-mono text-[11px] text-slate-600"
              >
                {ticket.id}
              </Badge>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                  statusBadgeClass(ticket.status),
                )}
              >
                {statusLabel(ticket.status)}
              </span>
            </div>
            <h1 className="mt-3 text-xl font-bold text-slate-900">{ticket.subject}</h1>
            <p className="text-[13px] text-slate-500">
              {ticket.category} · {priorityLabel(ticket.priority)} priority
            </p>
          </header>

          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_260px]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Conversation
              </p>
              {isLoadingMessages ? (
                <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-[13px] text-slate-500">
                  Loading conversation...
                </div>
              ) : messages.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-[13px] text-slate-500">
                  No messages yet. Our team will respond here soon.
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "rounded-xl border px-4 py-3",
                        message.authorType === "customer"
                          ? "border-[#015AFD]/20 bg-[#015AFD]/5"
                          : "border-slate-200 bg-white",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                            message.authorType === "customer" ? "bg-[#015AFD]" : "bg-slate-600",
                          )}
                        >
                          {message.authorType === "customer" ? (
                            "You"
                          ) : (
                            <Headphones className="size-3.5" aria-hidden />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[13px] font-semibold text-slate-900">
                              {message.authorType === "customer"
                                ? message.authorName || "You"
                                : message.authorName || "adAlert Support"}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {formatMessageTime(message.createdAt)}
                            </p>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">
                            {message.body}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Reply to support
                </p>
                <div className="mt-2 space-y-3">
                  <Textarea
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    rows={4}
                    className="resize-none rounded-xl border-slate-200"
                    placeholder="Write your reply..."
                    disabled={isSendingReply}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      className="rounded-xl bg-[#015AFD] font-semibold text-white hover:bg-[#0146ca]"
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
                      {isSendingReply ? "Sending..." : "Send reply"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex justify-between gap-4 text-[13px]">
                <span className="text-slate-500">Created</span>
                <span className="font-medium text-slate-800">{formatTicketDate(ticket.createdAt)}</span>
              </div>
              <div className="flex justify-between gap-4 text-[13px]">
                <span className="text-slate-500">Last update</span>
                <span className="font-medium text-slate-800">{formatTicketRelative(ticket.updatedAt)}</span>
              </div>
            </aside>
          </div>
        </section>
      )}
    </div>
  );
}
