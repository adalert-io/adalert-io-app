"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleCheckBig,
  Filter,
  LayoutGrid,
  List,
  Mail,
  MoreHorizontal,
  Pencil,
  Plane,
  Search,
  UserMinus,
  UsersRound,
  X,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

import { AdminDashboardDateRangePicker } from "../dashboard/AdminDashboardDateRangePicker";

type UserStatusKey = "active" | "invited" | "inactive";

interface AdminUserDemoRow {
  id: string;
  fullName: string;
  email: string;
  initials: string;
  avatarToneIndex: number;
  status: UserStatusKey;
  customerAccessLabel: string;
  lastActiveLabel: string;
  /** Current signed-in administrator row badge in mock UI. */
  isSessionUser?: boolean;
}

const COMPANY_POOL = [
  "McGrath Kavinoky LLP",
  "Lakeside Boutique",
  "Nexus AI Labs",
  "Sunrise Catering Co.",
  "PixelForge Studios",
  "Acme Diagnostics LLC",
  "Harbor Media Group",
  "Northwind Collective",
];

const AVATAR_BG = [
  "bg-[#3b82f6]",
  "bg-[#6366f1]",
  "bg-[#0ea5e9]",
  "bg-[#475569]",
  "bg-[#8b5cf6]",
];

const FIRST_NAMES = [
  "Nishant",
  "Sarah",
  "Jordan",
  "Priya",
  "Alex",
  "Casey",
  "Morgan",
  "Taylor",
];

const LAST_NAMES = [
  "Thakur",
  "Chen",
  "Miller",
  "Patel",
  "Rivera",
  "Nguyen",
  "Brooks",
  "Singh",
];

const PAGE_SIZE = 10;

const CUSTOMER_SCOPE_OPTIONS = [
  { value: "all", label: "All Customers" },
  { value: "8", label: "8 Customers" },
  ...COMPANY_POOL.map((c) => ({ value: c, label: `1 Customer — ${c}` })),
];

function initialsFromName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const f = words[0]?.[0];
  const s = words.length > 1 ? words[1]?.[0] : words[0]?.[1];
  return `${f ?? "?"}${s ?? "?"}`.toUpperCase().slice(0, 2);
}

function slugify(emailLocal: string): string {
  return emailLocal.replace(/[^\w]/g, ".").slice(0, 24);
}

function seedUsers(): AdminUserDemoRow[] {
  const statusCycle: UserStatusKey[] = [
    "active",
    "active",
    "active",
    "invited",
    "active",
    "inactive",
    "active",
    "invited",
    "active",
    "active",
  ];

  const accessCycle = [
    "All Customers",
    "8 Customers",
    "McGrath Kavinoky LLP",
    "Sunrise Catering Co.",
    "Nexus AI Labs",
    `6 Customers`,
    "All Customers",
    "Harbor Media Group",
    `${COMPANY_POOL[2]}`,
    "All Customers",
  ];

  return Array.from({ length: 24 }, (_, idx) => {
    const fname = FIRST_NAMES[idx % FIRST_NAMES.length];
    const lname = LAST_NAMES[(idx + 3) % LAST_NAMES.length];
    const full = idx === 0 ? "Nishant Thakur" : `${fname} ${lname}`;
    const local = slugify(full.toLowerCase().replace(/\s+/g, "."));

    return {
      id: `usr-${String(idx + 1).padStart(3, "0")}`,
      fullName: full,
      email: `${local}.${idx || 102}@${idx % 4 === 0 ? "adalert.io" : "firm.co"}`,
      initials: initialsFromName(full),
      avatarToneIndex: idx % AVATAR_BG.length,
      status: statusCycle[idx % statusCycle.length],
      customerAccessLabel: accessCycle[idx % accessCycle.length],
      lastActiveLabel:
        statusCycle[idx % statusCycle.length] === "invited"
          ? "—"
          : `May ${15 - (idx % 5)}, 2025 ${10 + (idx % 6)}:${String((idx * 17) % 60).padStart(2, "0")} AM`,
      isSessionUser: idx === 0,
    };
  });
}

