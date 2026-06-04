"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2, Mail, UserCircle, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ConsumerResponsiveModal,
  ConsumerResponsiveModalBody,
  ConsumerResponsiveModalDescription,
  ConsumerResponsiveModalFooter,
  ConsumerResponsiveModalHeader,
  ConsumerResponsiveModalTitle,
} from "@/features/consumer/ConsumerResponsiveModal";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/store/auth-store";
import { useAlertSettingsStore } from "@/lib/store/settings-store";
import { cn } from "@/lib/utils";

const CHECKBOX_CLASS =
  "data-[state=checked]:bg-[#015AFD] data-[state=checked]:border-[#015AFD]";

interface EditingUserRecord {
  id: string;
  email?: string;
  Name?: string;
  "User Type"?: string;
  Avatar?: string;
  NotifyUser?: boolean;
  "Is Google Sign Up"?: boolean;
}

interface ConsumerEditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: EditingUserRecord | null;
  onUpdated?: () => void;
}

export function ConsumerEditUserDialog({
  open,
  onOpenChange,
  user,
  onUpdated,
}: ConsumerEditUserDialogProps) {
  const { userDoc } = useAuthStore();
  const { adsAccounts, updateUser, refreshUsers, refreshInvitations } =
    useAlertSettingsStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"Admin" | "Manager">("Admin");
  const [selectedAds, setSelectedAds] = useState<string[]>([]);
  const [adsSearch, setAdsSearch] = useState("");
  const [notifyUser, setNotifyUser] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isCurrentUserSuperAdmin =
    !!userDoc && userDoc["Company Admin"]?.id === userDoc.uid;
  const isEditingTargetSuperAdmin =
    !!user && userDoc?.["Company Admin"]?.id === user.id;
  const isRoleDisabled =
    (!isCurrentUserSuperAdmin && user?.id === userDoc?.uid) ||
    (!isCurrentUserSuperAdmin && isEditingTargetSuperAdmin);
  const isNameDisabled =
    user?.["Is Google Sign Up"] === true && userDoc?.uid !== user?.id;
  const isAvatarUploadDisabled =
    user?.["Is Google Sign Up"] === true && userDoc?.uid !== user?.id;

  const doesUserHaveAccessToAccount = useCallback(
    (account: { id: string; "Selected Users"?: { id?: string; path?: string }[] }, userId: string) => {
      if (!account["Selected Users"]) return false;
      return account["Selected Users"].some(
        (userRef) => userRef.path?.includes(userId) || userRef.id === userId,
      );
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    if (!open || !user) return;

    setName(user.Name || "");
    setEmail(user.email || "");
    setRole((user["User Type"] as "Admin" | "Manager") || "Admin");
    setNotifyUser(!!user.NotifyUser);
    setAdsSearch("");
    setAvatarFile(null);
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    const linked = adsAccounts
      .filter((account) => doesUserHaveAccessToAccount(account, user.id))
      .map((account) => account.id);
    setSelectedAds(linked);
  }, [open, user, adsAccounts, doesUserHaveAccessToAccount]);

  const filteredAdsAccounts = useMemo(() => {
    const q = adsSearch.trim().toLowerCase();
    if (!q) return adsAccounts;
    return adsAccounts.filter((a) => String(a.name || "").toLowerCase().includes(q));
  }, [adsAccounts, adsSearch]);

  const handleToggleAd = (id: string) => {
    setSelectedAds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleAvatarClick = () => {
    if (!isAvatarUploadDisabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarFile(file);
  };

  const handleSave = async () => {
    if (!user || !userDoc?.["Company Admin"] || isSaving) return;

    if (
      userDoc["Company Admin"]?.id &&
      user.id === userDoc["Company Admin"].id &&
      role !== "Admin"
    ) {
      toast.error("The super admin cannot be demoted.");
      return;
    }

    setIsSaving(true);
    try {
      const adsToSave =
        role === "Admin" ? adsAccounts.map((account) => account.id) : selectedAds;

      await updateUser(
        user.id,
        {
          Name: name.trim(),
          "User Type": role,
          avatarFile,
          currentAvatarUrl: user.Avatar,
        },
        notifyUser,
        user,
        adsToSave,
      );
      await Promise.all([
        refreshUsers(userDoc["Company Admin"]),
        refreshInvitations(userDoc["Company Admin"]),
      ]);
      toast.success("User updated successfully");
      onOpenChange(false);
      onUpdated?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update user";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const avatarSrc = avatarPreview || user?.Avatar || "/images/default-avatar.png";

  return (
    <ConsumerResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      dismissible={!isSaving}
      dialogClassName="max-w-2xl rounded-2xl border-slate-200"
    >
      <ConsumerResponsiveModalHeader>
        <ConsumerResponsiveModalTitle>Edit user</ConsumerResponsiveModalTitle>
        <ConsumerResponsiveModalDescription>
          Update profile, role, and ad account access for this teammate.
        </ConsumerResponsiveModalDescription>
      </ConsumerResponsiveModalHeader>

      <ConsumerResponsiveModalBody>
          <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <div className="size-24 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-50">
                <img
                  src={avatarSrc}
                  alt={name || "User avatar"}
                  className="size-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/images/default-avatar.png";
                  }}
                />
              </div>
              <button
                type="button"
                className={cn(
                  "absolute -bottom-1 left-1/2 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-slate-100 shadow-md",
                  isAvatarUploadDisabled
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-slate-200",
                )}
                onClick={handleAvatarClick}
                disabled={isAvatarUploadDisabled}
                aria-label="Change avatar"
              >
                <Camera className="size-4 text-[#015AFD]" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={isAvatarUploadDisabled}
              />
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-start">
              <p className="truncate text-base font-semibold text-slate-900">
                {name || email || "User"}
              </p>
              <p className="truncate text-sm text-slate-500">{email}</p>
              {isAvatarUploadDisabled ? (
                <p className="mt-1 text-xs text-slate-500">
                  Avatar is managed by Google sign-in for this user.
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Name</label>
              <div className="relative">
                <UserCircle
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#015AFD]"
                  aria-hidden
                />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="rounded-xl pl-10"
                  disabled={isNameDisabled}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <Input
                  value={email}
                  readOnly
                  disabled
                  className="rounded-xl bg-slate-50 pl-10 text-slate-600"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium text-slate-700">Role</label>
            <div className="flex flex-wrap gap-2">
              {(["Admin", "Manager"] as const).map((value) => {
                const isSuperAdminTarget =
                  isEditingTargetSuperAdmin && value === "Manager";
                const isDisabled =
                  isRoleDisabled || isSuperAdminTarget;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setRole(value)}
                    className={cn(
                      "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                      role === value
                        ? "border-[#015AFD] bg-[#015AFD]/10 text-[#015AFD]"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50",
                      isDisabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
            {isEditingTargetSuperAdmin ? (
              <p className="text-xs text-slate-500">
                The super admin role cannot be changed.
              </p>
            ) : null}
            {isRoleDisabled && !isEditingTargetSuperAdmin ? (
              <p className="text-xs text-slate-500">You cannot change your own role.</p>
            ) : null}
          </div>

          {role === "Manager" ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-[#015AFD]" aria-hidden />
                  <p className="text-sm font-semibold text-slate-800">Ad account access</p>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {selectedAds.length}/{adsAccounts.length} selected
                </span>
              </div>
              <Input
                value={adsSearch}
                onChange={(e) => setAdsSearch(e.target.value)}
                placeholder="Search ad accounts"
                className="mb-3 rounded-xl bg-white"
              />
              <div className="mb-2 flex gap-3 text-xs font-medium text-[#015AFD]">
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() => setSelectedAds(filteredAdsAccounts.map((a) => a.id))}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() => setSelectedAds([])}
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-48 space-y-2 overflow-auto">
                {filteredAdsAccounts.map((acc) => (
                  <label
                    key={acc.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg bg-white px-3 py-2"
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
          ) : (
            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-600">
              Admins have access to all ad accounts.
            </p>
          )}

          <label className="mt-4 flex cursor-pointer items-center gap-2.5">
            <Checkbox
              id="consumer-edit-notify-user"
              checked={notifyUser}
              onCheckedChange={(checked) => setNotifyUser(checked === true)}
              className={CHECKBOX_CLASS}
            />
            <span className="text-sm text-slate-700">Notify the user about this update</span>
          </label>
      </ConsumerResponsiveModalBody>

      <ConsumerResponsiveModalFooter>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={() => onOpenChange(false)}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className="rounded-xl bg-[#015AFD] font-semibold hover:bg-[#0146ca]"
          onClick={handleSave}
          disabled={isSaving || !name.trim()}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </ConsumerResponsiveModalFooter>
    </ConsumerResponsiveModal>
  );
}
