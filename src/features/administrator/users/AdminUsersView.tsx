"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Role = "Master Admin" | "Admin";
type UserStatus = "active" | "inactive";
type AuthType = "sso" | "password";

interface AdminUserRow {
  uid: string;
  fullName: string;
  username: string;
  loginEmail: string;
  notificationEmail: string | null;
  role: Role;
  status: UserStatus;
  isMasterAdmin: boolean;
  authType: AuthType;
  lastSignInLabel: string;
}

interface CreateUserFormState {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: "Admin";
}

const SELECT_CLASS =
  "min-w-[128px] appearance-none rounded-lg border border-gray-200 bg-white py-2.5 ps-4 pe-9 text-[13px] font-medium text-gray-700 shadow-xs transition-colors focus-visible:border-[#015AFD] focus-visible:ring-2 focus-visible:ring-[#015AFD]/25";

const INITIAL_FORM: CreateUserFormState = {
  firstName: "",
  lastName: "",
  email: "",
  username: "",
  role: "Admin",
};

function roleBadgeClass(role: Role): string {
  if (role === "Master Admin") return "bg-violet-100 text-violet-700";
  return "bg-blue-100 text-blue-700";
}

function statusBadgeClass(status: UserStatus): string {
  return status === "active"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-rose-100 text-rose-700";
}

function authBadgeClass(authType: AuthType): string {
  return authType === "sso"
    ? "bg-sky-100 text-sky-700"
    : "bg-slate-100 text-slate-700";
}

export function AdminUsersView() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CreateUserFormState>(INITIAL_FORM);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const payload = (await response.json()) as {
        users?: AdminUserRow[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load users");
      }
      setRows(payload.users ?? []);
    } catch (error) {
      toast.error("Failed to load users");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (row) =>
          row.fullName.toLowerCase().includes(q) ||
          row.username.toLowerCase().includes(q) ||
          row.loginEmail.toLowerCase().includes(q),
      );
    }
    if (roleFilter !== "all") {
      list = list.filter((row) => row.role === roleFilter);
    }
    if (statusFilter !== "all") {
      list = list.filter((row) => row.status === statusFilter);
    }
    return list;
  }, [rows, roleFilter, search, statusFilter]);

  const handleCreateUser = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.username.trim()) {
      toast.error("Please complete all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          username: form.username.trim(),
          role: form.role,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create user");
      }
      toast.success("User created successfully");
      setAddOpen(false);
      setForm(INITIAL_FORM);
      await loadUsers();
    } catch (error) {
      toast.error((error as Error).message || "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (row: AdminUserRow) => {
    const nextAction = row.status === "active" ? "disable" : "enable";
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid: row.uid, action: nextAction }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update user");
      }
      toast.success(`User ${nextAction === "disable" ? "disabled" : "enabled"}`);
      await loadUsers();
    } catch (error) {
      toast.error((error as Error).message || "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (row: AdminUserRow) => {
    const confirmed = window.confirm(`Delete ${row.fullName}? This cannot be undone.`);
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid: row.uid }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete user");
      }
      toast.success("User deleted");
      await loadUsers();
    } catch (error) {
      toast.error((error as Error).message || "Failed to delete user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-6 pb-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 sm:text-[30px]">
            User Management
          </h1>
          <p className="text-[14px] text-[#64748b]">
            Manage live administrator and IT support accounts. Master Admin accounts cannot be deleted.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setForm(INITIAL_FORM);
            setAddOpen(true);
          }}
          className="gap-2 rounded-xl bg-[#015AFD] font-semibold text-white shadow-sm hover:bg-[#014bcc]"
        >
          <Plus className="size-4" aria-hidden />
          Add New User
        </Button>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Role Permissions
        </p>
        <p className="mt-2 text-sm text-slate-700">
          <strong>Master Admin:</strong> full access, can manage Admin users, cannot be deleted.
        </p>
        <p className="mt-1 text-sm text-slate-700">
          <strong>Admin:</strong> standard administrator account with platform access.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 shadow-sm">
          <Search className="size-4 shrink-0 text-[#015AFD]" aria-hidden />
          <input
            className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
            placeholder="Search by name, username, or login email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="relative">
          <select
            className={cn(SELECT_CLASS, "min-w-[160px]")}
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as Role | "all")}
            aria-label="Filter users by role"
          >
            <option value="all">All Roles</option>
            <option value="Master Admin">Master Admin</option>
            <option value="Admin">Admin</option>
          </select>
          <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
        </div>

        <div className="relative">
          <select
            className={cn(SELECT_CLASS, "min-w-[140px]")}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as UserStatus | "all")}
            aria-label="Filter users by status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
          Loading users...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500">
          No users found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-none">
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full text-left text-[13px]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Username</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Login Email</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Notification Email</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Role</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Auth</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Last Login</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((row) => {
                  const canManage = !row.isMasterAdmin;
                  return (
                    <tr key={row.uid} className="hover:bg-gray-50">
                      <td className="px-4 py-3.5 font-medium text-gray-900">{row.fullName}</td>
                      <td className="px-4 py-3.5 text-gray-700">{row.username}</td>
                      <td className="px-4 py-3.5 text-gray-700">{row.loginEmail}</td>
                      <td className="px-4 py-3.5 text-gray-700">{row.notificationEmail ?? "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", roleBadgeClass(row.role))}>
                          {row.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", authBadgeClass(row.authType))}>
                          {row.authType === "sso" ? "SSO" : "Password"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", statusBadgeClass(row.status))}>
                          {row.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700">{row.lastSignInLabel}</td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!canManage || isSubmitting}
                            onClick={() => void handleToggleStatus(row)}
                            className="h-8 rounded-lg"
                          >
                            {row.status === "active" ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!canManage || isSubmitting}
                            onClick={() => void handleDeleteUser(row)}
                            className="h-8 rounded-lg text-rose-600 hover:text-rose-700"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-[560px] gap-5 sm:p-8">
          <DialogHeader className="space-y-2 text-start">
            <DialogTitle className="text-xl font-bold text-gray-900">Add New User</DialogTitle>
            <DialogDescription className="text-[14px] text-[#64748b]">
              Add a new administrator account to the admin user directory.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first-name">First Name</Label>
              <Input id="first-name" value={form.firstName} onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last Name</Label>
              <Input id="last-name" value={form.lastName} onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notification-email">Email (optional for notifications)</Label>
              <Input
                id="notification-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={form.username} onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="role">Role</Label>
              <div className="relative">
                <select
                  id="role"
                  className={cn(SELECT_CLASS, "min-w-full")}
                  value={form.role}
                  onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as "Admin" }))}
                >
                  <option value="Admin">Admin</option>
                </select>
                <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 sm:flex-row-reverse sm:justify-end">
            <Button
              type="button"
              className="rounded-xl bg-[#015AFD] font-semibold text-white hover:bg-[#014bcc]"
              disabled={isSubmitting}
              onClick={() => void handleCreateUser()}
            >
              Create User
            </Button>
            <Button type="button" variant="outline" className="rounded-xl border-[#e5e5e5]" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
