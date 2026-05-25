"use client";

import moment from "moment";
import { Calendar, FileText, Layers, Tag } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Alert } from "@/lib/store/dashboard-store";
import { cn } from "@/lib/utils";

import { ConsumerAlertDescription } from "./alert-detail";
import {
  AlertSeverityGlyph,
  getAlertSeverityKey,
  SeverityBadge,
} from "./alert-ui";
import { DASHBOARD_ALERT_SEVERITY_BORDER } from "./dashboard-theme";
import { useResponsiveSheetSide } from "./use-responsive-sheet-side";

export interface ConsumerAlertRow extends Alert {
  Type?: string;
  Level?: string;
}

const META_TILE_VARIANTS = {
  found: {
    card: "border-sky-200/90 bg-gradient-to-br from-sky-50/90 via-white to-white shadow-sm shadow-sky-100/50",
    iconWrap: "bg-[#015AFD]/12 text-[#015AFD] ring-1 ring-[#015AFD]/15",
    label: "text-[#015AFD]",
  },
  type: {
    card: "border-violet-200/90 bg-gradient-to-br from-violet-50/80 via-white to-white shadow-sm shadow-violet-100/40",
    iconWrap: "bg-violet-500/12 text-violet-600 ring-1 ring-violet-500/15",
    label: "text-violet-600",
  },
  level: {
    card: "border-amber-200/90 bg-gradient-to-br from-amber-50/75 via-white to-white shadow-sm shadow-amber-100/40",
    iconWrap: "bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/15",
    label: "text-amber-700",
  },
} as const;

type MetaTileVariant = keyof typeof META_TILE_VARIANTS;

