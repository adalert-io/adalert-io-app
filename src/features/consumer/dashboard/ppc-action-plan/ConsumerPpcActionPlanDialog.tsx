"use client";

import Image from "next/image";
import { FileChartColumn, Loader2, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ConsumerResponsiveModal,
  ConsumerResponsiveModalBody,
  ConsumerResponsiveModalDescription,
  ConsumerResponsiveModalTitle,
} from "@/features/consumer/ConsumerResponsiveModal";
import type { Alert } from "@/lib/store/dashboard-store";
import { cn, formatAccountNumber } from "@/lib/utils";

import { ConsumerPpcActionPlanCharts } from "./ConsumerPpcActionPlanCharts";
import {
  buildAlertSeverityChartData,
  buildAlertTypeChartData,
  parsePpcActionPlanSections,
} from "./helpers";

interface ConsumerPpcActionPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountName?: string;
  accountId?: string;
  content: string;
  isGenerating: boolean;
  alertsForCharts: Alert[];
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#015AFD]/15 bg-gradient-to-br from-[#015AFD]/8 via-white to-slate-50 p-5">
        <div className="flex items-center gap-2">
          <div className="size-2 animate-pulse rounded-full bg-[#015AFD]/40" />
          <div className="h-4 w-40 animate-pulse rounded-md bg-slate-200" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-slate-200/80" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-slate-200/60" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-[260px] animate-pulse rounded-xl bg-slate-100" />
        <div className="h-[260px] animate-pulse rounded-xl bg-slate-100" />
      </div>

      <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-10">
        <Loader2 className="size-6 animate-spin text-[#015AFD]" aria-hidden />
        <p className="text-[15px] font-medium text-slate-600">
          AI is analyzing your alerts and building your action plan…
        </p>
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-slate-100 bg-slate-50"
          />
        ))}
      </div>
    </div>
  );
}

export function ConsumerPpcActionPlanDialog({
  open,
  onOpenChange,
  accountName,
  accountId,
  content,
  isGenerating,
  alertsForCharts,
}: ConsumerPpcActionPlanDialogProps) {
  const sections = parsePpcActionPlanSections(content);
  const severityData = buildAlertSeverityChartData(alertsForCharts);
  const typeData = buildAlertTypeChartData(alertsForCharts);
  const createdLabel = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <ConsumerResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      showCloseButton={false}
      overlayClassName="bg-slate-900/60 backdrop-blur-sm"
      dialogClassName="w-[calc(100%-2rem)] max-w-4xl rounded-2xl border border-slate-200/90 shadow-2xl"
      drawerClassName="max-h-[min(92dvh,880px)]"
    >
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#015AFD]/10">
            <Image
              src="/images/adalert-logo.avif"
              alt=""
              width={28}
              height={28}
              className="size-7"
            />
          </div>
          <div className="min-w-0 border-slate-200 ps-3 sm:border-s sm:ps-4">
            <div className="flex items-center gap-2">
              <FileChartColumn
                className="size-5 shrink-0 text-[#015AFD]"
                aria-hidden
              />
              <ConsumerResponsiveModalTitle className="text-lg sm:text-xl">
                PPC Action Plan
              </ConsumerResponsiveModalTitle>
            </div>
            <ConsumerResponsiveModalDescription className="mt-1 text-[13px] leading-snug">
              AI-powered actionable insights for instant results.
            </ConsumerResponsiveModalDescription>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 rounded-xl border-slate-200"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      </header>

      <ConsumerResponsiveModalBody className="bg-[#f8fafc] px-5 py-5 sm:px-6 sm:py-6">
        {isGenerating ? (
          <LoadingSkeleton />
        ) : content ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#015AFD]/20 bg-gradient-to-br from-[#015AFD]/10 via-white to-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#015AFD]">
                    Report snapshot
                  </p>
                  <p className="text-[13px] text-slate-600">
                    <span className="font-medium text-slate-800">Created:</span>{" "}
                    {createdLabel}
                  </p>
                  {accountName ? (
                    <p className="text-[13px] text-slate-600">
                      <span className="font-medium text-slate-800">Account:</span>{" "}
                      {accountName}
                      {accountId ? (
                        <span className="tabular-nums text-slate-500">
                          {" "}
                          ({formatAccountNumber(accountId)})
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#015AFD]/10 px-3 py-1 text-[11px] font-semibold text-[#015AFD]">
                  <Sparkles className="size-3.5" aria-hidden />
                  {sections.length} prioritized steps
                </span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
                Based on your most recent alerts, ranked by KPI importance,
                impact, and severity.
              </p>
            </div>

            <ConsumerPpcActionPlanCharts
              severityData={severityData}
              typeData={typeData}
              totalAlerts={alertsForCharts.length}
            />

            <div className="space-y-3">
              {sections.map((section, index) => (
                <article
                  key={`${section.heading}-${index}`}
                  className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#015AFD] text-[13px] font-bold text-white">
                      {index + 1}
                    </span>
                    <h3 className="pt-0.5 text-[15px] font-bold leading-snug text-slate-900">
                      {section.heading}
                    </h3>
                  </div>
                  <p className="text-[14px] leading-relaxed text-slate-700">
                    {section.body}
                  </p>
                </article>
              ))}
            </div>

            <footer className="rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-center">
              <p className="text-[11px] font-medium text-slate-500">
                Generated by adAlert.io AI · {createdLabel}
              </p>
            </footer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <FileChartColumn className="mb-4 size-14 text-slate-300" aria-hidden />
            <h3 className="text-lg font-semibold text-slate-900">
              Ready to generate your plan
            </h3>
            <p className="mt-2 max-w-sm text-[14px] text-slate-500">
              Use the AI action on the alerts table to build a prioritized PPC
              action plan for this account.
            </p>
          </div>
        )}
      </ConsumerResponsiveModalBody>
    </ConsumerResponsiveModal>
  );
}
