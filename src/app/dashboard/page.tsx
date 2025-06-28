"use client";

import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircledIcon,
  DownloadIcon,
  FileIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
} from "@radix-ui/react-icons";
import { Filter } from "lucide-react";
import { useUserAdsAccountsStore } from "@/lib/store/user-ads-accounts-store";
import type { AdsAccount } from "@/lib/store/user-ads-accounts-store";
import { useDashboardStore } from "@/lib/store/dashboard-store";
import { useAlertOptionSetsStore } from "@/lib/store/alert-option-sets-store";
import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  XIcon,
  AlertTriangle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ALERT_SEVERITIES, ALERT_SEVERITY_COLORS } from "@/lib/constants/index";
import moment from "moment";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FilterPopover, FilterState } from "./FilterPopover";
import { doc, updateDoc, query, collection, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { COLLECTIONS } from "@/lib/constants";

const KPI_PERIODS = [
  { label: "7 days vs. prior", key: "7" },
  { label: "30 days vs. prior", key: "30" },
  { label: "90 days vs. prior", key: "90" },
];

const KPI_FIELDS = [
  { label: "CPC", value: (d: Record<string, any>, k: string) => d?.[`cpc${k}`], pct: (d: Record<string, any>, k: string) => d?.[`cpcPercentage${k}`], pctRedIfPositive: true, isMoney: true },
  { label: "CTR", value: (d: Record<string, any>, k: string) => d?.[`ctr${k}`], pct: (d: Record<string, any>, k: string) => d?.[`ctrPercentage${k}`], pctRedIfPositive: false, isPercent: true },
  { label: "CPA", value: (d: Record<string, any>, k: string) => d?.[`cpa${k}`], pct: (d: Record<string, any>, k: string) => d?.[`cpaPercentage${k}`], pctRedIfPositive: true, isMoney: true },
  { label: "Conv.", value: (d: Record<string, any>, k: string) => d?.[`conversions${k}`], pct: (d: Record<string, any>, k: string) => d?.[`conversionsPercentage${k}`], pctRedIfPositive: false },
  { label: "Search IS", value: (d: Record<string, any>, k: string) => d?.[`searchImpressionShare${k}`], pct: (d: Record<string, any>, k: string) => d?.[`searchImpressionSharePercentage${k}`], pctRedIfPositive: false, isPercent: true },
  { label: "Impr. Top", value: (d: Record<string, any>, k: string) => d?.[`topImpressionPercentage${k}`], pct: (d: Record<string, any>, k: string) => d?.[`topImpressionPercentagePercentage${k}`], pctRedIfPositive: false, isPercent: true },
  { label: "Cost", value: (d: Record<string, any>, k: string) => d?.[`costMicros${k}`], pct: (d: Record<string, any>, k: string) => d?.[`costMicrosPercentage${k}`], pctRedIfPositive: true, isMoney: true },
  { label: "Clicks", value: (d: Record<string, any>, k: string) => d?.[`interactions${k}`], pct: (d: Record<string, any>, k: string) => d?.[`interactionsPercentage${k}`], pctRedIfPositive: false },
  { label: "Invalid Clicks", value: (d: Record<string, any>, k: string) => d?.[`invalidClicks${k}`], pct: (d: Record<string, any>, k: string) => d?.[`invalidClicksPercentage${k}`], pctRedIfPositive: false },
  { label: "Impressions", value: (d: Record<string, any>, k: string) => d?.[`impressions${k}`], pct: (d: Record<string, any>, k: string) => d?.[`impressionsPercentage${k}`], pctRedIfPositive: false },
];

function KpiMetricsRow({ dashboardDaily, currencySymbol }: { dashboardDaily: any, currencySymbol: string }) {
  const [activePeriod, setActivePeriod] = React.useState("7");

  return (
    <div className="mb-6">
      <div className="flex gap-2 mb-3">
        {KPI_PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`px-4 py-2 rounded-lg font-semibold border transition-colors text-sm ${
              activePeriod === p.key
                ? "bg-[#015AFD] text-white border-[#015AFD]"
                : "bg-white text-[#015AFD] border-[#015AFD] hover:bg-blue-50"
            }`}
            onClick={() => setActivePeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
        {KPI_FIELDS.map((field) => {
          let value = field.value(dashboardDaily, activePeriod);
          let pct = field.pct(dashboardDaily, activePeriod);
          let pctColor = "text-black";
          if (value === null || value === undefined || value === 0) {
            value = 0;
            pct = 0;
          }
          if (pct !== 0) {
            if (field.pctRedIfPositive) {
              pctColor = pct > 0 ? "text-red-600" : pct < 0 ? "text-green-600" : "text-black";
            } else {
              pctColor = pct > 0 ? "text-green-600" : pct < 0 ? "text-red-600" : "text-black";
            }
          }
          let valueDisplay = value;
          if (field.isMoney) {
            valueDisplay = `${currencySymbol}${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          } else if (field.isPercent) {
            valueDisplay = `${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
          } else {
            valueDisplay = Number(value).toLocaleString("en-US");
          }
          let pctDisplay = pct === 0 ? "0%" : `${pct > 0 ? "+" : ""}${Number(pct).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
          return (
            <Card key={field.label} className="bg-white">
              <CardContent className="py-2 px-2 flex flex-col items-center">
                <span className="text-base font-bold text-gray-900">{valueDisplay}</span>
                <span className="text-xs font-semibold text-gray-900">{field.label}</span>
                <span className={`text-xs font-semibold ${pctColor}`}>{pctDisplay}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { selectedAdsAccount, userAdsAccounts } = useUserAdsAccountsStore();
  const [currentAdsAccount, setCurrentAdsAccount] = useState<AdsAccount | null>(
    null
  );
  const {
    fetchAlerts,
    fetchOrCreateDashboardDaily,
    fetchSpendMtd,
    fetchSpendMtdIndicator,
    fetchKpiData,
    fetchCurrencySymbol,
    triggerShowingAdsLabel,
    dashboardDaily,
    adsLabel,
    spendMtdLoading,
    spendMtdIndicatorLoading,
    kpiDataLoading,
    currencySymbolLoading,
    updateMonthlyBudget,
  } = useDashboardStore();
  const { alertOptionSets, fetchAlertOptionSets } = useAlertOptionSetsStore();
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [pageSize, setPageSize] = React.useState(25);

  // --- Search State ---
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // --- Filter State ---
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    severity: [
      ALERT_SEVERITIES.CRITICAL,
      ALERT_SEVERITIES.MEDIUM,
      ALERT_SEVERITIES.LOW,
    ],
    label: "Unarchive",
    timeRange: "All Time",
  });

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  // 1. Add state at the top of the Dashboard component
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState<string>(currentAdsAccount?.["Monthly Budget"]?.toString() || "");
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);

  // 2. Add handler for Pencil1Icon click
  const handleEditBudget = () => {
    setBudgetInput(currentAdsAccount?.["Monthly Budget"]?.toString() || "");
    setIsEditingBudget(true);
  };

  // 3. Add handler for Confirm
  const handleConfirmBudget = async () => {
    if (!currentAdsAccount || !budgetInput) return;
    const monthlyBudget = Math.max(0, Number(budgetInput));
    setIsUpdatingBudget(true);
    try {
      const updated = await updateMonthlyBudget(
        currentAdsAccount.id,
        monthlyBudget,
        Number(currentAdsAccount["Monthly Budget"])
      );
      if (updated) {
        setCurrentAdsAccount((prev) => prev ? ({ ...prev, "Monthly Budget": monthlyBudget, "Daily Budget": Number((monthlyBudget / 30.4).toFixed(2)) }) : prev);
      }
      setIsEditingBudget(false);
    } catch (err) {
      console.error("Failed to update budget", err);
    } finally {
      setIsUpdatingBudget(false);
    }
  };

  const lastFetchedAccountId = useRef<string | null>(null);

  useEffect(() => {
    console.log(user);
    if (!user) {
      router.push("/auth");
      return;
    }
    // Set currentAdsAccount based on store
    if (selectedAdsAccount) {
      setCurrentAdsAccount(selectedAdsAccount);
    } else if (userAdsAccounts && userAdsAccounts.length > 0) {
      setCurrentAdsAccount(userAdsAccounts[0]);
    } else {
      setCurrentAdsAccount(null);
    }

    console.log("selectedAdsAccount: ", selectedAdsAccount);
  }, [user, router, selectedAdsAccount, userAdsAccounts]);

  useEffect(() => {
    if (
      currentAdsAccount &&
      currentAdsAccount.id !== lastFetchedAccountId.current
    ) {
      fetchAlerts(currentAdsAccount.id);
      fetchOrCreateDashboardDaily(currentAdsAccount.id);
      triggerShowingAdsLabel(currentAdsAccount);
      if (!currentAdsAccount["Currency Symbol"]) {
        fetchCurrencySymbol(currentAdsAccount);
      }
      lastFetchedAccountId.current = currentAdsAccount.id;
    }
    // If only budget fields change, skip the fetches!
  }, [
    currentAdsAccount?.id, // Only depend on the ID, not the whole object
    fetchAlerts,
    fetchOrCreateDashboardDaily,
    fetchCurrencySymbol,
    triggerShowingAdsLabel,
  ]);

  // Fetch spend MTD after dashboardDaily is set
  useEffect(() => {
    if (
      dashboardDaily &&
      currentAdsAccount &&
      dashboardDaily["Spend MTD"] === undefined &&
      !spendMtdLoading
    ) {
      fetchSpendMtd(currentAdsAccount);
    }
  }, [dashboardDaily, currentAdsAccount, fetchSpendMtd, spendMtdLoading]);

  useEffect(() => {
    if (
      dashboardDaily &&
      currentAdsAccount &&
      dashboardDaily["Spend MTD Indicator Alert"] === undefined &&
      !spendMtdIndicatorLoading
    ) {
      fetchSpendMtdIndicator(currentAdsAccount);
    }
  }, [
    dashboardDaily,
    currentAdsAccount,
    fetchSpendMtdIndicator,
    spendMtdIndicatorLoading,
  ]);

  useEffect(() => {
    if (
      dashboardDaily &&
      currentAdsAccount &&
      !dashboardDaily["Is KPI Fetched"] &&
      !kpiDataLoading
    ) {
      fetchKpiData(currentAdsAccount);
    }
  }, [dashboardDaily, currentAdsAccount, fetchKpiData, kpiDataLoading]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, 1500);
    return () => clearTimeout(handler);
  }, [searchValue]);

  // Alerts Table Columns
  const useAlertColumns = (
    expandedRowIds: string[],
    setExpandedRowIds: React.Dispatch<React.SetStateAction<string[]>>
  ): ColumnDef<any>[] => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "date",
      header: "Found",
      cell: ({ row }) => {
        const dateObj = row.original["Date Found"]?.toDate?.();
        const formatted = dateObj ? moment(dateObj).format("DD MMM") : "-";
        return <span>{formatted}</span>;
      },
    },
    {
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row }) => (
        <span
          className={`inline-block w-3 h-3 rounded-full ${
            row.original.Severity.toLowerCase() ===
            ALERT_SEVERITIES.CRITICAL.toLowerCase()
              ? `bg-[${ALERT_SEVERITY_COLORS.CRITICAL}]`
              : row.original.Severity.toLowerCase() ===
                ALERT_SEVERITIES.MEDIUM.toLowerCase()
              ? `bg-[${ALERT_SEVERITY_COLORS.MEDIUM}]`
              : `bg-[${ALERT_SEVERITY_COLORS.LOW}]`
          }`}
        />
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span>{row.original.Alert}</span>,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <span>{row.original.Type}</span>,
    },
    {
      accessorKey: "level",
      header: "Level",
      cell: ({ row }) => <span>{row.original.Level}</span>,
    },
    {
      id: "expand",
      header: "",
      cell: ({ row }) => {
        const isExpanded = expandedRowIds.includes(row.id);
        return (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setExpandedRowIds((ids: string[]) =>
                isExpanded
                  ? ids.filter((id: string) => id !== row.id)
                  : [...ids, row.id]
              );
            }}
          >
            {isExpanded ? <ChevronUp /> : <ChevronDown />}
          </Button>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];

  function AlertsDataTable({
    pageSize,
    setPageSize,
    filteredAlerts,
  }: {
    pageSize: number;
    setPageSize: React.Dispatch<React.SetStateAction<number>>;
    filteredAlerts: any[];
  }) {
    const [expandedRowIds, setExpandedRowIds] = React.useState<string[]>([]);
    const [pageIndex, setPageIndex] = React.useState(0);

    const columns = React.useMemo(
      () => useAlertColumns(expandedRowIds, setExpandedRowIds),
      [expandedRowIds]
    );

    const table = useReactTable({
      data: filteredAlerts,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      state: {
        pagination: {
          pageIndex,
          pageSize,
        },
      },
      onPaginationChange: (updater) => {
        if (typeof updater === "function") {
          const next = updater({ pageIndex, pageSize });
          setPageIndex(next.pageIndex);
          setPageSize(next.pageSize);
        } else {
          if (updater.pageIndex !== undefined) {
            setPageIndex(updater.pageIndex);
          }
          if (updater.pageSize !== undefined) {
            setPageSize(updater.pageSize);
          }
        }
      },
      pageCount: Math.ceil(filteredAlerts.length / pageSize),
    });

    return (
      <div className="rounded-md border">
        <table className="min-w-full text-xs">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-2 py-2 text-left">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <React.Fragment key={row.id}>
                <tr className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-2 py-2 align-top">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
                {expandedRowIds.includes(row.id) && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="bg-[#FAFAFA] px-4 py-4"
                    >
                      <div
                        className="prose max-w-none text-sm"
                        dangerouslySetInnerHTML={{
                          __html: row.original["Long Description"] || "",
                        }}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <div />
          <div>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const alerts = useDashboardStore((state) => state.alerts);

  // --- Filtering ---
  const filteredAlerts = React.useMemo(() => {
    const lower = debouncedSearch.toLowerCase();

    return alerts.filter((alert) => {
      // Severity
      const severityMatch =
        filters.severity.length === 0
          ? false
          : filters.severity.includes(alert.Severity);

      // Label
      const labelMatch =
        filters.label === "Unarchive"
          ? !alert["Is Archived"]
          : alert["Is Archived"] === true;

      // Time Range
      let timeRangeMatch = true;
      if (filters.timeRange !== "All Time") {
        const days = filters.timeRange === "Last 7 days" ? 7 : 30;
        const cutoffDate = moment().subtract(days, "days");
        const dateFound = alert["Date Found"]?.toDate?.();
        timeRangeMatch = dateFound ? moment(dateFound).isAfter(cutoffDate) : false;
      }

      // Search
      const searchMatch =
        !debouncedSearch ||
        (alert["Alert"]?.toLowerCase().includes(lower) ||
          alert["Long Description"]?.toLowerCase().includes(lower));

      return severityMatch && labelMatch && timeRangeMatch && searchMatch;
    });
  }, [alerts, debouncedSearch, filters]);

  const criticalCount = filteredAlerts.filter(
    (a) => a.Severity === ALERT_SEVERITIES.CRITICAL
  ).length;
  const mediumCount = filteredAlerts.filter(
    (a) => a.Severity === ALERT_SEVERITIES.MEDIUM
  ).length;
  const lowCount = filteredAlerts.filter(
    (a) => a.Severity === ALERT_SEVERITIES.LOW
  ).length;

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <Header />
      <main className="max-w-[1440px] mx-auto px-6 py-6">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
              !adsLabel 
                ? "bg-[#E9F6EA] text-[#7A7D9C]"
                : adsLabel["Is Showing Ads"] 
                ? "bg-[#E9F6EA] text-[#34A853]" 
                : "bg-[#ffebee] text-[#ee1b23]"
            }`}>
              {!adsLabel ? (
                <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                  <g>
                    <rect width="18" height="18" rx="9" fill="#7A7D9C" />
                    <path
                      d="M9 3v3l2 2"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                </svg>
              ) : adsLabel["Is Showing Ads"] ? (
                <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                  <g>
                    <rect width="18" height="18" rx="9" fill="#34A853" />
                    <path
                      d="M13.5 6.75l-5.25 5.25-2.25-2.25"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                  <g>
                    <rect width="18" height="18" rx="9" fill="#ee1b23" />
                    <path
                      d="M12 6l-6 6M6 6l6 6"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                </svg>
              )}
              {!adsLabel ? "Checking" : adsLabel["Is Showing Ads"] ? "Showing Ad" : "Not Showing Ad"}
            </span>
            <span className="text-xl md:text-2xl font-bold text-gray-900">
              Meehan Law - 182-843-8180
            </span>
          </div>
          <div className="flex gap-4">
            <Card className="w-32 bg-white border-l-4 border-[#E53935]">
              <CardContent className="py-3 px-2 flex flex-col items-center">
                <span className="text-2xl font-bold text-[#E53935]">
                  {criticalCount}
                </span>
                <span className="text-xs font-semibold text-gray-700">
                  Critical
                </span>
              </CardContent>
            </Card>
            <Card className="w-32 bg-white border-l-4 border-[#FBC02D]">
              <CardContent className="py-3 px-2 flex flex-col items-center">
                <span className="text-2xl font-bold text-[#FBC02D]">
                  {mediumCount}
                </span>
                <span className="text-xs font-semibold text-gray-700">
                  Medium
                </span>
              </CardContent>
            </Card>
            <Card className="w-32 bg-white border-l-4 border-[#FFEB3B]">
              <CardContent className="py-3 px-2 flex flex-col items-center">
                <span className="text-2xl font-bold text-[#FFEB3B]">
                  {lowCount}
                </span>
                <span className="text-xs font-semibold text-gray-700">Low</span>
              </CardContent>
            </Card>
          </div>
          {/* Spend MTD / Monthly Budget Card - pixel-perfect UI */}
          <Card className="bg-[#F5F8FF] border border-[#E3E8F0] rounded-xl shadow-none p-0 w-[370px] h-[160px] gap-2 flex flex-col justify-between">
            <div className="flex justify-between items-start px-4 pt-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[#7A7D9C] font-medium flex items-center gap-1">
                  Spend MTD
                  <div className="relative group">
                    <button
                      type="button"
                      className="ml-1 p-0.5 rounded hover:bg-[#E3E8F0] transition-colors"
                      aria-label="Spend MTD information"
                    >
                      <AlertTriangle className="w-3 h-3 text-[#7A7D9C]" />
                    </button>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 w-80">
                      The actual amount can differ between users' dashboards based on API call times and could be different from what you see on the ads account, with up to a few hours' difference.
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[18px] leading-none font-bold text-[#232360]">
                    {spendMtdLoading
                      ? "--"
                      : dashboardDaily?.["Spend MTD"] != null
                      ? `${currentAdsAccount?.["Currency Symbol"] || "$"}${Number(dashboardDaily["Spend MTD"]).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "--"}
                  </span>
                  {/* Dot color logic */}
                  <span className="ml-1 mt-1">
                    {(() => {
                      const key = dashboardDaily?.["Spend MTD Indicator Alert"]?.["Key"];
                      let color = "#1BC47D"; // green default
                      if (["AccountIsOverPacing33PercentToDate", "AccountIsUnderPacing33PercentToDate"].includes(key)) color = "#EDE41B";
                      if (["AccountIsOverPacing50PercentToDate", "AccountIsUnderPacing50PercentToDate"].includes(key)) color = "#FF7F26";
                      if (["AccountIsOverPacing75PercentToDate", "AccountIsUnderPacing75PercentToDate"].includes(key)) color = "#EE1B23";
                      return <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} />;
                    })()}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-[#7A7D9C] font-medium flex items-center gap-1">
                  Monthly Budget
                </span>
                <div className="flex items-center gap-1 mt-1">
                  {isEditingBudget ? (
                    <>
                      <Button
                        className="bg-[#156CFF] hover:bg-[#156CFF]/90 text-white font-semibold px-4 py-2 rounded-lg text-sm"
                        onClick={handleConfirmBudget}
                        disabled={isUpdatingBudget || !budgetInput || Number(budgetInput) < 0}
                      >
                        Confirm
                      </Button>
                      <input
                        type="number"
                        min={0}
                        className="ml-2 border border-[#E3E8F0] rounded-lg px-4 py-2 text-lg font-bold text-right w-24 outline-none focus:border-blue-400"
                        value={budgetInput}
                        onChange={e => setBudgetInput(e.target.value.replace(/[^0-9.]/g, ""))}
                        disabled={isUpdatingBudget}
                      />
                    </>
                  ) : (
                    <>
                      <button type="button" className="p-0.5 rounded hover:bg-[#E3E8F0] transition-colors" aria-label="Edit budget" onClick={handleEditBudget}>
                        <Pencil1Icon className="w-4 h-4 text-[#7A7D9C]" />
                      </button>
                      <span className="text-[18px] leading-none font-bold text-[#232360]">
                        {currentAdsAccount?.["Currency Symbol"] || "$"}
                        {currentAdsAccount?.["Monthly Budget"] != null ? Number(currentAdsAccount["Monthly Budget"]).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "--"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {/* Progress bar section */}
            <div className="relative px-4 mt-2" style={{ height: 48 }}>
              {(() => {
                const spend = Number(dashboardDaily?.["Spend MTD"] ?? 0);
                const budget = Number(currentAdsAccount?.["Monthly Budget"] ?? 1);
                const percent = budget ? Math.min((spend / budget) * 100, 100) : 0;
                const now = moment();
                const day = now.date();
                const daysInMonth = now.daysInMonth();
                const dayPercent = (day / daysInMonth) * 100;
                return (
                  <div className="relative w-full h-6 flex items-center">
                    {/* Progress bar bg */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-5 rounded-full bg-white border border-[#E3E8F0]" />
                    {/* Progress bar fill */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 rounded-full bg-[#156CFF]" style={{ width: `${percent}%`, minWidth: percent > 0 ? 8 : 0 }} />
                    {/* Percentage label */}
                    {percent < 15 ? (
                      <span
                        className="absolute top-0 left-0 h-6 flex items-center text-black text-xs font-semibold select-none"
                        style={{ left: `calc(${percent}% + 8px)` }}
                      >
                        {percent.toFixed(1)}%
                      </span>
                    ) : (
                      <span
                        className="absolute top-0 h-6 flex items-center text-white text-xs font-semibold select-none"
                        style={{ left: `calc(${percent / 2}% )`, transform: 'translateX(-50%)' }}
                      >
                        {percent.toFixed(1)}%
                      </span>
                    )}
                    {/* Vertical line for current day */}
                    <div className="absolute top-1 h-4" style={{ left: `calc(${dayPercent}% - 1px)` }}>
                      <div className="w-0.5 h-4 bg-[#7A7D9C] rounded" />
                    </div>
                    {/* Day label under the vertical line */}
                    <div className="absolute left-0" style={{ top: 20, width: '100%' }}>
                      <div style={{ position: 'absolute', left: `calc(${dayPercent}% - 12px)` }}>
                        <span className="text-[13px] text-[#7A7D9C] font-semibold select-none">{day}</span>
                        <span className="text-[11px] text-[#7A7D9C] font-semibold select-none ml-1">days</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            {/* Spend Projection */}
            <div className="flex justify-end items-end px-4 pb-3 pt-1">
              <span className="text-xs text-[#7A7D9C] font-medium">
                Spend Projection: {currentAdsAccount?.["Currency Symbol"] || "$"}
                {(() => {
                  const spend = Number(dashboardDaily?.["Spend MTD"] ?? 0);
                  const now = moment();
                  const day = now.date();
                  const projection = day ? (spend / day) * 30.4 : 0;
                  return projection.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                })()}
              </span>
            </div>
          </Card>
        </div>
        {/* Metrics Row */}
        <KpiMetricsRow dashboardDaily={dashboardDaily} currencySymbol={currentAdsAccount?.["Currency Symbol"] || "$"} />
        {/* Alerts Table */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <h2 className="text-lg font-bold text-gray-900">Alerts</h2>
              <div className="relative group">
                <button
                  type="button"
                  className="p-0.5 rounded hover:bg-gray-100 transition-colors"
                  aria-label="Alerts information"
                >
                  <AlertTriangle className="w-3 h-3 text-gray-400" />
                </button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 w-80">
                  There might be data discrepancies between the results shown in the adAlert dashboard and what's reported by the ad vendor due to retroactive data updates made by the vendor.
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
              <span className="text-xs text-gray-400">Settings</span>
            </div>
            <div className="flex gap-2">
              {/* Search UI */}
              {showSearch && (
                <div className="flex items-center border rounded-lg px-3 py-1 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-200 transition-all">
                  <input
                    className="outline-none border-none bg-transparent text-sm text-gray-500 placeholder-gray-400 flex-1 min-w-[180px]"
                    placeholder="Search for alerts"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    autoFocus
                  />
                  {searchValue && (
                    <button
                      type="button"
                      className="ml-1 text-gray-400 hover:text-gray-600"
                      onClick={() => setSearchValue("")}
                      aria-label="Clear search"
                    >
                      <XIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowSearch((v) => !v)}
                className={showSearch ? "border-blue-200" : ""}
                aria-label="Show search"
              >
                <MagnifyingGlassIcon className="w-6 h-6 text-[#015AFD]" />
              </Button>
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="w-6 h-6 text-[#015AFD]" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <FilterPopover
                    filterState={filters}
                    onFilterChange={handleFilterChange}
                    onClose={() => setIsFilterOpen(false)}
                  />
                </PopoverContent>
              </Popover>

              <Button variant="outline" size="icon" className="relative">
                <FileIcon className="w-6 h-6 text-[#015AFD]" />
                <span
                  className="absolute bottom-0 right-0 text-[8px] font-bold text-[#015AFD] leading-none pr-[2px] pb-[1px] pointer-events-none"
                  style={{ letterSpacing: "0.5px" }}
                >
                  PDF
                </span>
              </Button>
              <Button variant="outline" size="icon" className="relative">
                <FileIcon className="w-6 h-6 text-[#015AFD]" />
                <span
                  className="absolute bottom-0 right-0 text-[8px] font-bold text-[#015AFD] leading-none pr-[2px] pb-[1px] pointer-events-none"
                  style={{ letterSpacing: "0.5px" }}
                >
                  CSV
                </span>
              </Button>
              {/* <Button variant="outline" size="icon">
                <FileIcon />
              </Button>
              <Button variant="outline" size="icon">
                <DownloadIcon />
              </Button> */}
              <select
                className="ml-2 border rounded-md px-2 py-1 text-xs"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={15}>15 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>
            </div>
          </div>
          <AlertsDataTable
            pageSize={pageSize}
            setPageSize={setPageSize}
            filteredAlerts={filteredAlerts}
          />
        </div>
      </main>
    </div>
  );
}
 