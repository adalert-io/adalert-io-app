"use client";

import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import {
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { SeverityBadge } from "./alert-ui";
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
  /** When true, skips outer card chrome (parent provides container). */
  embedded?: boolean;
}

export function ConsumerDashboardAlertsTable({
  filteredAlerts,
  pageSize,
  setPageSize,
  selectedAlertIds,
  setSelectedAlertIds,
  accountName,
  embedded = false,
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
          const formatted = dateObj ? moment(dateObj).format("DD MMM YYYY") : "—";
          return (
            <span className="whitespace-nowrap tabular-nums text-[13px] text-slate-600">
              {formatted}
            </span>
          );
        },
      },
      {
        accessorKey: "severity",
        header: "Severity",
        cell: ({ row }) => <SeverityBadge severity={row.original.Severity} />,
      },
      {
        accessorKey: "description",
        header: "Alert",
        cell: ({ row }) => (
          <span className="line-clamp-2 font-semibold leading-snug text-slate-900">
            {row.original.Alert}
          </span>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <span className="text-[13px] text-slate-600">{row.original.Type ?? "—"}</span>
        ),
      },
      {
        accessorKey: "level",
        header: "Level",
        cell: ({ row }) => (
          <span className="text-[13px] text-slate-600">{row.original.Level ?? "—"}</span>
        ),
      },
      {
        id: "view",
        header: () => <span className="sr-only">Actions</span>,
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

  const isRowActive = (id: string) => detailOpen && detailAlertId === id;

  const tableBlock = (
  <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-slate-100 bg-slate-50/90 hover:bg-slate-50/90"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-11 px-4 text-[12px] font-semibold uppercase tracking-wide text-slate-600"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-sm text-slate-500"
                >
                  No alerts match your filters.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "cursor-pointer border-slate-100 transition-colors hover:bg-slate-50/80",
                    isRowActive(row.id) &&
                      "bg-[#eaf3ff]/90 ring-2 ring-inset ring-[#015AFD]/30 hover:bg-[#dfeaff]/92",
                  )}
                  onClick={() => openAlert(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-3.5 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <footer className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/40 px-4 py-4 sm:flex-row sm:px-6">
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
            className="h-9 w-9 rounded-lg p-0"
            aria-label="First page"
          >
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            className="h-9 w-9 rounded-lg p-0"
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            className="h-9 w-9 rounded-lg p-0"
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            className="h-9 w-9 rounded-lg p-0"
            aria-label="Last page"
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </footer>
    </>
  );

  return (
    <>
      {embedded ? (
        tableBlock
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md">
          {tableBlock}
        </div>
      )}

      <ConsumerAlertDetailSheet
        alert={detailAlert}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        accountName={accountName}
      />
    </>
  );
}
