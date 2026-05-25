"use client";

import moment from "moment";
import { Calendar, Layers, Tag } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Alert } from "@/lib/store/dashboard-store";
import { cn } from "@/lib/utils";

import { ConsumerAlertDescription } from "./alert-detail";
import { AlertSeverityGlyph, SeverityBadge } from "./alert-ui";
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
        <div className="flex h-full min-h-0 flex-col bg-[#f8fafc]">
          <SheetHeader className="gap-0 border-b border-slate-200/90 bg-white px-5 py-5 text-start sm:px-6">
            <div className="flex items-start gap-3.5 pe-8">
              <AlertSeverityGlyph severity={alert?.Severity} className="size-11 rounded-xl" iconClassName="size-6" />
              <div className="min-w-0 flex-1 space-y-2.5">
                <SeverityBadge severity={alert?.Severity} />
                <SheetTitle className="text-[18px] font-bold leading-snug tracking-tight text-slate-900 sm:text-[19px]">
                  {alert?.Alert ?? "Alert details"}
                </SheetTitle>
                {accountName ? (
                  <p className="text-[13px] font-medium text-slate-500">
                    {accountName}
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

            <section className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[#015AFD]/80">
                  Alert details
                </h3>
              </div>
              <ConsumerAlertDescription html={alert?.["Long Description"]} />
            </section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
