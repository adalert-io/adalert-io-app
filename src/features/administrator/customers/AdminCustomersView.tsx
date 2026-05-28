"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpFromLine,
  CircleCheckBig,
  Clock,
  DollarSign,
  Eye,
  LayoutGrid,
  List,
  PencilLine,
  Plus,
  Search,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

type CustomerStatus = "active" | "trial" | "past_due" | "paused" | "not_connected";
type CustomerPlan = "Professional" | "Starter";

interface CustomerRow {
  id: string;
  companyName: string;
  email: string;
  initials: string;
  avatarKind: "initials" | "logo";
  avatarToneIndex: number;
  contacts: number;
  adAccounts: number;
  mrr: number;
  status: CustomerStatus;
  plan: CustomerPlan;
  nextBillingLabel: string;
}

interface CustomerMetrics {
  total: number;
  active: number;
  trial: number;
  pastDue: number;
  mrr: number;
}

interface CustomerDetail {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  status: CustomerStatus;
  billingSnapshot: {
    plan: string;
    subscriptionStatus: string;
    nextBillingDate: string;
    monthlyRecurringRevenue: number;
    cardBrand: string | null;
    cardLast4: string | null;
  };
}

const AVATAR_BACKGROUNDS = [
  "bg-[#3b82f6]",
  "bg-[#6366f1]",
  "bg-[#0ea5e9]",
  "bg-[#475569]",
  "bg-[#8b5cf6]",
];
const PAGE_SIZE = 8;

function formatMoney(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function statusLabel(status: CustomerStatus): string {
  if (status === "past_due") return "Past Due";
  if (status === "not_connected") return "Not Connected";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  const styles: Record<CustomerStatus, string> = {
    active: "border-[#22c55e]/25 bg-[#22c55e]/12 text-[#15803d]",
    trial: "border-[#3b82f6]/20 bg-[#3b82f6]/12 text-[#1d4ed8]",
    past_due: "border-[#fecaca] bg-[#ef4444]/12 text-[#dc2626]",
    paused: "border-orange-300/45 bg-orange-400/14 text-orange-800",
    not_connected: "border-gray-200 bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        styles[status],
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

function CustomerAvatar({
  initials,
  avatarToneIndex,
}: Pick<CustomerRow, "initials" | "avatarToneIndex">) {
  const bgClass = AVATAR_BACKGROUNDS[avatarToneIndex % AVATAR_BACKGROUNDS.length]!;
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
        bgClass,
      )}
    >
      {initials}
    </span>
  );
}

