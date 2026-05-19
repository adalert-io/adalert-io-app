"use client";

import type { ReactNode } from "react";
import moment from "moment";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Alert } from "@/lib/store/dashboard-store";
import { cn } from "@/lib/utils";

import { AlertSeverityGlyph, SeverityBadge } from "./alert-ui";
import { useResponsiveSheetSide } from "./use-responsive-sheet-side";

export interface ConsumerAlertRow extends Alert {
  Type?: string;
  Level?: string;
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-slate-100 py-3.5 text-[13px] last:border-0">
      <span className="shrink-0 font-medium text-slate-500">{label}</span>
      <span className="min-w-0 text-end font-semibold leading-snug text-slate-900">
        {children}
      </span>
    </div>
  );
}

interface ConsumerAlertDetailSheetProps {
  alert: ConsumerAlertRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountName?: string;
}

export function ConsumerAlertDetailSheet({
  alert,
  open,
  onOpenChange,
  accountName,
}: ConsumerAlertDetailSheetProps) {
  const side = useResponsiveSheetSide();
  const dateObj = alert?.["Date Found"]?.toDate?.();
  const formattedDate = dateObj ? moment(dateObj).format("DD MMM YYYY, HH:mm") : "—";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        showCloseButton
        className={cn(
          "gap-0 p-0",
          side === "right" && "w-full sm:max-w-[480px]",
          side === "bottom" && "max-h-[88vh] rounded-t-2xl",
        )}
      >
        <div className="flex h-full min-h-0 flex-col bg-white">
          <SheetHeader className="gap-0 border-b border-slate-100 p-6 text-start">
            <div className="flex items-start gap-4 pe-6">
              <AlertSeverityGlyph severity={alert?.Severity} />
              <div className="min-w-0 flex-1 space-y-3">
                <SeverityBadge severity={alert?.Severity} />
                <SheetTitle className="text-[21px] font-bold leading-snug tracking-tight text-slate-900">
                  {alert?.Alert ?? "Alert details"}
                </SheetTitle>
                {accountName ? (
                  <p className="text-[13px] font-medium text-slate-500">{accountName}</p>
                ) : null}
              </div>
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <section className="space-y-0">
              <MetaRow label="Found">{formattedDate}</MetaRow>
              <MetaRow label="Type">{alert?.Type ?? "—"}</MetaRow>
              <MetaRow label="Level">{alert?.Level ?? "—"}</MetaRow>
              <MetaRow label="Status">
                {alert?.["Is Archived"] ? (
                  <Badge variant="secondary" className="font-semibold">
                    Archived
                  </Badge>
                ) : (
                  <Badge variant="success" className="font-semibold">
                    Active
                  </Badge>
                )}
              </MetaRow>
            </section>

            <section className="mt-6 space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Description
              </h3>
              <div
                className="prose prose-sm max-w-none rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-[13px] leading-relaxed text-slate-700 [&_a]:text-[#015AFD]"
                dangerouslySetInnerHTML={{
                  __html: alert?.["Long Description"] || "<p>No description available.</p>",
                }}
              />
            </section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