function MetaTile({
  label,
  value,
  icon: Icon,
  variant,
}: {
  label: string;
  value: string;
  icon: typeof Calendar;
  variant: MetaTileVariant;
}) {
  const styles = META_TILE_VARIANTS[variant];

  return (
    <div
      className={cn(
        "rounded-xl border px-3.5 py-3 transition-colors",
        styles.card,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide",
          styles.label,
        )}
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md",
            styles.iconWrap,
          )}
        >
          <Icon className="size-3.5" strokeWidth={2} aria-hidden />
        </span>
        {label}
      </div>
      <p className="mt-2 text-[13px] font-semibold leading-snug text-slate-900">
        {value}
      </p>
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
  const formattedDate = dateObj
    ? moment(dateObj).format("DD MMM YYYY, HH:mm")
    : "—";
  const severityKey = getAlertSeverityKey(alert?.Severity);
  const severityAccent = DASHBOARD_ALERT_SEVERITY_BORDER[severityKey];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        showCloseButton
        className={cn(
          "gap-0 p-0",
          side === "right" &&
            "w-full sm:!max-w-[560px] lg:!max-w-[600px]",
          side === "bottom" && "max-h-[88vh] rounded-t-2xl",
        )}
      >
        <div className="flex h-full min-h-0 flex-col bg-gradient-to-b from-[#f1f5f9] to-[#f8fafc]">
          <SheetHeader
            className="relative gap-0 border-b border-slate-200/90 bg-white px-5 py-5 text-start shadow-sm sm:px-6"
            style={{ borderBottomColor: `${severityAccent}33` }}
          >
            <div
              className="absolute inset-x-0 top-0 h-1 rounded-t-lg"
              style={{ backgroundColor: severityAccent }}
              aria-hidden
            />
            <div className="flex items-start gap-3.5 pe-8">
              <AlertSeverityGlyph severity={alert?.Severity} className="size-11 rounded-xl shadow-sm" iconClassName="size-6" />
              <div className="min-w-0 flex-1 space-y-2.5">
                <SeverityBadge severity={alert?.Severity} />
                <SheetTitle className="text-[18px] font-bold leading-snug tracking-tight text-slate-900 sm:text-[19px]">
                  {alert?.Alert ?? "Alert details"}
                </SheetTitle>
                {accountName ? (
                  <p className="inline-flex max-w-full items-center rounded-lg bg-slate-100/90 px-2.5 py-1 text-[12px] font-medium text-slate-600 ring-1 ring-slate-200/80">
                    <span className="truncate">{accountName}</span>
                  </p>
                ) : null}
              </div>
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <MetaTile
                variant="found"
                label="Found"
                value={formattedDate}
                icon={Calendar}
              />
              <MetaTile
                variant="type"
                label="Type"
                value={alert?.Type ?? "—"}
                icon={Tag}
              />
              <MetaTile
                variant="level"
                label="Level"
                value={alert?.Level ?? "—"}
                icon={Layers}
              />
            </div>

            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md ring-1 ring-slate-100/80">
              <div className="flex items-center gap-3 border-b border-[#015AFD]/10 bg-gradient-to-r from-[#015AFD]/[0.08] via-slate-50 to-white px-4 py-3.5 sm:px-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#015AFD]/12 text-[#015AFD] ring-1 ring-[#015AFD]/20">
                  <FileText className="size-4" strokeWidth={2.25} aria-hidden />
                </span>
                <h3 className="text-[12px] font-bold uppercase tracking-wide text-slate-900">
                  Alert details
                </h3>
              </div>
              <div
                className={cn(
                  "border-l-[3px] border-l-[#015AFD]/25 bg-slate-50/50 px-4 py-4 sm:px-5 sm:py-5",
                  "[&_.prose]:max-w-none [&_.prose]:text-[14px] [&_.prose]:font-medium [&_.prose]:leading-[1.65] [&_.prose]:text-slate-800",
                  "[&_.prose_p]:mb-3 [&_.prose_p]:font-medium [&_.prose_p]:text-slate-800 [&_.prose_p:last-child]:mb-0",
                  "[&_.prose_div]:font-medium [&_.prose_div]:text-slate-800",
                  "[&_.prose_span]:font-medium [&_.prose_span]:text-slate-800",
                  "[&_.prose_strong]:font-bold [&_.prose_strong]:text-slate-950",
                  "[&_.prose_b]:font-bold [&_.prose_b]:text-slate-950",
                  "[&_.prose_a]:font-semibold [&_.prose_a]:text-[#015AFD] [&_.prose_a]:underline-offset-2 hover:[&_.prose_a]:underline",
                  "[&_.prose_ul]:my-2.5 [&_.prose_ul]:list-disc [&_.prose_ul]:pl-5 [&_.prose_ul]:font-medium",
                  "[&_.prose_ol]:my-2.5 [&_.prose_ol]:list-decimal [&_.prose_ol]:pl-5 [&_.prose_ol]:font-medium",
                  "[&_.prose_li]:mb-1.5 [&_.prose_li]:font-medium [&_.prose_li]:text-slate-800",
                  "[&_.prose_h1]:mb-2.5 [&_.prose_h1]:text-[17px] [&_.prose_h1]:font-bold [&_.prose_h1]:text-slate-950",
                  "[&_.prose_h2]:mb-2 [&_.prose_h2]:text-[16px] [&_.prose_h2]:font-bold [&_.prose_h2]:text-slate-950",
                  "[&_.prose_h3]:mb-2 [&_.prose_h3]:text-[15px] [&_.prose_h3]:font-bold [&_.prose_h3]:text-slate-900",
                  "[&_.prose_table]:my-3 [&_.prose_table]:w-full [&_.prose_table]:overflow-hidden [&_.prose_table]:rounded-lg [&_.prose_table]:border-collapse [&_.prose_table]:border [&_.prose_table]:border-slate-200",
                  "[&_.prose_th]:border [&_.prose_th]:border-slate-200 [&_.prose_th]:bg-slate-100/90 [&_.prose_th]:px-2.5 [&_.prose_th]:py-2 [&_.prose_th]:text-left [&_.prose_th]:text-[12px] [&_.prose_th]:font-bold [&_.prose_th]:text-slate-900",
                  "[&_.prose_td]:border [&_.prose_td]:border-slate-200 [&_.prose_td]:bg-white [&_.prose_td]:px-2.5 [&_.prose_td]:py-2 [&_.prose_td]:text-[13px] [&_.prose_td]:font-medium [&_.prose_td]:text-slate-800",
                )}
              >
                <ConsumerAlertDescription html={alert?.["Long Description"]} />
              </div>
            </section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