function DashboardMetricCard({
  title,
  value,
  Icon,
  accentClassName,
}: {
  title: string;
  value: string;
  Icon: typeof Users;
  accentClassName: string;
}) {
  return (
    <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-center justify-between px-6 py-6">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-[28px] font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className={cn("flex size-14 items-center justify-center rounded-full", accentClassName)}>
          <Icon className="size-6" strokeWidth={1.85} aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}

export function AdminCustomersView() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [metrics, setMetrics] = useState<CustomerMetrics>({
    total: 0,
    active: 0,
    trial: 0,
    pastDue: 0,
    mrr: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<CustomerDetail | null>(null);

  const [addForm, setAddForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    plan: "Starter" as CustomerPlan,
    status: "trial" as CustomerStatus,
  });
  const [editForm, setEditForm] = useState({
    companyName: "",
    contactName: "",
    status: "active" as CustomerStatus,
    plan: "Professional" as CustomerPlan,
  });

  async function loadCustomers() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/customers", { cache: "no-store" });
      const payload = (await response.json()) as {
        customers?: CustomerRow[];
        metrics?: CustomerMetrics;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Failed to load customers");
      setRows(payload.customers ?? []);
      if (payload.metrics) setMetrics(payload.metrics);
    } catch (error) {
      toast.error("Failed to load customers");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCustomers();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((row) => row.companyName.toLowerCase().includes(q) || row.email.toLowerCase().includes(q));
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pagedRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  async function openView(row: CustomerRow) {
    setSelected(row);
    setIsViewOpen(true);
    try {
      const response = await fetch(`/api/admin/customers/${row.id}`, { cache: "no-store" });
      const payload = (await response.json()) as { customer?: CustomerDetail; error?: string };
      if (!response.ok || !payload.customer) throw new Error(payload.error || "Failed to load customer detail");
      setSelectedDetail(payload.customer);
    } catch (error) {
      toast.error("Failed to load customer detail");
      console.error(error);
    }
  }

  async function openEdit(row: CustomerRow) {
    setSelected(row);
    setEditForm({
      companyName: row.companyName,
      contactName: row.companyName,
      status: row.status,
      plan: row.plan,
    });
    setIsEditOpen(true);
  }

  async function handleCreate() {
    try {
      const response = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Failed to create customer");
      setIsAddOpen(false);
      setAddForm({ companyName: "", contactName: "", email: "", plan: "Starter", status: "trial" });
      toast.success("Customer created");
      await loadCustomers();
    } catch (error) {
      toast.error("Failed to create customer");
      console.error(error);
    }
  }

  async function handleEditSave() {
    if (!selected) return;
    try {
      const response = await fetch(`/api/admin/customers/${selected.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Failed to update customer");
      setIsEditOpen(false);
      toast.success("Customer updated");
      await loadCustomers();
    } catch (error) {
      toast.error("Failed to update customer");
      console.error(error);
    }
  }

  async function handleExport() {
    try {
      const response = await fetch("/api/admin/customers/export", { cache: "no-store" });
      if (!response.ok) throw new Error("Export failed");
      const csv = await response.text();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "adalert-customers.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to export customers");
      console.error(error);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl space-y-2">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 sm:text-[30px]">Customers</h1>
          <p className="text-[15px] text-[#7A7D9C]">Manage all your customers and their accounts</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" className="gap-2 rounded-xl bg-[#015AFD] px-4 hover:bg-[#0147d9]" onClick={() => setIsAddOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Add Customer
          </Button>
          <AdminDashboardDateRangePicker />
        </div>
      </header>

      <section className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <DashboardMetricCard title="Total Customers" value={String(metrics.total)} Icon={Users} accentClassName="bg-[#3b82f6]/10 text-[#3b82f6]" />
        <DashboardMetricCard title="Active Customers" value={String(metrics.active)} Icon={CircleCheckBig} accentClassName="bg-[#22c55e]/15 text-[#16a34a]" />
        <DashboardMetricCard title="Trial Customers" value={String(metrics.trial)} Icon={Clock} accentClassName="bg-orange-400/20 text-orange-700" />
        <DashboardMetricCard title="Past Due Customers" value={String(metrics.pastDue)} Icon={TriangleAlert} accentClassName="bg-[#ef4444]/12 text-[#ef4444]" />
        <DashboardMetricCard title="MRR" value={formatMoney(metrics.mrr)} Icon={DollarSign} accentClassName="bg-emerald-400/16 text-emerald-700" />
      </section>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 shadow-sm sm:max-w-xl">
            <Search className="size-5 shrink-0 text-[#015AFD]" aria-hidden />
            <input className="min-w-0 flex-1 border-none bg-transparent text-[0.75rem] text-gray-700 outline-none placeholder:text-gray-400" placeholder="Search customers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            {search ? <button type="button" className="rounded-full p-1 text-gray-400 hover:bg-gray-100" onClick={() => setSearch("")}><X className="size-4" /></button> : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" type="button" className="gap-2 rounded-lg border-[#e5e5e5] bg-white" onClick={handleExport}>
              <ArrowUpFromLine className="size-4 text-gray-700" aria-hidden />
              Export
            </Button>
            <Button type="button" variant="outline" size="icon" aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")} className={cn("size-9 rounded-lg", viewMode === "grid" && "bg-[#0B1426] text-white")}>
              <LayoutGrid className="size-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")} className={cn("size-9 rounded-lg", viewMode === "list" && "bg-[#0B1426] text-white")}>
              <List className="size-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-[#e5e5e5] bg-white p-8 text-center text-sm text-gray-500">Loading customers...</div>
        ) : viewMode === "list" ? (
          <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white">
            <table className="min-w-full text-[0.75rem]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-4 text-left font-semibold text-gray-700">Customer</th>
                  <th className="px-4 py-4 text-left font-semibold text-gray-700">Ad Accounts</th>
                  <th className="px-4 py-4 text-left font-semibold text-gray-700">MRR</th>
                  <th className="px-4 py-4 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-4 text-left font-semibold text-gray-700">Plan</th>
                  <th className="px-4 py-4 text-left font-semibold text-gray-700">Next Billing</th>
                  <th className="px-4 py-4 text-center font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <CustomerAvatar initials={row.initials} avatarToneIndex={row.avatarToneIndex} />
                        <div>
                          <p className="font-semibold text-gray-900">{row.companyName}</p>
                          <p className="text-[12px] text-gray-500">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">{row.adAccounts}</td>
                    <td className="px-4 py-4">{formatMoney(row.mrr)}</td>
                    <td className="px-4 py-4"><CustomerStatusBadge status={row.status} /></td>
                    <td className="px-4 py-4">{row.plan}</td>
                    <td className="px-4 py-4">{row.nextBillingLabel}</td>
                    <td className="px-4 py-4 text-center">
                      <Button variant="ghost" size="icon" onClick={() => void openView(row)}><Eye className="size-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => void openEdit(row)}><PencilLine className="size-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pagedRows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-[#e5e5e5] bg-white p-5">
                <div className="flex items-start gap-3">
                  <CustomerAvatar initials={row.initials} avatarToneIndex={row.avatarToneIndex} />
                  <div>
                    <p className="font-semibold text-gray-900">{row.companyName}</p>
                    <p className="text-[12px] text-gray-500">{row.email}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <CustomerStatusBadge status={row.status} />
                  <span className="text-sm font-semibold">{formatMoney(row.mrr)}</span>
                </div>
                <div className="mt-3 flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => void openView(row)}><Eye className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => void openEdit(row)}><PencilLine className="size-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
            <DialogDescription>Create a new customer account.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Label>Company Name</Label>
            <Input value={addForm.companyName} onChange={(e) => setAddForm((p) => ({ ...p, companyName: e.target.value }))} />
            <Label>Contact Name</Label>
            <Input value={addForm.contactName} onChange={(e) => setAddForm((p) => ({ ...p, contactName: e.target.value }))} />
            <Label>Email</Label>
            <Input type="email" value={addForm.email} onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleCreate()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Label>Company Name</Label>
            <Input value={editForm.companyName} onChange={(e) => setEditForm((p) => ({ ...p, companyName: e.target.value }))} />
            <Label>Contact Name</Label>
            <Input value={editForm.contactName} onChange={(e) => setEditForm((p) => ({ ...p, contactName: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleEditSave()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDetail?.companyName ?? "Customer"}</DialogTitle>
            <DialogDescription>Billing snapshot and account details</DialogDescription>
          </DialogHeader>
          {selectedDetail ? (
            <div className="space-y-2 text-sm">
              <p><strong>Email:</strong> {selectedDetail.email}</p>
              <p><strong>Status:</strong> {statusLabel(selectedDetail.status)}</p>
              <p><strong>Plan:</strong> {selectedDetail.billingSnapshot.plan}</p>
              <p><strong>Subscription:</strong> {selectedDetail.billingSnapshot.subscriptionStatus}</p>
              <p><strong>Next Billing:</strong> {selectedDetail.billingSnapshot.nextBillingDate}</p>
              <p><strong>MRR:</strong> {formatMoney(selectedDetail.billingSnapshot.monthlyRecurringRevenue)}</p>
              <p><strong>Card:</strong> {selectedDetail.billingSnapshot.cardBrand ?? "N/A"} {selectedDetail.billingSnapshot.cardLast4 ? `•••• ${selectedDetail.billingSnapshot.cardLast4}` : ""}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Loading details...</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
