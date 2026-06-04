"use client";

import { useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Loader2, Mail, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  ConsumerResponsiveModal,
  ConsumerResponsiveModalBody,
  ConsumerResponsiveModalDescription,
  ConsumerResponsiveModalFooter,
  ConsumerResponsiveModalHeader,
  ConsumerResponsiveModalTitle,
} from "@/features/consumer/ConsumerResponsiveModal";
import { db } from "@/lib/firebase/config";
import { useAuthStore } from "@/lib/store/auth-store";
import { useAlertSettingsStore } from "@/lib/store/settings-store";
import { cn } from "@/lib/utils";

const CHECKBOX_CLASS =
  "data-[state=checked]:bg-[#015AFD] data-[state=checked]:border-[#015AFD]";

export interface ConsumerAddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsumerAddUserDialog({
  open,
  onOpenChange,
}: ConsumerAddUserDialogProps) {
  const { userDoc } = useAuthStore();
  const { adsAccounts, inviteUser, refreshInvitations } = useAlertSettingsStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"Admin" | "Manager">("Admin");
  const [adsSearch, setAdsSearch] = useState("");
  const [selectedAds, setSelectedAds] = useState<string[]>([]);

  const filteredAdsAccounts = useMemo(() => {
    const q = adsSearch.trim().toLowerCase();
    if (!q) return adsAccounts;
    return adsAccounts.filter((a) =>
      String(a.name || "").toLowerCase().includes(q),
    );
  }, [adsAccounts, adsSearch]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setRole("Admin");
    setSelectedAds([]);
    setAdsSearch("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isSubmitting) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleToggleAd = (id: string) => {
    setSelectedAds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleCreateUser = async () => {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!userDoc?.["Company Admin"]) return;

    setIsSubmitting(true);
    try {
      const usersRef = collection(db, "users");
      const emailQuery = query(usersRef, where("email", "==", email.toLowerCase()));
      const snapshot = await getDocs(emailQuery);
      if (!snapshot.empty) {
        toast.error("A user with this email already exists");
        return;
      }

      const adsToInvite =
        role === "Admin" ? adsAccounts.map((acc) => acc.id) : selectedAds;
      await inviteUser(email.trim(), role, name.trim(), adsToInvite);
      await refreshInvitations(userDoc["Company Admin"]);
      toast.success("Invitation sent successfully");
      resetForm();
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to send invitation";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ConsumerResponsiveModal
      open={open}
      onOpenChange={handleOpenChange}
      dismissible={!isSubmitting}
      dialogClassName="sm:max-w-2xl"
    >
      <ConsumerResponsiveModalHeader>
        <ConsumerResponsiveModalTitle>Add New User</ConsumerResponsiveModalTitle>
        <ConsumerResponsiveModalDescription>
          Invite a new teammate with account access.
        </ConsumerResponsiveModalDescription>
      </ConsumerResponsiveModalHeader>

      <ConsumerResponsiveModalBody>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium text-slate-700">Role</label>
          <div className="flex gap-2">
            {(["Admin", "Manager"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={cn(
                  "rounded-xl border px-4 py-2 text-sm font-medium",
                  role === value
                    ? "border-[#015AFD] bg-[#015AFD]/10 text-[#015AFD]"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {role === "Manager" ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Mail className="size-4 text-[#015AFD]" aria-hidden />
              <p className="text-sm font-semibold text-slate-800">
                Ad account access
              </p>
            </div>
            <Input
              value={adsSearch}
              onChange={(e) => setAdsSearch(e.target.value)}
              placeholder="Search ad accounts"
              className="mb-3 rounded-xl bg-white"
            />
            <div className="max-h-52 space-y-2 overflow-auto">
              {filteredAdsAccounts.map((acc) => (
                <label
                  key={acc.id}
                  className="flex items-center gap-3 rounded-lg bg-white px-3 py-2"
                >
                  <Checkbox
                    checked={selectedAds.includes(acc.id)}
                    onCheckedChange={() => handleToggleAd(acc.id)}
                    className={CHECKBOX_CLASS}
                  />
                  <span className="text-sm text-slate-700">{acc.name}</span>
                </label>
              ))}
              {filteredAdsAccounts.length === 0 ? (
                <p className="text-sm text-slate-500">No accounts found.</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </ConsumerResponsiveModalBody>

      <ConsumerResponsiveModalFooter>
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => handleOpenChange(false)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          className="gap-2 rounded-xl bg-[#015AFD] font-semibold hover:bg-[#0146ca]"
          onClick={handleCreateUser}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            <>
              <Plus className="size-4" aria-hidden />
              Send Invitation
            </>
          )}
        </Button>
      </ConsumerResponsiveModalFooter>
    </ConsumerResponsiveModal>
  );
}
