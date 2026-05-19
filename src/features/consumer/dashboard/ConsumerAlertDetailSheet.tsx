"use client";

import type { ReactNode } from "react";
import moment from "moment";
import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Alert } from "@/lib/store/dashboard-store";
import { ALERT_SEVERITIES, ALERT_SEVERITY_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { useResponsiveSheetSide } from "./use-responsive-sheet-side";

export interface ConsumerAlertRow extends Alert {
  Type?: string;
  Level?: string;
}

function severityLabel(severity: string | undefined): string {
  if (!severity) return "Unknown";
  const lower = severity.toLowerCase();
  if (lower === ALERT_SEVERITIES.CRITICAL.toLowerCase()) return "Critical";
  if (lower === ALERT_SEVERITIES.MEDIUM.toLowerCase()) return "Medium";
  if (lower === ALERT_SEVERITIES.LOW.toLowerCase()) return "Low";
  return severity;
}

function severityColor(severity: string | undefined): string {
  if (!severity) return ALERT_SEVERITY_COLORS.LOW;
  const lower = severity.toLowerCase();
  if (lower === ALERT_SEVERITIES.CRITICAL.toLowerCase()) {
    return ALERT_SEVERITY_COLORS.CRITICAL;
  }
  if (lower === ALERT_SEVERITIES.MEDIUM.toLowerCase()) {
    return ALERT_SEVERITY_COLORS.MEDIUM;
  }
  return ALERT_SEVERITY_COLORS.LOW;
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <span className="shrink-0 text-[13px] font-medium text-slate-500">{label}</span>
      <span className="text-end text-[13px] font-semibold text-slate-900">{children}</span>
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
          <SheetHeader className="gap-4 border-b border-slate-100 p-6 text-start">
            <div className="flex items-start gap-4 pe-8">
              <span
                className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff]"
                style={{ color: severityColor(alert?.Severity) }}
              >
                <AlertTriangle className="size-7" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 space-y-3">
                <Badge
                  variant="outline"
                  className="border-slate-200 text-[11px] font-semibold uppercase tracking-wide"
                >
                  {severityLabel(alert?.Severity)}
                </Badge>
                <SheetTitle className="text-[21px] font-bold leading-snug tracking-tight text-slate-900">
                  {alert?.Alert ?? "Alert details"}
                </SheetTitle>
                {accountName ? (
                  <p className="text-[13px] font-medium text-[#64748b]">{accountName}</p>
                ) : null}
              </div>
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
            <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <MetaRow label="Found">{formattedDate}</MetaRow>
              <MetaRow label="Type">{alert?.Type ?? "—"}</MetaRow>
              <MetaRow label="Level">{alert?.Level ?? "—"}</MetaRow>
              <MetaRow label="Status">
                {alert?.["Is Archived"] ? (
                  <Badge variant="secondary">Archived</Badge>
                ) : (
                  <Badge variant="success">Active</Badge>
                )}
              </MetaRow>
            </section>

            <section className="space-y-2">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#475569]">
                Description
              </h3>
              <div
                className="prose prose-sm max-w-none rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-[13px] leading-relaxed text-slate-700"
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
