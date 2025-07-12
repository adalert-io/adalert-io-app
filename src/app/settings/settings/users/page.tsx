"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Search,
  Trash2,
  Edit2,
  User,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  XIcon,
  Plus,
  Mail,
  Users,
} from "lucide-react";
import { useAlertSettingsStore } from "@/lib/store/settings-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";

// Removed hardcoded ADS_ACCOUNTS - now using fetched data from store

const checkboxClass =
  "data-[state=checked]:bg-blue-700 data-[state=checked]:border-blue-700";

export default function UsersSubtab() {
  const [screen, setScreen] = useState<"list" | "add" | "edit">("list");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [role, setRole] = useState<"Admin" | "Manager">("Admin");
  const [adsDropdownOpen, setAdsDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [selectedAds, setSelectedAds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(25);
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [adsSearchValue, setAdsSearchValue] = useState("");
  const [debouncedAdsSearch, setDebouncedAdsSearch] = useState("");
  const { userDoc } = useAuthStore();
  const { users, fetchUsers, adsAccounts, fetchAdsAccounts } =
    useAlertSettingsStore();

  // Helper function to check if current user has access to an ads account
  const hasUserAccessToAccount = useCallback(
    (account: any) => {
      if (!userDoc?.uid || !account["Selected Users"]) return false;

      return account["Selected Users"].some((userRef: any) => {
        // Check if the userRef is a Firestore document reference
        // Firestore references have a path property that includes the document ID
        return (
          userRef.path?.includes(userDoc.uid) || userRef.id === userDoc.uid
        );
      });
    },
    [userDoc]
  );

  useEffect(() => {
    if (userDoc && userDoc["Company Admin"]) {
      fetchUsers(userDoc["Company Admin"]);
      fetchAdsAccounts(userDoc["Company Admin"]);
    }
  }, [userDoc, fetchUsers, fetchAdsAccounts]);

  // Debounce search value
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, 1500);
    return () => clearTimeout(handler);
  }, [searchValue]);

  // Debounce ads search value
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAdsSearch(adsSearchValue);
    }, 300);
    return () => clearTimeout(handler);
  }, [adsSearchValue]);

  // Populate form data when editing user
  useEffect(() => {
    if (screen === "edit" && editingUser) {
      setRole(editingUser["User Type"] || "Admin");

      // Check which ads accounts the current user has access to
      if (userDoc && userDoc.uid) {
        const userSelectedAds = adsAccounts
          .filter((account) => hasUserAccessToAccount(account))
          .map((account) => account.name);

        setSelectedAds(userSelectedAds);
      }
    }
  }, [screen, editingUser, userDoc, adsAccounts, hasUserAccessToAccount]);

  // Users Table Columns
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <span>{row.original.email}</span>,
    },
    {
      accessorKey: "Name",
      header: "Name",
      cell: ({ row }) => <span>{row.original.Name}</span>,
    },
    {
      accessorKey: "User Type",
      header: "Access Level",
      cell: ({ row }) => (
        <span
          className={`inline-block px-3 py-1 rounded-md text-white text-xs font-bold ${
            row.original["User Type"] === "Admin"
              ? "bg-blue-700"
              : "bg-blue-400"
          }`}
        >
          {row.original["User Type"]}
        </span>
      ),
    },
    {
      accessorKey: "User Access",
      header: "Access",
      cell: ({ row }) => <span>{row.original["User Access"]}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-2 items-center">
          <button
            className="text-blue-600 hover:text-blue-800"
            onClick={() => {
              setEditingUser(row.original);
              setRole(row.original["User Type"] || "Admin");
              setScreen("edit");
            }}
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button className="text-red-500 hover:text-red-700">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    const lower = debouncedSearch.toLowerCase();

    return users.filter((user) => {
      // Search in email and name
      const searchMatch =
        !debouncedSearch ||
        user.email?.toLowerCase().includes(lower) ||
        user.Name?.toLowerCase().includes(lower);

      return searchMatch;
    });
  }, [users, debouncedSearch]);

  // Filter ads accounts based on search
  const filteredAdsAccounts = useMemo(() => {
    const lower = debouncedAdsSearch.toLowerCase();

    return adsAccounts.filter((account) => {
      const searchMatch =
        !debouncedAdsSearch || account.name?.toLowerCase().includes(lower);

      return searchMatch;
    });
  }, [adsAccounts, debouncedAdsSearch]);

  function UsersDataTable() {
    const [pageIndex, setPageIndex] = useState(0);

    const table = useReactTable({
      data: filteredUsers,
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
      pageCount: Math.ceil(filteredUsers.length / pageSize),
      getRowId: (row) => {
        // Add safety check for row.original and id
        if (!row.original) {
          return row.id || Math.random().toString();
        }
        if (!row.original.id) {
          return row.id || Math.random().toString();
        }
        return row.original.id;
      },
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
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-2 py-2 align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
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
              <ChevronLeftIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRightIcon className="w-4 h-4" />
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

  return (
    <div className="bg-white rounded-2xl shadow-md p-8 min-h-[600px]">
      {screen === "list" && (
        <>
          <h2 className="text-2xl font-bold mb-1">Users</h2>
          <p className="text-gray-500 mb-6">
            Add, remove, or edit user including user access level and accounts
            access.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <Button
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto justify-center text-blue-600 font-semibold bg-blue-50 border-blue-200"
              onClick={() => setScreen("add")}
            >
              <Plus className="w-5 h-5" /> Add New User
            </Button>
            <div className="flex-1 flex items-center justify-end gap-2">
              {/* Search UI */}
              {showSearch && (
                <div className="flex items-center border rounded-lg px-3 py-1 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-200 transition-all">
                  <input
                    className="outline-none border-none bg-transparent text-sm text-gray-500 placeholder-gray-400 flex-1 min-w-[180px]"
                    placeholder="Search for users"
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
          <UsersDataTable />
        </>
      )}
      {(screen === "add" || screen === "edit") && (
        <div className="w-full">
          <button
            className="flex items-center gap-2 text-blue-600 mb-6"
            onClick={() => {
              setScreen("list");
              setEditingUser(null);
              setRole("Admin");
              setSelectedAds([]);
            }}
          >
            <ChevronLeft className="w-5 h-5" /> Back to Users
          </button>
          <h2 className="text-2xl font-bold mb-6">
            {screen === "add" ? "Add New User" : "Edit User"}
          </h2>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 flex flex-col gap-4 max-w-md">
              {screen === "edit" && (
                <div className="relative">
                  <Input
                    placeholder="Name"
                    className="pl-10"
                    defaultValue={editingUser?.Name || ""}
                  />
                  <User className="absolute left-3 top-2.5 w-5 h-5 text-blue-400" />
                </div>
              )}
              <div className="relative">
                <Input
                  placeholder="Email"
                  className="pl-10"
                  defaultValue={editingUser?.email || ""}
                  disabled={screen === "edit"}
                />
                <Mail className="absolute left-3 top-2.5 w-5 h-5 text-blue-400" />
              </div>
              {/* Role dropdown */}
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center w-full border rounded-md px-3 py-2 bg-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                >
                  <span className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-400" /> {role}
                  </span>
                  <ChevronDown className="ml-auto w-4 h-4 text-blue-400" />
                </button>
                {roleDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg">
                    <div className="py-1">
                      <button
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                        onClick={() => {
                          setRole("Admin");
                          setRoleDropdownOpen(false);
                        }}
                      >
                        Admin
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                        onClick={() => {
                          setRole("Manager");
                          setRoleDropdownOpen(false);
                        }}
                      >
                        Manager
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Ads accounts dropdown */}
              <div className="relative">
                <button
                  type="button"
                  className={`flex items-center w-full border rounded-md px-3 py-2 bg-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                    role === "Admin" ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                  disabled={role === "Admin"}
                  onClick={() =>
                    role === "Manager" && setAdsDropdownOpen((v) => !v)
                  }
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    {role === "Admin"
                      ? "All Ad Accounts"
                      : `${selectedAds.length}/${adsAccounts.length} selected`}
                  </span>
                  <ChevronDown className="ml-auto w-4 h-4 text-blue-400" />
                </button>
                {/* Multi-select dropdown (mock) */}
                {adsDropdownOpen && role === "Manager" && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        placeholder="Search for ads accounts"
                        className="h-8"
                        value={adsSearchValue}
                        onChange={(e) => setAdsSearchValue(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2 mb-2 text-xs text-blue-600">
                      <button
                        className="underline"
                        onClick={() =>
                          setSelectedAds(
                            filteredAdsAccounts.map((acc) => acc.name)
                          )
                        }
                      >
                        Select All
                      </button>
                      <button
                        className="underline"
                        onClick={() => setSelectedAds([])}
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="max-h-32 overflow-y-auto flex flex-col gap-1">
                      {filteredAdsAccounts.map((acc) => (
                        <label
                          key={acc.id}
                          className="flex items-center gap-2 cursor-pointer text-base"
                        >
                          <Checkbox
                            className={checkboxClass}
                            checked={selectedAds.includes(acc.name)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedAds([...selectedAds, acc.name]);
                              } else {
                                setSelectedAds(
                                  selectedAds.filter((a) => a !== acc.name)
                                );
                              }
                            }}
                          />
                          {acc.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button
                className="bg-blue-300 text-white text-lg font-bold px-12 py-3 rounded shadow-md mt-4"
                disabled
              >
                {screen === "add" ? "Save" : "Update"}
              </Button>
            </div>
            {/* Avatar placeholder */}
            <div className="flex-1 flex items-center justify-center">
              <div className="w-48 h-48 border rounded-xl flex items-center justify-center bg-gray-50">
                <User className="w-24 h-24 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
