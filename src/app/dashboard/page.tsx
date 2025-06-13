"use client";

import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircledIcon,
  DownloadIcon,
  FileIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { Filter } from "lucide-react";
import { useUserAdsAccountsStore } from "@/lib/store/user-ads-accounts-store";
import type { AdsAccount } from "@/lib/store/user-ads-accounts-store";
import { useDashboardStore } from "@/lib/store/dashboard-store";
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
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ALERT_SEVERITIES, ALERT_SEVERITY_COLORS } from "@/lib/constants/index";
import moment from "moment";

export default function Dashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { selectedAdsAccount, userAdsAccounts } = useUserAdsAccountsStore();
  const [currentAdsAccount, setCurrentAdsAccount] = useState<AdsAccount | null>(
    null
  );
  const fetchAlerts = useDashboardStore((state) => state.fetchAlerts);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [pageSize, setPageSize] = React.useState(25);

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
    if (currentAdsAccount) {
      fetchAlerts(currentAdsAccount.id);
    }
  }, [currentAdsAccount, fetchAlerts]);

  // Placeholder/mock data
  const metrics = [
    { label: "CPC", value: "$26.71", change: "+0.78%", changeType: "up" },
    { label: "CTR", value: "1.18%", change: "+17.53%", changeType: "up" },
    { label: "CPA", value: "$288.55", change: "+86.07%", changeType: "down" },
    { label: "Conv.", value: "108.97", change: "-14.2%", changeType: "down" },
    {
      label: "Search IS",
      value: "43.02%",
      change: "+11.54%",
      changeType: "up",
    },
    {
      label: "Impr. Top",
      value: "56.91%",
      change: "-21.58%",
      changeType: "down",
    },
    { label: "Cost", value: "$31,442.00", change: "+59.65%", changeType: "up" },
    { label: "Clicks", value: "1,189", change: "+59.6%", changeType: "up" },
    {
      label: "Invalid Clicks",
      value: "92",
      change: "+35.3%",
      changeType: "up",
    },
    {
      label: "Impressions",
      value: "100,295",
      change: "+34.79%",
      changeType: "up",
    },
  ];

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
            row.original.Severity === ALERT_SEVERITIES.CRITICAL
              ? `bg-[${ALERT_SEVERITY_COLORS.CRITICAL}]`
              : row.original.Severity === ALERT_SEVERITIES.MEDIUM
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
  }: {
    pageSize: number;
    setPageSize: React.Dispatch<React.SetStateAction<number>>;
  }) {
    const alerts = useDashboardStore((state) => state.alerts);
    console.log("alerts: ", alerts);
    const [expandedRowIds, setExpandedRowIds] = React.useState<string[]>([]);

    const columns = React.useMemo(
      () => useAlertColumns(expandedRowIds, setExpandedRowIds),
      [expandedRowIds]
    );

    const table = useReactTable({
      data: alerts,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      state: {
        pagination: {
          pageIndex: 0,
          pageSize,
        },
      },
      onPaginationChange: (updater) => {
        if (typeof updater === "function") {
          const next = updater({ pageIndex: 0, pageSize });
          setPageSize(next.pageSize);
        } else if (typeof updater === "object" && updater.pageSize) {
          setPageSize(updater.pageSize);
        }
      },
      manualPagination: false,
      pageCount: Math.ceil(alerts.length / pageSize),
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
  const criticalCount = alerts.filter(
    (a) => a.Severity === ALERT_SEVERITIES.CRITICAL
  ).length;
  const mediumCount = alerts.filter(
    (a) => a.Severity === ALERT_SEVERITIES.MEDIUM
  ).length;
  const lowCount = alerts.filter(
    (a) => a.Severity === ALERT_SEVERITIES.LOW
  ).length;

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <Header />
      <main className="max-w-[1440px] mx-auto px-6 py-6">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="bg-[#E9F6EA] text-[#34A853] px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
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
              Showing Ad
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
          <div className="flex flex-col items-end gap-1 bg-white rounded-2xl shadow-md px-6 py-3 min-w-[270px]">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Spend MTD</span>
              <span className="text-lg font-bold text-gray-900">
                $47,651.95
              </span>
              <span className="ml-1 text-green-600">
                <CheckCircledIcon />
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-2 bg-[#3B82F6]" style={{ width: "35.3%" }} />
            </div>
            <div className="flex justify-between w-full text-xs text-gray-500 mt-1">
              <span>35.3%</span>
              <span>13 days</span>
              <span className="font-semibold text-gray-700">
                Monthly Budget <span className="text-gray-900">$135,000</span>
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Spend Projection: $111,432.25
            </div>
          </div>
        </div>
        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3 mb-6">
          {metrics.map((m, i) => (
            <Card key={m.label} className="bg-white">
              <CardContent className="py-2 px-2 flex flex-col items-center">
                <span className="text-base font-bold text-gray-900">
                  {m.value}
                </span>
                <span className="text-xs text-gray-500">{m.label}</span>
                <span
                  className={`text-xs font-semibold ${
                    m.changeType === "up" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {m.change}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Alerts Table */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Alerts</h2>
              <span className="text-xs text-gray-400">Settings</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <MagnifyingGlassIcon className="w-6 h-6 text-[#015AFD]" />
              </Button>
              <Button variant="outline" size="icon">
                <Filter className="w-6 h-6 text-[#015AFD]" />
              </Button>
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
          <AlertsDataTable pageSize={pageSize} setPageSize={setPageSize} />
        </div>
      </main>
    </div>
  );
}
