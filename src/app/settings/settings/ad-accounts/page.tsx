"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Search,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  XIcon,
  Plus,
  Briefcase,
  DollarSign,
  CheckCircle,
  Loader2,
  Bell,
} from "lucide-react";
import { useAlertSettingsStore } from "@/lib/store/settings-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { Switch } from "@/components/ui/switch";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import React from "react";
import { toast } from "sonner";
import { formatAccountNumber } from "@/lib/utils";
import { useRouter } from "next/navigation";


export default function AdAccountsSubtab() {
  const router = useRouter();
  const [screen, setScreen] = useState<"list" | "edit">("list");
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [deletingAccount, setDeletingAccount] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [adAccountName, setAdAccountName] = useState("");
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [sendAlert, setSendAlert] = useState(false);
  
  const { userDoc } = useAuthStore();
  const {
    adsAccountsForTab,
    fetchAdsAccountsForAdsAccountsTab,
    updateAdsAccount,
    toggleAdsAccountAlert,
    refreshAdsAccountsForTab,
    deleteAdsAccount,
    updateAdsAccountVariablesBudgets, // <-- add this
  } = useAlertSettingsStore();

  useEffect(() => {
    if (userDoc && userDoc["Company Admin"] && userDoc.uid) {
      fetchAdsAccountsForAdsAccountsTab(userDoc["Company Admin"], userDoc.uid);
    }
  }, [userDoc, fetchAdsAccountsForAdsAccountsTab]);

  // Debounce search value
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, 1500);
    return () => clearTimeout(handler);
  }, [searchValue]);

  // Populate form data when editing account
  useEffect(() => {
    if (screen === "edit" && editingAccount) {
      setAdAccountName(editingAccount["Account Name Editable"] || editingAccount["Account Name Original"] || "");
      setMonthlyBudgetInput(editingAccount["Monthly Budget"]?.toString() || "0");
      setSendAlert(editingAccount["Send Me Alert"] || false);
    }
  }, [screen, editingAccount]);

  // Filter ads accounts based on search
  const filteredAdsAccounts = useMemo(() => {
    const lower = debouncedSearch.toLowerCase();

    return adsAccountsForTab.filter((account) => {
      const searchMatch =
        !debouncedSearch ||
        account.name?.toLowerCase().includes(lower) ||
        account["Id"]?.toLowerCase().includes(lower);

      return searchMatch;
    });
  }, [adsAccountsForTab, debouncedSearch]);

  // Ads Accounts Table Columns
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "Id",
      header: "Account Number",
      cell: ({ row }) => <span>{formatAccountNumber(row.original["Id"])}</span>,
    },
    {
      accessorKey: "name",
      header: "Ad account name",
      cell: ({ row }) => <span>{row.original.name}</span>,
    },
    {
      accessorKey: "Platform",
      header: "Platform",
      cell: ({ row }) => <span>{row.original["Platform"] || "Google"}</span>,
    },
    {
      accessorKey: "Created Date",
      header: "Date first added",
      cell: ({ row }) => {
        const date = row.original["Created Date"];
        if (date?.toDate) {
          const dateObj = date.toDate();
          return <span>{dateObj.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>;
        }
        return <span>N/A</span>;
      },
    },
    {
      accessorKey: "Is Connected",
      header: "Connected",
      cell: ({ row }) => (
        <span className={row.original["Is Connected"] ? "text-green-600" : "text-red-600"}>
          {row.original["Is Connected"] ? "yes" : "no"}
        </span>
      ),
    },
    {
      accessorKey: "Send Me Alert",
      header: "Send me alert",
      cell: ({ row }) => (
        <Switch
          checked={row.original["Send Me Alert"] || false}
          onCheckedChange={async (checked: boolean) => {
            try {
              await toggleAdsAccountAlert(row.original.id, checked);
              toast.success(`Alert ${checked ? 'enabled' : 'disabled'} for ${row.original.name}`);
            } catch (error: any) {
              toast.error(error.message || 'Failed to update alert setting');
            }
          }}
          className="data-[state=checked]:bg-blue-600"
        />
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-2 items-center">
          <button
            className="text-blue-600 hover:text-blue-800"
            onClick={() => {
              setEditingAccount(row.original);
              setScreen("edit");
            }}
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button 
            className="text-red-500 hover:text-red-700"
            onClick={() => {
              setDeletingAccount(row.original);
              setShowDeleteModal(true);
            }}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];

function AdsAccountsDataTable() {
  const [pageIndex, setPageIndex] = useState(0);

  const table = useReactTable({
    data: filteredAdsAccounts,
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
        if (updater.pageIndex !== undefined) setPageIndex(updater.pageIndex);
        if (updater.pageSize !== undefined) setPageSize(updater.pageSize);
      }
    },
    pageCount: Math.ceil(filteredAdsAccounts.length / pageSize),
    getRowId: (row) => {
      if (!row.original) return row.id || Math.random().toString();
      if (!row.original.id) return row.id || Math.random().toString();
      return row.original.id;
    },
  });

  const total = filteredAdsAccounts.length;
  const start = total ? pageIndex * pageSize + 1 : 0;
  const end = Math.min((pageIndex + 1) * pageSize, total);
  const totalPages = table.getPageCount();

  // Reference-style page numbers
  const maxVisiblePages = 5;
  const halfVisible = Math.floor(maxVisiblePages / 2);
  let startPage = Math.max(1, pageIndex + 1 - halfVisible);
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  const pages: (number | string)[] = [];
  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) pages.push("ellipsis-start");
  }
  for (let i = startPage; i <= endPage; i++) pages.push(i);
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pages.push("ellipsis-end");
    pages.push(totalPages);
  }

  return (
    <div className="bg-white rounded-2xl shadow-none border border-[#e5e5e5] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-[0.75rem]">
          <thead className="bg-gray-50 border-b border-gray-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-4 text-left font-semibold text-gray-700"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-gray-100">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-6 align-top text-gray-900">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}

            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td
                  className="px-4 py-12 text-center text-gray-500"
                  colSpan={table.getAllColumns().length}
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    No accounts found.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer like reference */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 gap-4">
        <div className="text-[0.75rem] text-gray-600 font-medium">
          Showing {total ? start : 0} to {end} of {total} accounts
        </div>

        <div className="flex items-center gap-3">
          {/* First */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>

          {/* Prev */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 p-0 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>

          {/* Numbers */}
          <div className="flex items-center gap-1">
            {pages.map((p, idx) =>
              typeof p === "number" ? (
                <Button
                  key={`${p}-${idx}`}
                  variant={p === pageIndex + 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => table.setPageIndex(p - 1)}
                  className="h-8 w-8 p-0 text-[0.75rem] font-medium"
                >
                  {p}
                </Button>
              ) : (
                <span key={`${p}-${idx}`} className="px-2 text-gray-400 text-[0.75rem]">
                  …
                </span>
              )
            )}
          </div>

          {/* Next */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 p-0 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>

          {/* Last */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(totalPages - 1)}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 p-0 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}


  // Handle save button click
  const handleSave = async () => {
    if (isSaving || !editingAccount) return;

    try {
      setIsSaving(true);
      const monthlyBudget = parseFloat(monthlyBudgetInput) || 0;
      const dailyBudget = monthlyBudget / 30.4;
      // Update the ads account
      await updateAdsAccount(editingAccount.id, {
        "Account Name Editable": adAccountName,
        "Monthly Budget": monthlyBudget,
        "Daily Budget": dailyBudget,
      });
      // Update all adsAccountVariables for this account (store method)
      await updateAdsAccountVariablesBudgets(editingAccount.id, monthlyBudget, dailyBudget);
      toast.success("Ad account updated successfully!");
      setScreen("list");
      setEditingAccount(null);
      setAdAccountName("");
      setMonthlyBudgetInput("");
      setSendAlert(false);
      // Refresh the data
      if (userDoc && userDoc["Company Admin"] && userDoc.uid) {
        refreshAdsAccountsForTab(userDoc["Company Admin"], userDoc.uid);
      }
    } catch (error: any) {
      console.error("Error updating ad account:", error);
      toast.error(error.message || "Failed to update ad account");
    } finally {
      setIsSaving(false);
    }
  };

  const isSaveDisabled = !adAccountName || isSaving;

  return (
    <div className="bg-white p-4 min-h-[600px]">
      {screen === "list" && (
        <>
          <h2 className="text-2xl font-bold mb-1">Ad Account</h2>
          <p className="text-gray-500 mb-6">
            Add, edit, or remove ad accounts. You can reconnect accounts that require re-authentications.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <Button
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto justify-center text-blue-600 font-semibold bg-blue-50 border-blue-200"
              onClick={() => {
                router.push("/add-ads-account");
              }}
            >
              <Plus className="w-5 h-5" /> Add New Ad Account
            </Button>
            <div className="flex-1 flex items-center justify-end gap-2">
              {/* Search UI */}
              {showSearch && (
                <div className="flex items-center border rounded-lg px-3 py-1 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-200 transition-all">
                  <input
                    className="outline-none border-none bg-transparent text-sm text-gray-500 placeholder-gray-400 flex-1 min-w-[180px]"
                    placeholder="Search for ad accounts"
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
              <select
                className="border rounded-md px-2 py-1 text-xs"
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
          <AdsAccountsDataTable />
        </>
      )}
      {screen === "edit" && (
        <div className="w-full">
          <button
            className="flex items-center gap-2 text-blue-600 mb-6"
            onClick={() => {
              setScreen("list");
              setEditingAccount(null);
              setAdAccountName("");
              setMonthlyBudgetInput("");
              setSendAlert(false);
            }}
          >
            <ChevronLeft className="w-5 h-5" /> Back to Accounts
          </button>
          <h2 className="text-2xl font-bold mb-6">Edit Ads Account Details</h2>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 flex flex-col gap-4 max-w-md">
              <div className="relative">
                <Input
                  placeholder="Ad Account Name"
                  className="pl-10"
                  value={adAccountName}
                  onChange={(e) => setAdAccountName(e.target.value)}
                />
                <Briefcase className="absolute left-3 top-2.5 w-5 h-5 text-blue-400" />
              </div>
              <div className="text-sm text-gray-500">
                The ad account you wish to monitor ads for
              </div>
              
              {/* Google Ads Account Details */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium">
                      Google Ads Account ID: {editingAccount?.["Id"]}
                    </div>
                    <div className="text-sm text-gray-600">
                      Ad Account Name: {editingAccount?.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3" />
                      Connected
                    </span>
                    <button className="text-red-500 hover:text-red-700"
                      onClick={() => {
                        setDeletingAccount(editingAccount);
                        setShowDeleteModal(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <Input
                  placeholder="Monthly Budget"
                  className="pl-10"
                  value={monthlyBudgetInput}
                  onChange={(e) => setMonthlyBudgetInput(e.target.value)}
                  type="number"
                  step="0.01"
                />
                <DollarSign className="absolute left-3 top-2.5 w-5 h-5 text-blue-400" />
              </div>
              
              <Button
                className="bg-blue-600 text-white text-lg font-bold px-12 py-3 rounded shadow-md mt-4"
                disabled={isSaveDisabled}
                onClick={handleSave}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
              
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-xs font-bold">i</span>
                </div>
                You can unlink this ad account anytime by clicking the delete button
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingAccount && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <img 
                  src="/images/adAlert-logo-words.avif" 
                  alt="adAlert.io" 
                  className="h-8 w-auto"
                />
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingAccount(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="mb-6">
              <p className="text-gray-700">
                Do you want to remove your ads account:{" "}
                <span className="font-bold">
                  {deletingAccount.name} - {formatAccountNumber(deletingAccount["Id"])}
                </span>
                ?
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingAccount(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    await deleteAdsAccount(deletingAccount.id);
                    toast.success("Ad account removed successfully!");
                    setShowDeleteModal(false);
                    setDeletingAccount(null);
                  } catch (error: any) {
                    toast.error(error.message || "Failed to remove ad account");
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Removing...
                  </>
                ) : (
                  "Remove"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 