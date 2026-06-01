"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpFromLine,
  BadgeDollarSign,
  Building2,
  CircleCheckBig,
  Clock,
  Eye,
  FileText,
  Layers3,
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

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

interface CompanyDetailsForm {
  companyName: string;
  contactName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  website: string;
  vat: string;
  telephone: string;
  telephoneCountryCode: string;
  timezone: string;
}

interface CustomerDetail {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  companyDetails?: CompanyDetailsForm;
  adAccounts: string[];
  adAccountsCount: number;
  status: CustomerStatus;
  billingSnapshot: {
    plan: string;
    subscriptionStatus: string;
    nextBillingDate: string;
    monthlyRecurringRevenue: number;
    cardBrand: string | null;
    cardLast4: string | null;
    stripeCustomerId?: string | null;
    invoices?: Array<{
      id: string;
      number: string;
      status: string;
      amount: number;
      createdAt: string;
    }>;
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

const EMPTY_COMPANY_FORM: CompanyDetailsForm = {
  companyName: "",
  contactName: "",
  email: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
  website: "",
  vat: "",
  telephone: "",
  telephoneCountryCode: "",
  timezone: "",
};

function formatMoney(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function getPlanAmount({
  plan,
  monthlyRecurringRevenue,
}: {
  plan: string;
  monthlyRecurringRevenue: number;
}): number {
  if (monthlyRecurringRevenue > 0) return monthlyRecurringRevenue;
  if (plan.toLowerCase().includes("starter")) return 59;
  return 59;
}

function SheetSectionHeader({
  title,
  Icon,
  iconClassName,
}: {
  title: string;
  Icon: typeof Users;
  iconClassName: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className={cn("flex size-7 items-center justify-center rounded-lg", iconClassName)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
    </div>
  );
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
  const [editForm, setEditForm] = useState<CompanyDetailsForm>(EMPTY_COMPANY_FORM);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);

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
  const sliceStart = (safePage - 1) * PAGE_SIZE;
  const sliceEnd = Math.min(safePage * PAGE_SIZE, filtered.length);
  const pagedRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  async function openView(row: CustomerRow) {
    setSelected(row);
    setIsViewOpen(true);
    setSelectedDetail(null);
    try {
      const [detailResponse, billingResponse] = await Promise.all([
        fetch(`/api/admin/customers/${row.id}`, { cache: "no-store" }),
        fetch(`/api/admin/customers/${row.id}/billing`, { cache: "no-store" }),
      ]);
      const detailPayload = (await detailResponse.json()) as {
        customer?: CustomerDetail;
        error?: string;
      };
      const billingPayload = (await billingResponse.json()) as {
        billing?: {
          stripeCustomerId?: string | null;
          plan?: string;
          subscriptionStatus?: string;
          nextBillingDate?: string;
          monthlyRecurringRevenue?: number;
          paymentMethod?: {
            brand?: string | null;
            last4?: string | null;
          } | null;
          invoices?: Array<{
            id: string;
            number: string;
            status: string;
            amount: number;
            createdAt: string;
          }>;
        };
      };

      if (!detailResponse.ok || !detailPayload.customer) {
        throw new Error(detailPayload.error || "Failed to load customer detail");
      }

      const billing = billingResponse.ok ? billingPayload.billing : null;
      const mergedCustomer: CustomerDetail = {
        ...detailPayload.customer,
        billingSnapshot: {
          ...detailPayload.customer.billingSnapshot,
          plan: billing?.plan ?? detailPayload.customer.billingSnapshot.plan,
          subscriptionStatus:
            billing?.subscriptionStatus ??
            detailPayload.customer.billingSnapshot.subscriptionStatus,
          nextBillingDate:
            billing?.nextBillingDate ??
            detailPayload.customer.billingSnapshot.nextBillingDate,
          monthlyRecurringRevenue:
            billing?.monthlyRecurringRevenue ??
            detailPayload.customer.billingSnapshot.monthlyRecurringRevenue,
          cardBrand:
            billing?.paymentMethod?.brand ??
            detailPayload.customer.billingSnapshot.cardBrand,
          cardLast4:
            billing?.paymentMethod?.last4 ??
            detailPayload.customer.billingSnapshot.cardLast4,
          stripeCustomerId: billing?.stripeCustomerId ?? null,
          invoices: billing?.invoices ?? [],
        },
      };

      setSelectedDetail(mergedCustomer);
    } catch (error) {
      toast.error("Failed to load customer detail");
      console.error(error);
    }
  }

  async function openEdit(row: CustomerRow) {
    setSelected(row);
    setIsEditOpen(true);
    setIsEditLoading(true);
    setEditForm(EMPTY_COMPANY_FORM);
    try {
      const response = await fetch(`/api/admin/customers/${row.id}`, { cache: "no-store" });
      const payload = (await response.json()) as {
        customer?: CustomerDetail;
        error?: string;
      };
      if (!response.ok || !payload.customer) {
        throw new Error(payload.error || "Failed to load customer");
      }
      const details = payload.customer.companyDetails;
      setEditForm({
        companyName: details?.companyName || payload.customer.companyName,
        contactName: details?.contactName || payload.customer.contactName,
        email: details?.email || payload.customer.email,
        address: details?.address ?? "",
        city: details?.city ?? "",
        state: details?.state ?? "",
        zipCode: details?.zipCode ?? "",
        country: details?.country ?? "",
        website: details?.website ?? "",
        vat: details?.vat ?? "",
        telephone: details?.telephone || payload.customer.phone || "",
        telephoneCountryCode: details?.telephoneCountryCode ?? "",
        timezone: details?.timezone ?? "",
      });
    } catch (error) {
      toast.error("Failed to load company details");
      console.error(error);
      setIsEditOpen(false);
    } finally {
      setIsEditLoading(false);
    }
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
    setIsEditSaving(true);
    try {
      const response = await fetch(`/api/admin/customers/${selected.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Failed to update customer");
      setIsEditOpen(false);
      toast.success("Company details updated");
      await loadCustomers();
      if (isViewOpen && selectedDetail?.id === selected.id) {
        void openView({
          ...selected,
          companyName: editForm.companyName,
          email: editForm.email,
        });
      }
    } catch (error) {
      toast.error("Failed to update customer");
      console.error(error);
    } finally {
      setIsEditSaving(false);
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
        </div>
      </header>

      <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard title="Total Customers" value={String(metrics.total)} Icon={Users} accentClassName="bg-[#3b82f6]/10 text-[#3b82f6]" />
        <DashboardMetricCard title="Active Customers" value={String(metrics.active)} Icon={CircleCheckBig} accentClassName="bg-[#22c55e]/15 text-[#16a34a]" />
        <DashboardMetricCard title="Trial Customers" value={String(metrics.trial)} Icon={Clock} accentClassName="bg-orange-400/20 text-orange-700" />
        <DashboardMetricCard title="Past Due Customers" value={String(metrics.pastDue)} Icon={TriangleAlert} accentClassName="bg-[#ef4444]/12 text-[#ef4444]" />
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
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-[#e5e5e5] bg-white p-8 text-center text-sm text-gray-500">Loading customers...</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white">
            <table className="min-w-full text-[0.75rem]">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-4 text-left font-semibold text-gray-700">Customer</th>
                  <th className="px-4 py-4 text-left font-semibold text-gray-700">Ad Accounts</th>
                  <th className="px-4 py-4 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-4 text-center font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedRows.map((row) => (
                  <tr key={row.id} className="cursor-pointer hover:bg-gray-50/70" onClick={() => void openView(row)}>
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
                    <td className="px-4 py-4"><CustomerStatusBadge status={row.status} /></td>
                    <td className="px-4 py-4 text-center">
                      <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); void openView(row); }}><Eye className="size-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); void openEdit(row); }}><PencilLine className="size-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
              <span>
                {filtered.length === 0
                  ? "No customers to show."
                  : `Showing ${sliceStart + 1} to ${sliceEnd} of ${filtered.length} customers`}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span>{`Page ${safePage} / ${totalPages}`}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
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
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit company details</DialogTitle>
            <DialogDescription>
              Same fields as the customer&apos;s Company Details settings.
            </DialogDescription>
          </DialogHeader>
          {isEditLoading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading company details...</p>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-company-name">Company name</Label>
                <Input
                  id="edit-company-name"
                  value={editForm.companyName}
                  onChange={(e) => setEditForm((p) => ({ ...p, companyName: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-contact-name">Contact name</Label>
                <Input
                  id="edit-contact-name"
                  value={editForm.contactName}
                  onChange={(e) => setEditForm((p) => ({ ...p, contactName: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    value={editForm.address}
                    onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-city">City</Label>
                  <Input
                    id="edit-city"
                    value={editForm.city}
                    onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-state">State / province</Label>
                  <Input
                    id="edit-state"
                    value={editForm.state}
                    onChange={(e) => setEditForm((p) => ({ ...p, state: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-zip">Zip / postal code</Label>
                  <Input
                    id="edit-zip"
                    value={editForm.zipCode}
                    onChange={(e) => setEditForm((p) => ({ ...p, zipCode: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-country">Country</Label>
                  <Input
                    id="edit-country"
                    value={editForm.country}
                    onChange={(e) => setEditForm((p) => ({ ...p, country: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-website">Website</Label>
                  <Input
                    id="edit-website"
                    value={editForm.website}
                    onChange={(e) => setEditForm((p) => ({ ...p, website: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-vat">VAT</Label>
                  <Input
                    id="edit-vat"
                    type="number"
                    step="0.01"
                    value={editForm.vat}
                    onChange={(e) => setEditForm((p) => ({ ...p, vat: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.telephone}
                    onChange={(e) => setEditForm((p) => ({ ...p, telephone: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-phone-code">Phone country code</Label>
                  <Input
                    id="edit-phone-code"
                    value={editForm.telephoneCountryCode}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, telephoneCountryCode: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-timezone">Timezone</Label>
                  <Input
                    id="edit-timezone"
                    value={editForm.timezone}
                    onChange={(e) => setEditForm((p) => ({ ...p, timezone: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isEditSaving}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleEditSave()}
              disabled={isEditLoading || isEditSaving}
            >
              {isEditSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isViewOpen} onOpenChange={setIsViewOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-slate-200 bg-white p-0 sm:max-w-xl"
        >
          {selectedDetail ? (
            <>
              <SheetHeader className="border-b border-slate-100 bg-white px-6 py-5 text-start shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono text-slate-600">
                    {selectedDetail.id}
                  </span>
                  <CustomerStatusBadge status={selectedDetail.status} />
                </div>
                <SheetTitle className="mt-3 text-left text-lg font-bold leading-snug text-slate-900">
                  {selectedDetail.companyName}
                </SheetTitle>
                <SheetDescription className="text-left text-[13px] text-slate-500">
                  {selectedDetail.contactName} · {selectedDetail.email}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <SheetSectionHeader
                    title="Account Details"
                    Icon={Building2}
                    iconClassName="bg-[#3b82f6]/15 text-[#1d4ed8]"
                  />
                  <div className="space-y-2 text-[13px]">
                    <p><span className="text-slate-500">Phone:</span> <span className="font-medium text-slate-800">{selectedDetail.phone ?? "—"}</span></p>
                    <p><span className="text-slate-500">Ad Accounts:</span> <span className="font-medium text-slate-800">{selectedDetail.adAccountsCount}</span></p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <SheetSectionHeader
                    title="Current Plan & Billing"
                    Icon={BadgeDollarSign}
                    iconClassName="bg-emerald-400/15 text-emerald-700"
                  />
                  <div className="space-y-2 text-[13px]">
                    {selectedDetail.billingSnapshot.stripeCustomerId ? (
                      <p>
                        <span className="text-slate-500">Stripe Customer:</span>{" "}
                        <span className="font-mono text-[12px] text-slate-800">
                          {selectedDetail.billingSnapshot.stripeCustomerId}
                        </span>
                      </p>
                    ) : null}
                    <p><span className="text-slate-500">Plan:</span> <span className="font-semibold text-slate-900">{selectedDetail.billingSnapshot.plan}</span></p>
                    <p><span className="text-slate-500">Subscription:</span> <span className="font-medium text-slate-800">{selectedDetail.billingSnapshot.subscriptionStatus}</span></p>
                    <p><span className="text-slate-500">Next Billing:</span> <span className="font-medium text-slate-800">{selectedDetail.billingSnapshot.nextBillingDate}</span></p>
                    <p>
                      <span className="text-slate-500">Plan Amount:</span>{" "}
                      <span className="font-medium text-slate-800">
                        {formatMoney(
                          getPlanAmount({
                            plan: selectedDetail.billingSnapshot.plan,
                            monthlyRecurringRevenue:
                              selectedDetail.billingSnapshot.monthlyRecurringRevenue,
                          }),
                        )}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500">Card:</span>{" "}
                      <span className="font-medium text-slate-800">
                        {selectedDetail.billingSnapshot.cardBrand ?? "N/A"}{" "}
                        {selectedDetail.billingSnapshot.cardLast4
                          ? `•••• ${selectedDetail.billingSnapshot.cardLast4}`
                          : ""}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <SheetSectionHeader
                    title="Recent Invoices"
                    Icon={FileText}
                    iconClassName="bg-violet-400/15 text-violet-700"
                  />
                  {selectedDetail.billingSnapshot.invoices?.length ? (
                    <div className="space-y-2">
                      {selectedDetail.billingSnapshot.invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-[12px]"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">
                              {invoice.number}
                            </p>
                            <p className="text-slate-500">{invoice.createdAt}</p>
                          </div>
                          <div className="text-end">
                            <p className="font-semibold text-slate-900">
                              {formatMoney(invoice.amount)}
                            </p>
                            <p className="uppercase tracking-wide text-slate-500">
                              {invoice.status}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] text-slate-500">
                      No invoices available yet.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <SheetSectionHeader
                    title={`Connected Ad Accounts (${selectedDetail.adAccountsCount})`}
                    Icon={Layers3}
                    iconClassName="bg-orange-400/20 text-orange-700"
                  />
                  {selectedDetail.adAccounts.length === 0 ? (
                    <p className="text-[13px] text-slate-500">No ad accounts connected.</p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedDetail.adAccounts.map((account) => (
                        <li
                          key={account}
                          className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-[13px] text-slate-700"
                        >
                          {account}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsViewOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="px-6 py-6 text-sm text-slate-500">Loading details...</div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
