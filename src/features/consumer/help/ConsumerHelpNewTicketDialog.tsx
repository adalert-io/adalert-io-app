"use client";

import { useState } from "react";
import { MessageSquarePlus, Paperclip, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORT_CATEGORIES } from "./helpers";
import type { NewSupportTicketForm } from "./types";

const EMPTY_FORM: NewSupportTicketForm = {
  subject: "",
  category: SUPPORT_CATEGORIES[0].value,
  priority: "medium",
  description: "",
  attachment: null,
};

export interface ConsumerHelpNewTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: NewSupportTicketForm) => Promise<void>;
  isSubmitting?: boolean;
}

export function ConsumerHelpNewTicketDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: ConsumerHelpNewTicketDialogProps) {
  const [form, setForm] = useState<NewSupportTicketForm>(EMPTY_FORM);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && !isSubmitting) {
      setForm(EMPTY_FORM);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(form);
    setForm(EMPTY_FORM);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton
        overlayClassName="bg-slate-900/40 backdrop-blur-sm"
        className="gap-0 overflow-visible p-0 sm:max-w-lg"
      >
        <DialogHeader className="border-b border-slate-100 px-5 py-4 text-start">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#015AFD]/10 text-[#015AFD]">
              <MessageSquarePlus className="size-4" aria-hidden />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Submit a ticket
              </DialogTitle>
              <DialogDescription className="text-[13px] text-slate-500">
                Describe your issue and our team will follow up by email.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form className="space-y-3 px-5 py-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="ticket-subject">Subject</Label>
            <Input
              id="ticket-subject"
              value={form.subject}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, subject: event.target.value }))
              }
              placeholder="Brief summary of your issue"
              className="rounded-xl border-slate-200"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ticket-category">Category</Label>
              <select
                id="ticket-category"
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:border-[#015AFD] focus-visible:ring-2 focus-visible:ring-[#015AFD]/20"
              >
                {SUPPORT_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticket-priority">Priority</Label>
              <select
                id="ticket-priority"
                value={form.priority}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    priority: event.target.value as NewSupportTicketForm["priority"],
                  }))
                }
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:border-[#015AFD] focus-visible:ring-2 focus-visible:ring-[#015AFD]/20"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High — blocking work</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-description">Description</Label>
            <Textarea
              id="ticket-description"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Include steps to reproduce, account IDs, screenshots, or error messages…"
              rows={4}
              className="min-h-[96px] resize-none rounded-xl border-slate-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-attachment">Attachment</Label>
            <Input
              id="ticket-attachment"
              type="file"
              required
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  attachment: event.target.files?.[0] ?? null,
                }))
              }
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx"
              className="rounded-xl border-slate-200 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-[12px] file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
            />
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2 text-[12px] text-slate-500">
              Upload a supporting file (PDF, JPG, PNG, DOC, XLS, TXT, CSV, and similar).
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={isSubmitting}
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2 rounded-xl bg-[#015AFD] font-semibold text-white hover:bg-[#0146ca]"
            >
              <Send className="size-4" aria-hidden />
              {isSubmitting ? "Submitting…" : "Submit ticket"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
