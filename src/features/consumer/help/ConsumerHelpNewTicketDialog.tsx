"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import { MessageSquarePlus, Send } from "lucide-react";

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
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
const SWIPE_CLOSE_THRESHOLD_PX = 56;

function useSwipeDownToClose(onClose: () => void, enabled: boolean) {
  const startYRef = useRef(0);
  const draggingRef = useRef(false);

  const onTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (!enabled) return;
      draggingRef.current = true;
      startYRef.current = event.touches[0]?.clientY ?? 0;
    },
    [enabled],
  );

  const onTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (!enabled || !draggingRef.current) return;
      draggingRef.current = false;
      const endY = event.changedTouches[0]?.clientY ?? 0;
      if (endY - startYRef.current >= SWIPE_CLOSE_THRESHOLD_PX) {
        onClose();
      }
    },
    [enabled, onClose],
  );

  const onTouchCancel = useCallback(() => {
    draggingRef.current = false;
  }, []);

  return { onTouchStart, onTouchEnd, onTouchCancel };
}

function TicketFormHeader({ variant }: { variant: "dialog" | "sheet" }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#015AFD]/10 text-[#015AFD]">
        <MessageSquarePlus className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 pe-8">
        {variant === "dialog" ? (
          <>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Submit a ticket
            </DialogTitle>
            <DialogDescription className="text-[13px] text-slate-500">
              Describe your issue and our team will follow up by email.
            </DialogDescription>
          </>
        ) : (
          <>
            <SheetTitle className="text-lg font-bold text-slate-900">
              Submit a ticket
            </SheetTitle>
            <SheetDescription className="text-[13px] text-slate-500">
              Describe your issue and our team will follow up by email.
            </SheetDescription>
          </>
        )}
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
  const isMobile = useIsMobile();

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

  const swipeHandlers = useSwipeDownToClose(requestClose, open && isMobile);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit(form);
    setForm(EMPTY_FORM);
  };

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className={cn(
            "flex max-h-[min(92dvh,720px)] flex-col gap-0 rounded-t-[20px] border-slate-200/90 p-0",
            "pb-[max(1rem,env(safe-area-inset-bottom))]",
          )}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div
            className="shrink-0 touch-pan-y"
            {...swipeHandlers}
          >
            <div
              className="flex cursor-grab justify-center pt-2.5 pb-1 active:cursor-grabbing"
              aria-hidden
            >
              <div className="h-1 w-10 rounded-full bg-slate-300" />
            </div>
            <SheetHeader className="border-b border-slate-100 px-5 py-4 text-start">
              <TicketFormHeader variant="sheet" />
            </SheetHeader>
          </div>

          <form
            id={TICKET_FORM_ID}
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={handleSubmit}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              <div className="space-y-3">
                <NewSupportTicketFormFields form={form} setForm={setForm} />
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4">
              <TicketFormActions
                isSubmitting={isSubmitting}
                onCancel={requestClose}
                layout="stacked"
              />
            </div>
          </form>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton
        overlayClassName="bg-slate-900/40 backdrop-blur-sm"
        className="gap-0 overflow-visible p-0 sm:max-w-lg"
      >
        <DialogHeader className="border-b border-slate-100 px-5 py-4 text-start">
          <TicketFormHeader variant="dialog" />
        </DialogHeader>

        <form
          id={TICKET_FORM_ID}
          className="space-y-3 px-5 py-4"
          onSubmit={handleSubmit}
        >
          <NewSupportTicketFormFields form={form} setForm={setForm} />
          <TicketFormActions
            isSubmitting={isSubmitting}
            onCancel={requestClose}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
