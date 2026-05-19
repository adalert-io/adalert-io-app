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
const SPEND_MTD_TOOLTIP =
  "The actual amount can differ between users' dashboards based on API call times and could be different from what you see on the ads account, with up to a few hours' difference.";

const PROJECTION_TOOLTIP =
  "Spend projections improve from the second day of the month onward and get more accurate as the month progresses.";

const BAR_HEIGHT_PX = 14;

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
  const showLabelOutsideBar = percentBar < 18;

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
    <Card className="flex h-full min-h-[132px] w-full justify-center gap-0 rounded-xl border border-slate-200 bg-white py-0 shadow-sm">
      <CardContent className="flex w-full flex-col justify-center gap-2 px-4 py-3.5 sm:px-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-muted-foreground truncate text-xs font-medium">
                Spend MTD
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600"
                    aria-label="Spend MTD information"
                  >
                    <AlertTriangle className="size-3" aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  {SPEND_MTD_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <p className="truncate text-base font-bold leading-tight text-slate-900 sm:text-lg">
                {spendDisplay}
              </p>
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: indicatorColor }}
                aria-hidden
              />
            </div>
          </div>

          <div className="min-w-0 text-right">
            <p className="text-muted-foreground text-xs font-medium">
              Monthly budget
            </p>
            {isEditingBudget ? (
              <div className="mt-1 flex items-center justify-end gap-1">
                <Input
                  ref={budgetInputRef}
                  type="number"
                  min={0}
                  className="h-7 w-[72px] px-2 text-right text-xs font-semibold tabular-nums"
                  value={budgetInput}
                  onChange={(e) =>
                    onBudgetInputChange(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  disabled={isUpdatingBudget}
                  aria-label="Monthly budget amount"
                />
                <Button
                  size="sm"
                  className="h-7 rounded-md bg-[#015AFD] px-2 text-[11px] font-semibold hover:bg-[#0146ca]"
                  onClick={onConfirmBudget}
                  disabled={
                    isUpdatingBudget || !budgetInput || Number(budgetInput) < 0
                  }
                >
                  Save
                </Button>
              </div>
            ) : (
              <div className="mt-0.5 flex items-center justify-end gap-1">
                <button
                  type="button"
                  className="rounded p-0.5 text-[#015AFD] hover:bg-[#015AFD]/10"
                  aria-label="Edit monthly budget"
                  onClick={onEditBudget}
                >
                  <Pencil className="size-3" aria-hidden />
                </button>
                <p className="truncate text-base font-bold leading-tight text-slate-900 sm:text-lg">
                  {budgetDisplay}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="relative w-full" style={{ height: BAR_HEIGHT_PX + 14 }}>
          <div
            className="relative w-full"
            style={{ height: BAR_HEIGHT_PX, marginTop: 2 }}
          >
            <div
              className="absolute top-1/2 left-0 z-0 w-full -translate-y-1/2 rounded-full border border-slate-200 bg-white"
              style={{ height: BAR_HEIGHT_PX }}
            />
            <div
              className="absolute top-1/2 left-0 z-[1] -translate-y-1/2 rounded-full bg-[#015AFD]"
              style={{
                height: BAR_HEIGHT_PX,
                width: `${percentBar}%`,
                minWidth: percentBar > 0 ? 6 : 0,
              }}
            />
            {showLabelOutsideBar ? (
              <span
                className="absolute top-1/2 z-[2] -translate-y-1/2 text-[10px] font-semibold text-slate-800"
                style={{ left: `calc(${percentBar}% + 6px)` }}
              >
                {percentText.toFixed(1)}%
              </span>
            ) : (
              <span
                className="absolute top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold text-white"
                style={{ left: `calc(${percentBar / 2}%)` }}
              >
                {percentText.toFixed(1)}%
              </span>
            )}
            <div
              className="pointer-events-none absolute z-[2] w-px bg-slate-500"
              style={{
                left: `calc(${dayPercent}% - 1px)`,
                top: 1,
                height: BAR_HEIGHT_PX - 2,
              }}
            />
          </div>
          <span
            className="absolute text-[10px] font-medium text-slate-500"
            style={{
              top: BAR_HEIGHT_PX + 4,
              left:
                dayPercent > 90
                  ? "calc(100% - 36px)"
                  : `calc(${dayPercent}% - 10px)`,
            }}
          >
            {day}d
          </span>
        </div>

        <p className="flex items-center justify-end gap-1 truncate text-[10px] text-slate-500">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="shrink-0 text-[#015AFD]"
                aria-label="Spend projection information"
              >
                <Info className="size-3" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {PROJECTION_TOOLTIP}
            </TooltipContent>
          </Tooltip>
          <span className="truncate">
            Proj. {currencySymbol}
            {projection.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
