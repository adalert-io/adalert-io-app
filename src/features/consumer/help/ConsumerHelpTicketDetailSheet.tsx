"use client";

import { useEffect, useState } from "react";
import { Headphones } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";

import {
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

export interface ConsumerHelpTicketDetailSheetProps {
  ticket: SupportTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsumerHelpTicketDetailSheet({
  ticket,
  open,
  onOpenChange,
}: ConsumerHelpTicketDetailSheetProps) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  useEffect(() => {
    if (!open || !ticket || !user) {
      setMessages([]);
      return;
    }

    const activeTicket: SupportTicket = ticket;
    const activeUser = user;
    let isUnmounted = false;

    async function loadMessages() {
      setIsLoadingMessages(true);
      try {
        const idToken = await activeUser.getIdToken();
        const ticketKey = activeTicket.documentId || activeTicket.id;
        const response = await fetch(
          `/api/support/tickets/${encodeURIComponent(ticketKey)}/messages`,
          {
            method: "GET",
            headers: {
              authorization: `Bearer ${idToken}`,
            },
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
          setMessages(
            activeTicket.lastMessagePreview
              ? [
                  {
                    id: "fallback-preview",
                    authorType: "agent",
                    authorName: "AdAlert Support",
                    body: activeTicket.lastMessagePreview,
                    createdAt: activeTicket.updatedAt,
                  },
                ]
              : [],
          );
        }
      } finally {
        if (!isUnmounted) setIsLoadingMessages(false);
      }
    }

    void loadMessages();

    return () => {
      isUnmounted = true;
    };
  }, [open, ticket, user]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-slate-200 p-0 sm:max-w-md"
      >
        {ticket ? (
          <>
            <SheetHeader className="border-b border-slate-100 px-6 py-5 text-start">
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
              <SheetTitle className="mt-3 text-left text-lg font-bold leading-snug text-slate-900">
                {ticket.subject}
              </SheetTitle>
              <SheetDescription className="text-left text-[13px] text-slate-500">
                {ticket.category} · {priorityLabel(ticket.priority)} priority
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex justify-between gap-4 text-[13px]">
                  <span className="text-slate-500">Created</span>
                  <span className="font-medium text-slate-800">
                    {formatTicketDate(ticket.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between gap-4 text-[13px]">
                  <span className="text-slate-500">Last update</span>
                  <span className="font-medium text-slate-800">
                    {formatTicketRelative(ticket.updatedAt)}
                  </span>
                </div>
              </div>

              <div className="mt-5">
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
                              message.authorType === "customer"
                                ? "bg-[#015AFD]"
                                : "bg-slate-600",
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
                                  : message.authorName || "AdAlert Support"}
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
              </div>
            </div>

            <div className="border-t border-slate-100 px-6 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Reply to support
              </p>
              <div className="mt-2 space-y-3">
                <Textarea
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  rows={3}
                  className="resize-none rounded-xl border-slate-200"
                  placeholder="Write your reply..."
                  disabled={isSendingReply}
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    className="rounded-xl bg-[#015AFD] font-semibold text-white hover:bg-[#0146ca]"
                    disabled={!replyBody.trim() || isSendingReply || !ticket || !user}
                    onClick={async () => {
                      if (!ticket || !user) return;
                      const content = replyBody.trim();
                      if (!content) return;

                      setIsSendingReply(true);
                      try {
                        const idToken = await user.getIdToken();
                        const ticketKey = ticket.documentId || ticket.id;
                        const response = await fetch(
                          `/api/support/tickets/${encodeURIComponent(ticketKey)}/messages`,
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
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
