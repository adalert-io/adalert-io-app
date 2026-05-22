"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  FileIcon,
  FileText,
  Filter,
  Loader2,
  Search,
  Settings,
  X,
} from "lucide-react";

import type { FilterState } from "@/app/dashboard/FilterPopover";
import { FilterPopover } from "@/app/dashboard/FilterPopover";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  CONSUMER_DASHBOARD_SELECT_CLASS,
  CONSUMER_DASHBOARD_TOOLBAR_GROUP_CLASS,
  CONSUMER_DASHBOARD_TOOLBAR_ICON_CLASS,
} from "./dashboard-theme";

const AUTO_REFRESH_TOOLTIP =
  "Alerts will automatically refresh every 15 minutes";

const DATA_DISCREPANCY_TOOLTIP =
  "There might be data discrepancies between the results shown in the adAlert dashboard and what's reported by the ad vendor due to retroactive data updates made by the vendor.";

interface ConsumerDashboardAlertsToolbarProps {
  alertsLoading: boolean;
  filteredAlertsCount: number;
  selectedCount: number;
  archiveLabel: string;
  isArchiving: boolean;
  onArchiveSelected: () => void;
  showSearch: boolean;
  onToggleSearch: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  isFilterOpen: boolean;
  onFilterOpenChange: (open: boolean) => void;
  filterState: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  isGeneratingContent: boolean;
  onAnalysisClick: () => void;
  analysisTooltip: string;
  onDownloadCsv: () => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

function ToolbarIconButton({
  label,
  badge,
  disabled,
  active,
  onClick,
  children,
}: {
  label: string;
  badge?: string;
  disabled?: boolean;
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className={cn(
        CONSUMER_DASHBOARD_TOOLBAR_ICON_CLASS,
        "relative",
        active && "bg-[#015AFD]/10",
      )}
    >
      {children}
      {badge ? (
        <span className="pointer-events-none absolute bottom-0.5 right-0.5 text-[8px] font-bold leading-none text-[#015AFD]">
          {badge}
        </span>
      ) : null}
    </Button>
  );
}

export function ConsumerDashboardAlertsToolbar({
  alertsLoading,
  filteredAlertsCount,
  selectedCount,
  archiveLabel,
  isArchiving,
  onArchiveSelected,
  showSearch,
  onToggleSearch,
  searchValue,
  onSearchChange,
  isFilterOpen,
  onFilterOpenChange,
  filterState,
  onFilterChange,
  isGeneratingContent,
  onAnalysisClick,
  analysisTooltip,
  onDownloadCsv,
  pageSize,
  onPageSizeChange,
}: ConsumerDashboardAlertsToolbarProps) {
  return (
    <div className="space-y-3 border-b border-slate-100 px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Alerts
            </h2>

            {alertsLoading ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#015AFD]/10 px-2.5 py-1 text-[12px] font-semibold text-[#015AFD]">
                <Loader2 className="size-3 animate-spin" aria-hidden />
                Updating
              </span>
            ) : null}

            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-lg text-emerald-600 transition-colors hover:bg-emerald-50"
                    aria-label="Auto-refresh active"
                  >
                    <Clock className="size-3.5" strokeWidth={2} aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  {AUTO_REFRESH_TOOLTIP}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Alerts information"
                  >
                    <AlertTriangle className="size-3.5" strokeWidth={2} aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  {DATA_DISCREPANCY_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            </div>

            <Link
              href="/consumer/settings/settings/alerts"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#015AFD]"
            >
              <Settings className="size-3.5 shrink-0" aria-hidden />
              Settings
            </Link>
          </div>

          {selectedCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#015AFD]/20 bg-[#015AFD]/5 px-3 py-2">
              <span className="text-[13px] font-semibold text-slate-800">
                {selectedCount} selected
              </span>
              <span className="hidden h-4 w-px bg-slate-200 sm:block" aria-hidden />
              <Button
                type="button"
                size="sm"
                disabled={isArchiving}
                onClick={onArchiveSelected}
                className="h-8 rounded-lg bg-[#015AFD] px-3 text-[12px] font-semibold text-white hover:bg-[#0146ca]"
              >
                {isArchiving ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                    Working…
                  </>
                ) : (
                  archiveLabel
                )}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex w-full min-w-0 flex-col gap-2 sm:max-w-xl lg:max-w-none lg:flex-1 lg:items-stretch">
          {showSearch ? (
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-[#015AFD]/40 focus-within:ring-2 focus-within:ring-[#015AFD]/15">
              <Search className="size-4 shrink-0 text-[#015AFD]" aria-hidden />
              <input
                className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                placeholder="Search alerts"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                autoFocus
                aria-label="Search alerts"
              />
              {searchValue ? (
                <button
                  type="button"
                  className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  onClick={() => onSearchChange("")}
                  aria-label="Clear search"
                >
                  <X className="size-4" aria-hidden />
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <div className={CONSUMER_DASHBOARD_TOOLBAR_GROUP_CLASS}>
              <ToolbarIconButton
                label="Show search"
                active={showSearch}
                onClick={onToggleSearch}
              >
                <Search className="size-[18px]" strokeWidth={2} aria-hidden />
              </ToolbarIconButton>

              <Popover open={isFilterOpen} onOpenChange={onFilterOpenChange}>
                <PopoverTrigger asChild>
                  <ToolbarIconButton
                    label="Open filters"
                    active={isFilterOpen}
                  >
                    <Filter className="size-[18px]" strokeWidth={2} aria-hidden />
                  </ToolbarIconButton>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <FilterPopover
                    filterState={filterState}
                    onFilterChange={onFilterChange}
                    onClose={() => onFilterOpenChange(false)}
                  />
                </PopoverContent>
              </Popover>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <ToolbarIconButton
                      label="View Analysis"
                      badge="AI"
                      disabled={
                        isGeneratingContent || filteredAlertsCount < 10
                      }
                      onClick={onAnalysisClick}
                    >
                      <FileText className="size-[18px]" strokeWidth={2} aria-hidden />
                    </ToolbarIconButton>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  {analysisTooltip}
                </TooltipContent>
              </Tooltip>

              <ToolbarIconButton
                label="Export CSV"
                badge="CSV"
                onClick={onDownloadCsv}
              >
                <FileIcon className="size-[18px] text-[#015AFD]" aria-hidden />
              </ToolbarIconButton>
            </div>

            <div className="relative shrink-0">
              <select
                className={CONSUMER_DASHBOARD_SELECT_CLASS}
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                aria-label="Rows per page"
              >
                <option value={15}>15 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
