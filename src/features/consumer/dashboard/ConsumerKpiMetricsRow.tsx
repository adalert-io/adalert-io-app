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
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-slate-900">Performance KPIs</h2>
          <div
            className="inline-flex w-full max-w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50/90 p-1 sm:w-auto"
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
                    "min-w-0 flex-1 rounded-lg px-3 py-2 text-center text-[13px] font-semibold transition-all sm:flex-none sm:px-4",
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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10">
          {KPI_FIELDS.map((field) => {
            let value = field.value(daily, activePeriod);
            let pct = field.pct(daily, activePeriod);
            let pctColor = "text-slate-900";

            if (value === null || value === undefined || value === 0) {
              value = 0;
              pct = 0;
            }

            if (pct !== 0) {
              if (field.pctRedIfPositive) {
                pctColor =
                  Number(pct) > 0
                    ? "text-red-600"
                    : Number(pct) < 0
                      ? "text-green-600"
                      : "text-slate-900";
              } else {
                pctColor =
                  Number(pct) > 0
                    ? "text-green-600"
                    : Number(pct) < 0
                      ? "text-red-600"
                      : "text-slate-900";
              }
            }

            let valueDisplay: string | number = value;
            if (field.isMoney) {
              valueDisplay = `${currencySymbol}${Number(value).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`;
            } else if ("isPercent" in field && field.isPercent) {
              valueDisplay = `${Number(value).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}%`;
            } else {
              valueDisplay = Number(value).toLocaleString("en-US");
            }

            const pctDisplay =
              pct === 0
                ? "0%"
                : `${Number(pct) > 0 ? "+" : ""}${Number(pct).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}%`;

            return (
              <div
                key={field.label}
                className="flex min-h-[88px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/40 px-2 py-3 text-center"
              >
                <span className="text-base font-bold text-slate-900">{valueDisplay}</span>
                <span className="mt-0.5 text-xs font-semibold text-slate-700">
                  {field.label}
                </span>
                <span className={cn("mt-1 text-xs font-semibold", pctColor)}>
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
