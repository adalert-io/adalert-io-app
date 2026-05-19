"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Info, Pencil } from "lucide-react";
import moment from "moment";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const SPEND_MTD_TOOLTIP =
  "The actual amount can differ between users' dashboards based on API call times and could be different from what you see on the ads account, with up to a few hours' difference.";

const PROJECTION_TOOLTIP =
  "Spend projections improve from the second day of the month onward and get more accurate as the month progresses.";

function getSpendMtdIndicatorColor(key: string | undefined): string {
  if (
    key &&
    [
      "AccountIsOverPacing33PercentToDate",
      "AccountIsUnderPacing33PercentToDate",
    ].includes(key)
  ) {
    return "#EDE41B";
  }
  if (
    key &&
    [
      "AccountIsOverPacing50PercentToDate",
      "AccountIsUnderPacing50PercentToDate",
    ].includes(key)
  ) {
    return "#FF7F26";
  }
  if (
    key &&
    [
      "AccountIsOverPacing75PercentToDate",
      "AccountIsUnderPacing75PercentToDate",
    ].includes(key)
  ) {
    return "#EE1B23";
  }
  return "#22c55e";
}

interface ConsumerSpendBudgetCardProps {
  currencySymbol: string;
  spendMtd: number | null | undefined;
  spendMtdLoading: boolean;
  spendMtdIndicatorKey?: string;
  monthlyBudget: number | null | undefined;
  isEditingBudget: boolean;
  budgetInput: string;
  isUpdatingBudget: boolean;
  onEditBudget: () => void;
  onConfirmBudget: () => void;
  onBudgetInputChange: (value: string) => void;
}

export function ConsumerSpendBudgetCard({
  currencySymbol,
  spendMtd,
  spendMtdLoading,
  spendMtdIndicatorKey,
  monthlyBudget,
  isEditingBudget,
  budgetInput,
  isUpdatingBudget,
  onEditBudget,
  onConfirmBudget,
  onBudgetInputChange,
}: ConsumerSpendBudgetCardProps) {
  const budgetInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditingBudget && budgetInputRef.current) {
      budgetInputRef.current.focus();
    }
  }, [isEditingBudget]);

  const spend = Number(spendMtd ?? 0);
  const budget = Number(monthlyBudget ?? 1);
  const percentBar = budget ? Math.min((spend / budget) * 100, 100) : 0;
  const percentText = budget ? (spend / budget) * 100 : 0;
  const showLabelOutsideBar = percentBar < 15;

  const now = moment();
  const day = now.date();
  const daysInMonth = now.daysInMonth();
  const dayPercent = (day / daysInMonth) * 100;
  const projection = day ? (spend / day) * 30.4 : 0;

  const spendDisplay =
    spendMtdLoading || spendMtd == null
      ? "—"
      : `${currencySymbol}${Number(spendMtd).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

  const budgetDisplay =
    monthlyBudget != null
      ? `${currencySymbol}${Number(monthlyBudget).toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}`
      : "—";

  const indicatorColor = getSpendMtdIndicatorColor(spendMtdIndicatorKey);

  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white py-0 shadow-md">
      <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5">
              <p className="text-muted-foreground text-sm font-medium">
                Spend MTD
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Spend MTD information"
                  >
                    <AlertTriangle className="size-3.5" aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  {SPEND_MTD_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <p className="truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
                {spendDisplay}
              </p>
              <span
                className="size-3 shrink-0 rounded-full border border-white shadow-sm"
                style={{ background: indicatorColor }}
                aria-hidden
              />
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end">
            <p className="text-muted-foreground text-sm font-medium">
              Monthly budget
            </p>
            {isEditingBudget ? (
              <div className="mt-2 flex w-full flex-wrap items-center justify-start gap-2 sm:justify-end">
                <Input
                  ref={budgetInputRef}
                  type="number"
                  min={0}
                  className="h-9 w-28 text-right text-sm font-semibold tabular-nums"
                  value={budgetInput}
                  onChange={(e) =>
                    onBudgetInputChange(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  disabled={isUpdatingBudget}
                  aria-label="Monthly budget amount"
                />
                <Button
                  size="sm"
                  className="h-9 rounded-lg bg-[#015AFD] px-4 font-semibold hover:bg-[#0146ca]"
                  onClick={onConfirmBudget}
                  disabled={
                    isUpdatingBudget || !budgetInput || Number(budgetInput) < 0
                  }
                >
                  Save
                </Button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-[#015AFD] transition-colors hover:bg-[#015AFD]/10"
                  aria-label="Edit monthly budget"
                  onClick={onEditBudget}
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
                <p className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
                  {budgetDisplay}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-4">
          <div className="relative w-full" style={{ minHeight: 52 }}>
            <div className="relative flex h-6 w-full items-center">
              <div className="absolute top-1/2 left-0 z-0 h-6 w-full -translate-y-1/2 rounded-full border border-slate-200 bg-white" />
              <div
                className="absolute top-1/2 left-0 z-[1] h-6 -translate-y-1/2 rounded-full bg-[#015AFD] shadow-sm transition-[width]"
                style={{
                  width: `${percentBar}%`,
                  minWidth: percentBar > 0 ? 10 : 0,
                }}
              />
              {showLabelOutsideBar ? (
                <span
                  className={cn(
                    "absolute top-0 z-[2] flex h-6 select-none items-center text-xs font-semibold text-slate-900",
                  )}
                  style={{ left: `calc(${percentBar}% + 10px)` }}
                >
                  {percentText.toFixed(1)}%
                </span>
              ) : (
                <span
                  className="absolute top-0 z-[2] flex h-6 -translate-x-1/2 select-none items-center text-xs font-semibold text-white"
                  style={{ left: `calc(${percentBar / 2}%)` }}
                >
                  {percentText.toFixed(1)}%
                </span>
              )}
              <div
                className="pointer-events-none absolute top-1 z-[2] h-4"
                style={{ left: `calc(${dayPercent}% - 1px)` }}
              >
                <div className="h-4 w-0.5 rounded-sm bg-slate-500" />
              </div>
            </div>
            <div
              className="absolute left-0 w-full"
              style={{ top: 28 }}
            >
              <div
                className="absolute"
                style={{
                  left:
                    dayPercent > 93
                      ? "calc(100% - 48px)"
                      : `calc(${dayPercent}% - 12px)`,
                }}
              >
                <span className="text-xs font-semibold text-slate-600">
                  {day}
                </span>
                <span className="ml-1 text-[11px] font-medium text-slate-500">
                  days
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-3">
          <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="rounded-md p-0.5 text-[#015AFD] transition-colors hover:bg-[#015AFD]/10"
                  aria-label="Spend projection information"
                >
                  <Info className="size-3.5" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {PROJECTION_TOOLTIP}
              </TooltipContent>
            </Tooltip>
            <span>
              Spend projection:{" "}
              <span className="font-semibold text-slate-800">
                {currencySymbol}
                {projection.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
