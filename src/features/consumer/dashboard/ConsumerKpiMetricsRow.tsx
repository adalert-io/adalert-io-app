"use client";

import * as React from "react";
import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const KPI_PERIODS = [
  { label: "7 days vs. prior", key: "7" },
  { label: "30 days vs. prior", key: "30" },
  { label: "90 days vs. prior", key: "90" },
] as const;

const KPI_FIELDS = [
  {
    label: "CPC",
    value: (d: Record<string, unknown>, k: string) => d[`cpc${k}`],
    pct: (d: Record<string, unknown>, k: string) => d[`cpcPercentage${k}`],
    pctRedIfPositive: true,
    isMoney: true,
  },
  {
    label: "CTR",
    value: (d: Record<string, unknown>, k: string) => d[`ctr${k}`],
    pct: (d: Record<string, unknown>, k: string) => d[`ctrPercentage${k}`],
    pctRedIfPositive: false,
    isPercent: true,
  },
  {
    label: "CPA",
    value: (d: Record<string, unknown>, k: string) => d[`cpa${k}`],
    pct: (d: Record<string, unknown>, k: string) => d[`cpaPercentage${k}`],
    pctRedIfPositive: true,
    isMoney: true,
  },
  {
    label: "Conv.",
    value: (d: Record<string, unknown>, k: string) => d[`conversions${k}`],
    pct: (d: Record<string, unknown>, k: string) =>
      d[`conversionsPercentage${k}`],
    pctRedIfPositive: false,
  },
  {
    label: "Search IS",
    value: (d: Record<string, unknown>, k: string) =>
      d[`searchImpressionShare${k}`],
    pct: (d: Record<string, unknown>, k: string) =>
      d[`searchImpressionSharePercentage${k}`],
    pctRedIfPositive: false,
    isPercent: true,
  },
  {
    label: "Impr. Top",
    value: (d: Record<string, unknown>, k: string) =>
      d[`topImpressionPercentage${k}`],
    pct: (d: Record<string, unknown>, k: string) =>
      d[`topImpressionPercentagePercentage${k}`],
    pctRedIfPositive: false,
    isPercent: true,
  },
  {
    label: "Cost",
    value: (d: Record<string, unknown>, k: string) => d[`costMicros${k}`],
    pct: (d: Record<string, unknown>, k: string) => d[`costMicrosPercentage${k}`],
    pctRedIfPositive: true,
    isMoney: true,
  },
  {
    label: "Clicks",
    value: (d: Record<string, unknown>, k: string) => d[`interactions${k}`],
    pct: (d: Record<string, unknown>, k: string) =>
      d[`interactionsPercentage${k}`],
    pctRedIfPositive: false,
  },
  {
    label: "Invalid Clicks",
    value: (d: Record<string, unknown>, k: string) => d[`invalidClicks${k}`],
    pct: (d: Record<string, unknown>, k: string) =>
      d[`invalidClicksPercentage${k}`],
    pctRedIfPositive: true,
  },
  {
    label: "Impressions",
    value: (d: Record<string, unknown>, k: string) => d[`impressions${k}`],
    pct: (d: Record<string, unknown>, k: string) =>
      d[`impressionsPercentage${k}`],
    pctRedIfPositive: false,
  },
] as const;

interface ConsumerKpiMetricsRowProps {
  dashboardDaily: Record<string, unknown> | null | undefined;
  currencySymbol: string;
}

export function ConsumerKpiMetricsRow({
  dashboardDaily,
  currencySymbol,
}: ConsumerKpiMetricsRowProps) {
  const [activePeriod, setActivePeriod] = useState("7");
  const daily = dashboardDaily ?? {};

  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white py-0 shadow-md">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex justify-start">
          <div
            className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50/90 p-1"
            role="tablist"
            aria-label="KPI comparison period"
          >
            {KPI_PERIODS.map((period) => {
              const isActive = activePeriod === period.key;
              return (
                <button
                  key={period.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    "whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all sm:px-4 sm:text-xs",
                    isActive
                      ? "bg-white text-[#015AFD] shadow-sm ring-1 ring-slate-200/80"
                      : "text-slate-600 hover:bg-white/60 hover:text-slate-900",
                  )}
                  onClick={() => setActivePeriod(period.key)}
                >
                  {period.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10">
          {KPI_FIELDS.map((field) => {
            let rawValue = field.value(daily, activePeriod);
            let rawPct = field.pct(daily, activePeriod);
            let pctColor = "text-slate-900";

            if (rawValue === null || rawValue === undefined || rawValue === 0) {
              rawValue = 0;
              rawPct = 0;
            }

            const value = Number(rawValue);
            const pct = Number(rawPct);

            if (pct !== 0) {
              if (field.pctRedIfPositive) {
                pctColor =
                  pct > 0
                    ? "text-red-600"
                    : pct < 0
                      ? "text-green-600"
                      : "text-slate-900";
              } else {
                pctColor =
                  pct > 0
                    ? "text-green-600"
                    : pct < 0
                      ? "text-red-600"
                      : "text-slate-900";
              }
            }

            let valueDisplay: string;
            if ("isMoney" in field && field.isMoney) {
              valueDisplay = `${currencySymbol}${value.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`;
            } else if ("isPercent" in field && field.isPercent) {
              valueDisplay = `${value.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}%`;
            } else {
              valueDisplay = value.toLocaleString("en-US");
            }

            const pctDisplay =
              pct === 0
                ? "0%"
                : `${pct > 0 ? "+" : ""}${pct.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}%`;

            return (
              <div
                key={field.label}
                className="flex min-h-[58px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50/40 px-1 py-1.5 text-center"
              >
                <span className="text-sm font-bold leading-tight text-slate-900">
                  {valueDisplay}
                </span>
                <span className="mt-0.5 text-[10px] font-semibold text-slate-600">
                  {field.label}
                </span>
                <span className={cn("mt-0.5 text-[10px] font-semibold", pctColor)}>
                  {pctDisplay}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
