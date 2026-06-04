"use client";

import { useCallback, useState, type FormEvent } from "react";
import { MessageSquarePlus, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ConsumerResponsiveModal,
  ConsumerResponsiveModalBody,
  ConsumerResponsiveModalDescription,
  ConsumerResponsiveModalFooter,
  ConsumerResponsiveModalHeader,
  ConsumerResponsiveModalTitle,
  useConsumerResponsiveModalVariant,
} from "@/features/consumer/ConsumerResponsiveModal";
import { cn } from "@/lib/utils";

import { SUPPORT_CATEGORIES } from "./helpers";
import type { NewSupportTicketForm } from "./types";

const EMPTY_FORM: NewSupportTicketForm = {
  subject: "",
  category: SUPPORT_CATEGORIES[0].value,
  priority: "medium",
  description: "",
  attachment: null,
};

const TICKET_FORM_ID = "consumer-new-ticket-form";

function TicketFormHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#015AFD]/10 text-[#015AFD]">
        <MessageSquarePlus className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 pe-8">
        <ConsumerResponsiveModalTitle className="text-lg">
          Submit a ticket
        </ConsumerResponsiveModalTitle>
        <ConsumerResponsiveModalDescription className="text-[13px]">
          Describe your issue and our team will follow up by email.
        </ConsumerResponsiveModalDescription>
      </div>
    </div>
  );
}

function NewSupportTicketFormFields({
  form,
  setForm,
}: {
  form: NewSupportTicketForm;
  setForm: React.Dispatch<React.SetStateAction<NewSupportTicketForm>>;
}) {
  return (
    <>
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
    </>
  );
}

function TicketFormFooter({
  isSubmitting,
  onCancel,
}: {
  isSubmitting: boolean;
  onCancel: () => void;
}) {
  const variant = useConsumerResponsiveModalVariant();
  return (
    <ConsumerResponsiveModalFooter>
      <TicketFormActions
        isSubmitting={isSubmitting}
        onCancel={onCancel}
        layout={variant === "drawer" ? "stacked" : "inline"}
      />
    </ConsumerResponsiveModalFooter>
  );
}

function TicketFormActions({
  isSubmitting,
  onCancel,
  layout = "inline",
}: {
  isSubmitting: boolean;
  onCancel: () => void;
  layout?: "inline" | "stacked";
}) {
  return (
    <div
      className={cn(
        "flex gap-2 pt-1",
        layout === "stacked"
          ? "flex-col-reverse"
          : "flex-col-reverse sm:flex-row sm:justify-end",
      )}
    >
      <Button
        type="button"
        variant="outline"
        className="rounded-xl"
        disabled={isSubmitting}
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form={TICKET_FORM_ID}
        disabled={isSubmitting}
        className="gap-2 rounded-xl bg-[#015AFD] font-semibold text-white hover:bg-[#0146ca]"
      >
        <Send className="size-4" aria-hidden />
        {isSubmitting ? "Submitting…" : "Submit ticket"}
      </Button>
    </div>
  );
}

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

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && !isSubmitting) {
        setForm(EMPTY_FORM);
      }
      onOpenChange(nextOpen);
    },
    [isSubmitting, onOpenChange],
  );

  const requestClose = useCallback(() => {
    if (!isSubmitting) {
      handleClose(false);
    }
  }, [handleClose, isSubmitting]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit(form);
    setForm(EMPTY_FORM);
  };

  return (
    <ConsumerResponsiveModal
      open={open}
      onOpenChange={handleClose}
      dismissible={!isSubmitting}
      preventAutoFocus
      dialogClassName="sm:max-w-lg"
      drawerClassName="max-h-[min(92dvh,720px)]"
    >
      <ConsumerResponsiveModalHeader>
        <TicketFormHeader />
      </ConsumerResponsiveModalHeader>

      <form
        id={TICKET_FORM_ID}
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={handleSubmit}
      >
        <ConsumerResponsiveModalBody>
          <div className="space-y-3">
            <NewSupportTicketFormFields form={form} setForm={setForm} />
          </div>
        </ConsumerResponsiveModalBody>

        <TicketFormFooter
          isSubmitting={isSubmitting}
          onCancel={requestClose}
        />
      </form>
    </ConsumerResponsiveModal>
  );
}
