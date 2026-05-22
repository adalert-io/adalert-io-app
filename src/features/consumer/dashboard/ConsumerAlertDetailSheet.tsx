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

function MetaTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Calendar;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="size-3 shrink-0 opacity-70" aria-hidden />
        {label}
      </div>
      <p className="mt-1.5 text-[13px] font-semibold leading-snug text-slate-900">
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
          side === "right" && "w-full sm:max-w-[480px]",
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
              <MetaTile label="Found" value={formattedDate} icon={Calendar} />
              <MetaTile label="Type" value={alert?.Type ?? "—"} icon={Tag} />
              <MetaTile label="Level" value={alert?.Level ?? "—"} icon={Layers} />
            </div>

            <section className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                  Alert details
                </h3>
              </div>
              <ConsumerAlertDescription
                html={alert?.["Long Description"]}
                plainText={alert?.["Long Description Plain Text"]}
              />
            </section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