function payoutSlots(
  currentPage: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }
  const last = totalPages;
  if (currentPage <= 4) return [1, 2, 3, 4, 5, "ellipsis", last];
  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis", last - 4, last - 3, last - 2, last - 1, last];
  }
  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    last,
  ];
}

function DashboardMetricCard({
  title,
  value,
  trend,
  trendTone,
  Icon,
  accentClassName,
}: {
  title: ReactNode;
  value: string;
  trend: string;
  trendTone: "positive" | "negative";
  Icon: LucideIcon;
  accentClassName?: string;
}) {
  const trendCn =
    trendTone === "positive" ? "text-[#22c55e]" : "text-[#ef4444]";
  return (
    <Card className="flex min-h-[140px] justify-center gap-0 rounded-xl border border-slate-200 bg-white py-0 shadow-sm">
      <CardContent className="flex flex-1 items-center justify-between gap-4 px-6 py-6">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="truncate text-[28px] font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className={cn("text-sm font-medium", trendCn)}>{trend}</p>
        </div>
        <span
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-full text-[#3b82f6]",
            accentClassName ?? "bg-[#3b82f6]/10",
          )}
        >
          <Icon className="size-6" strokeWidth={1.85} aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}

function WorkflowStatusLite({ status }: { status: UserStatusKey }) {
  if (status === "active") {
    return (
      <span className="flex items-center gap-2 font-medium text-gray-900">
        <span className="size-2 shrink-0 rounded-full bg-[#22c55e]" aria-hidden />
        Active
      </span>
    );
  }
  if (status === "invited") {
    return (
      <span className="flex items-center gap-2 font-medium text-gray-900">
        <span className="size-2 shrink-0 rounded-full bg-orange-500" aria-hidden />
        Invited
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2 font-medium text-gray-900">
      <span className="size-2 shrink-0 rounded-full bg-[#ef4444]" aria-hidden />
      Inactive
    </span>
  );
}

const SELECT_CLASS =
  "min-w-[128px] appearance-none rounded-lg border border-gray-200 bg-white py-2.5 ps-4 pe-9 text-[13px] font-medium text-gray-700 shadow-xs transition-colors focus-visible:border-[#015AFD] focus-visible:ring-2 focus-visible:ring-[#015AFD]/25";

function generateTemporaryPassword(length = 16): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const nums = "23456789";
  const specials = "!@#$%*&";
  const all = upper + lower + nums + specials;
  let out =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    nums[Math.floor(Math.random() * nums.length)] +
    specials[Math.floor(Math.random() * specials.length)];
  for (let i = out.length; i < length; i++) {
    out += all[Math.floor(Math.random() * all.length)];
  }
  return out
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

function customerLabelFromScope(value: string): string {
  if (value === "all") return "All Customers";
  if (value === "8") return "8 Customers";
  return value;
}

export function AdminUsersView() {
  const initialRows = useMemo(() => seedUsers(), []);
  const [rows, setRows] = useState<AdminUserDemoRow[]>(initialRows);

  const kpiTotals = useMemo(() => ({
    total: rows.length,
    active: rows.filter((r) => r.status === "active").length,
    invited: rows.filter((r) => r.status === "invited").length,
    inactive: rows.filter((r) => r.status === "inactive").length,
  }), [rows]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [statusFilter, setStatusFilter] = useState<UserStatusKey | "all">(
    "all",
  );
  const [customerFilter, setCustomerFilter] = useState<string>("all");

  const [addOpen, setAddOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCustomerScope, setFormCustomerScope] = useState("all");
  const [formPassword, setFormPassword] = useState("");

  const filtered = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.fullName.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (customerFilter !== "all") {
      const cf = customerFilter.toLowerCase();
      list = list.filter((r) =>
        r.customerAccessLabel.toLowerCase().includes(cf),
      );
    }
    return list;
  }, [rows, search, statusFilter, customerFilter]);

  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const safePage = Math.min(Math.max(1, page), totalPages);
  const sliceStart = (safePage - 1) * PAGE_SIZE;
  const pagedRows = filtered.slice(sliceStart, sliceStart + PAGE_SIZE);

  const pageIdsOnPage = useMemo(() => pagedRows.map((r) => r.id), [pagedRows]);
  const allPageSelected =
    pageIdsOnPage.length > 0 && pageIdsOnPage.every((id) => selected.has(id));
  const somePageSelected = pageIdsOnPage.some((id) => selected.has(id));
  const headerChecked: boolean | "indeterminate" = allPageSelected
    ? true
    : somePageSelected
      ? "indeterminate"
      : false;

  const slots = payoutSlots(safePage, totalPages);

  const toggleRow = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleHeader = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const id of pageIdsOnPage) next.delete(id);
      } else {
        for (const id of pageIdsOnPage) next.add(id);
      }
      return next;
    });
  }, [allPageSelected, pageIdsOnPage]);

  const resetAddForm = useCallback(() => {
    setFormName("");
    setFormEmail("");
    setFormCustomerScope("all");
    setFormPassword("");
  }, []);

  const handleOpenAdd = () => {
    resetAddForm();
    setAddOpen(true);
  };

  const handleGeneratePassword = () => {
    setFormPassword(generateTemporaryPassword());
  };

  const handleCreateUserSubmit = () => {
    const name = formName.trim() || "New User";
    const email =
      formEmail.trim() ||
      `user.${Date.now().toString(36)}@adalert.io`;
    const scopeLabel = customerLabelFromScope(formCustomerScope);
    const next: AdminUserDemoRow = {
      id: `usr-new-${Date.now()}`,
      fullName: name,
      email,
      initials: initialsFromName(name),
      avatarToneIndex: rows.length % AVATAR_BG.length,
      status: "invited",
      customerAccessLabel: scopeLabel,
      lastActiveLabel: "—",
    };
    setRows((prev) => [next, ...prev]);
    setAddOpen(false);
    resetAddForm();
    setPage(1);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8 pb-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl space-y-2">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 sm:text-[30px]">
            Users
          </h1>
          <p className="text-[15px] text-[#7A7D9C]">
            Administrators for this preview console — all users share full admin access
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdminDashboardDateRangePicker />
          <Button
            variant="outline"
            type="button"
            className="gap-2 rounded-xl border-[#e5e5e5] bg-white shadow-sm"
          >
            <Filter className="size-4 text-gray-700" aria-hidden />
            Filters
          </Button>
          <Button
            type="button"
            onClick={handleOpenAdd}
            className="gap-2 rounded-xl bg-[#015AFD] font-semibold text-white shadow-sm hover:bg-[#014bcc]"
          >
            <Plus className="size-4" aria-hidden />
            Add User
          </Button>
        </div>
      </header>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-[480px] gap-6 sm:p-8">
          <DialogHeader className="space-y-2 text-start">
            <DialogTitle className="text-xl font-bold text-gray-900">
              Add user
            </DialogTitle>
            <DialogDescription className="text-[14px] text-[#64748b]">
              Invite a teammate as an administrator. Set customer scope and
              provision an initial credential.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="add-user-name">Full name</Label>
              <Input
                id="add-user-name"
                autoComplete="name"
                placeholder="Jane Doe"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-user-email">Work email</Label>
              <Input
                id="add-user-email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-user-scope">Customer access</Label>
              <div className="relative">
                <select
                  id="add-user-scope"
                  className={cn(SELECT_CLASS, "min-w-full")}
                  value={formCustomerScope}
                  onChange={(e) => setFormCustomerScope(e.target.value)}
                >
                  {CUSTOMER_SCOPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden
                  className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-user-password">Temporary password</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <Input
                  id="add-user-password"
                  type="text"
                  readOnly
                  className="sm:flex-1"
                  placeholder="Click generate to create…"
                  value={formPassword}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGeneratePassword}
                  className="shrink-0 rounded-xl border-[#015AFD] font-semibold text-[#015AFD] hover:bg-blue-50"
                >
                  Generate password
                </Button>
              </div>
              <p className="text-[12px] text-[#64748b]">
                Share this credential securely; the recipient will be prompted
                to rotate it on first sign-in.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 sm:flex-row-reverse sm:justify-end">
            <Button
              type="button"
              className="rounded-xl bg-[#015AFD] font-semibold text-white hover:bg-[#014bcc]"
              onClick={handleCreateUserSubmit}
            >
              Create user
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-[#e5e5e5]"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard
          title="Total Users"
          value={String(kpiTotals.total)}
          trend="+9% vs last 7 days"
          trendTone="positive"
          Icon={UsersRound}
          accentClassName="bg-[#3b82f6]/10 text-[#2563eb]"
        />
        <DashboardMetricCard
          title="Active Users"
          value={String(kpiTotals.active)}
          trend="+12% vs last 7 days"
          trendTone="positive"
          Icon={CircleCheckBig}
          accentClassName="bg-[#22c55e]/15 text-[#16a34a]"
        />
        <DashboardMetricCard
          title="Invited"
          value={String(kpiTotals.invited)}
          trend="↓25% vs last 7 days"
          trendTone="negative"
          Icon={Mail}
          accentClassName="bg-orange-100 text-orange-700"
        />
        <DashboardMetricCard
          title="Inactive"
          value={String(kpiTotals.inactive)}
          trend="↓50% vs last 7 days"
          trendTone="negative"
          Icon={UserMinus}
          accentClassName="bg-[#fecaca]/45 text-[#dc2626]"
        />
      </section>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-200">
            <Search className="size-5 shrink-0 text-[#015AFD]" aria-hidden />
            <input
              className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
              placeholder="Search by name or email..."
              value={search}
              aria-label="Search users"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search ? (
              <button
                type="button"
                aria-label="Clear search"
                className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="relative">
            <select
              className={SELECT_CLASS}
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                const v = e.target.value as UserStatusKey | "all";
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
            />
          </div>

          <div className="relative">
            <select
              className={cn(SELECT_CLASS, "min-w-[168px]")}
              aria-label="Filter by customer"
              value={customerFilter}
              onChange={(e) => {
                setCustomerFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Customers</option>
              {COMPANY_POOL.map((c) => (
                <option key={c} value={c.toLowerCase()}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            type="button"
            className="gap-2 rounded-lg border-[#e5e5e5] bg-white"
          >
            <Filter className="size-4 text-gray-700" aria-hidden />
            More Filters
          </Button>

          <div className="ms-auto flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-pressed={viewMode === "list"}
              title="List view"
              onClick={() => setViewMode("list")}
              className={cn(
                "size-9 rounded-lg border-[#e5e5e5] bg-white text-gray-600 shadow-sm",
                viewMode === "list" &&
                  "border-[#0B1426] bg-[#0B1426] text-white hover:bg-[#152542] hover:text-white",
              )}
            >
              <List className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-pressed={viewMode === "grid"}
              title="Grid view"
              onClick={() => setViewMode("grid")}
              className={cn(
                "size-9 rounded-lg border-[#e5e5e5] bg-white text-gray-600 shadow-sm",
                viewMode === "grid" &&
                  "border-[#0B1426] bg-[#0B1426] text-white hover:bg-[#152542] hover:text-white",
              )}
            >
              <LayoutGrid className="size-4" aria-hidden />
            </Button>
          </div>
        </div>

        {viewMode === "list" ? (
          filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#e5e5e5] bg-white py-24 text-center text-[14px] text-gray-600">
              No users match your filters.
            </div>
          ) : (
            <UsersTable
              rows={pagedRows}
              selected={selected}
              toggleRow={toggleRow}
              headerChecked={headerChecked}
              toggleHeader={toggleHeader}
            />
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-[15px] text-muted-foreground">
            User tiles in grid view will mirror key policy tags once approvals
            land for compact teammate cards.
          </div>
        )}

        <footer className="flex flex-col items-center justify-between gap-4 px-2 sm:flex-row">
          <p className="text-[13px] font-medium text-gray-600">
            {totalRows === 0
              ? "No users match your filters."
              : `Showing ${sliceStart + 1} to ${Math.min(safePage * PAGE_SIZE, totalRows)} of ${totalRows} users`}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage(1)}
              className="h-9 w-9 p-0"
              aria-label="First page"
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-9 w-9 p-0"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-1">
              {slots.map((item, idx) =>
                item === "ellipsis" ? (
                  <span
                    key={`e-${idx}`}
                    className="px-1.5 text-[13px] text-gray-400"
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={item}
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(item)}
                    aria-current={safePage === item ? "page" : undefined}
                    className={cn(
                      "h-9 min-w-9 px-2 text-[13px] font-medium",
                      safePage === item &&
                        "border-[#0B1426] bg-[#0B1426] text-white hover:bg-[#152542]",
                    )}
                  >
                    {item}
                  </Button>
                ),
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-9 w-9 p-0"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage(totalPages)}
              className="h-9 w-9 p-0"
              aria-label="Last page"
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function UsersTable({
  rows,
  selected,
  toggleRow,
  headerChecked,
  toggleHeader,
}: {
  rows: AdminUserDemoRow[];
  selected: Set<string>;
  toggleRow: (id: string) => void;
  headerChecked: boolean | "indeterminate";
  toggleHeader: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-none">
      <div className="max-[1199px]:overflow-x-auto">
        <table className="min-w-[840px] w-full table-fixed text-[13px]">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="w-[48px] px-3 py-3 text-start">
                <Checkbox
                  checked={headerChecked}
                  aria-label="Select all users on page"
                  onCheckedChange={() => toggleHeader()}
                />
              </th>
              <th className="min-w-[240px] ps-2 pe-4 py-3 text-start font-semibold text-gray-700">
                User
              </th>
              <th className="min-w-[220px] py-3 pe-4 text-start font-semibold text-gray-700">
                Email
              </th>
              <th className="min-w-[160px] py-3 pe-4 text-start font-semibold text-gray-700">
                Customer Access
              </th>
              <th className="w-[120px] py-3 pe-4 text-start font-semibold text-gray-700">
                Status
              </th>
              <th className="w-[168px] py-3 pe-4 text-start font-semibold text-gray-700">
                Last Active
              </th>
              <th className="w-[108px] py-3 px-4 text-center font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const bg =
                AVATAR_BG[row.avatarToneIndex % AVATAR_BG.length] ??
                "bg-[#3b82f6]";
              const isInvited = row.status === "invited";
              return (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-3 py-4 align-middle">
                    <Checkbox
                      checked={selected.has(row.id)}
                      aria-label={`Select ${row.fullName}`}
                      onCheckedChange={() => toggleRow(row.id)}
                    />
                  </td>
                  <td className="px-3 py-4 align-middle">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "relative flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                          bg,
                        )}
                      >
                        {row.initials}
                      </span>
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-gray-900">
                          {row.fullName}
                        </p>
                        {row.isSessionUser ? (
                          <span className="inline-flex shrink-0 rounded-full bg-[#015AFD]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#015AFD]">
                            You
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="truncate py-4 pe-3 align-middle text-gray-700">
                    {row.email}
                  </td>
                  <td className="truncate py-4 pe-3 align-middle text-gray-800">
                    {row.customerAccessLabel}
                  </td>
                  <td className="py-4 pe-3 align-middle">
                    <WorkflowStatusLite status={row.status} />
                  </td>
                  <td className="truncate py-4 pe-3 align-middle tabular-nums text-gray-700">
                    {row.lastActiveLabel}
                  </td>
                  <td className="px-2 py-4 align-middle text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      {isInvited ? (
                        <button
                          type="button"
                          aria-label={`Resend invitation to ${row.fullName}`}
                          className="rounded-lg p-2 text-[#015AFD] hover:bg-blue-50"
                          title="Resend invitation"
                        >
                          <Plane className="size-4" strokeWidth={1.75} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Edit ${row.fullName}`}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        >
                          <Pencil className="size-4" strokeWidth={1.75} />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`More actions for ${row.fullName}`}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                      >
                        <MoreHorizontal
                          className="size-4 rotate-90"
                          strokeWidth={1.75}
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
