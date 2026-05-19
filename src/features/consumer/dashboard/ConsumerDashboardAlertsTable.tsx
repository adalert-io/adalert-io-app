"use client";

import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
} from "lucide-react";
import moment from "moment";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ALERT_SEVERITIES, ALERT_SEVERITY_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import {
  ConsumerAlertDetailSheet,
  type ConsumerAlertRow,
} from "./ConsumerAlertDetailSheet";

const checkboxClass =
  "border-slate-300 shadow-none data-[state=checked]:border-[#015AFD] data-[state=checked]:bg-[#015AFD]";

interface ConsumerDashboardAlertsTableProps {
  filteredAlerts: ConsumerAlertRow[];
  pageSize: number;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
  selectedAlertIds: string[];
  setSelectedAlertIds: React.Dispatch<React.SetStateAction<string[]>>;
  accountName?: string;
}

export function ConsumerDashboardAlertsTable({
  filteredAlerts,
  pageSize,
  setPageSize,
  selectedAlertIds,
  setSelectedAlertIds,
  accountName,
}: ConsumerDashboardAlertsTableProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [detailAlertId, setDetailAlertId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openAlert = useCallback((alert: ConsumerAlertRow) => {
    setDetailAlertId(alert.id);
    setDetailOpen(true);
  }, []);

  const columns = useMemo<ColumnDef<ConsumerAlertRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className={checkboxClass}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className={checkboxClass}
            onClick={(e) => e.stopPropagation()}
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
          const formatted = dateObj ? moment(dateObj).format("DD MMM") : "—";
          return <span className="tabular-nums text-slate-700">{formatted}</span>;
        },
      },
      {
        accessorKey: "severity",
        header: "Severity",
        cell: ({ row }) => {
          let color = ALERT_SEVERITY_COLORS.LOW;
          const sev = row.original.Severity?.toLowerCase();
          if (sev === ALERT_SEVERITIES.CRITICAL.toLowerCase()) {
            color = ALERT_SEVERITY_COLORS.CRITICAL;
          } else if (sev === ALERT_SEVERITIES.MEDIUM.toLowerCase()) {
            color = ALERT_SEVERITY_COLORS.MEDIUM;
          }
          return (
            <span className="inline-flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              <span className="text-[13px] font-medium text-slate-700">
                {row.original.Severity}
              </span>
            </span>
          );
        },
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-md font-medium text-slate-900">
            {row.original.Alert}
          </span>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <span className="text-slate-600">{row.original.Type ?? "—"}</span>
        ),
      },
      {
        accessorKey: "level",
        header: "Level",
        cell: ({ row }) => (
          <span className="text-slate-600">{row.original.Level ?? "—"}</span>
        ),
      },
      {
        id: "view",
        header: "",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-[#015AFD] hover:bg-[#015AFD]/10"
            aria-label="View alert details"
            onClick={(e) => {
              e.stopPropagation();
              openAlert(row.original);
            }}
          >
            <Eye className="size-4" />
          </Button>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [openAlert],
  );

  const rowSelection = useMemo(() => {
    const selection: Record<string, boolean> = {};
    selectedAlertIds.forEach((id) => {
      selection[id] = true;
    });
    return selection;
  }, [selectedAlertIds]);

  const handleRowSelectionChange = useCallback(
    (updater: unknown) => {
      const newSelection =
        typeof updater === "function"
          ? (updater as (prev: Record<string, boolean>) => Record<string, boolean>)(
              rowSelection,
            )
          : (updater as Record<string, boolean>);

      const newSelectedIds = Object.keys(newSelection).filter((key) => newSelection[key]);
      setSelectedAlertIds(newSelectedIds);
    },
    [rowSelection, setSelectedAlertIds],
  );

  const table = useReactTable({
    data: filteredAlerts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination: { pageIndex, pageSize },
      rowSelection,
    },
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const next = updater({ pageIndex, pageSize });
        setPageIndex(next.pageIndex);
        setPageSize(next.pageSize);
      } else {
        if (updater.pageIndex !== undefined) setPageIndex(updater.pageIndex);
        if (updater.pageSize !== undefined) setPageSize(updater.pageSize);
      }
    },
    onRowSelectionChange: handleRowSelectionChange,
    enableRowSelection: true,
    getRowId: (row) => row.id,
  });

  const detailAlert = useMemo(
    () =>
      detailAlertId
        ? (filteredAlerts.find((a) => a.id === detailAlertId) ?? null)
        : null,
    [detailAlertId, filteredAlerts],
  );

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[13px]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left font-semibold text-slate-700"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100 text-[14px]">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-16 text-center text-sm text-slate-500"
                  >
                    No alerts match your filters.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer transition-colors hover:bg-slate-50/80"
                    onClick={() => openAlert(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-slate-900">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:flex-row sm:px-6">
          <p className="text-[13px] font-medium text-slate-600">
            Showing{" "}
            {table.getRowModel().rows.length > 0
              ? table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                1
              : 0}{" "}
            to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length,
            )}{" "}
            of {table.getFilteredRowModel().rows.length} alerts
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.setPageIndex(0)}
              className="h-9 w-9 p-0"
              aria-label="First page"
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              className="h-9 w-9 p-0"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              className="h-9 w-9 p-0"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              className="h-9 w-9 p-0"
              aria-label="Last page"
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </footer>
      </div>

      <ConsumerAlertDetailSheet
        alert={detailAlert}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        accountName={accountName}
      />
    </>
  );
}
