"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import { GoogleAdsMark } from "@/components/GoogleAdsMark";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { consumerPathForClassicRoute } from "@/lib/consumer-shell-preference";
import { useAuthStore } from "@/lib/store/auth-store";
import type { AdsAccount } from "@/lib/store/user-ads-accounts-store";
import { useUserAdsAccountsStore } from "@/lib/store/user-ads-accounts-store";
import { cn, formatAccountNumber } from "@/lib/utils";

function accountDisplayName(account: AdsAccount): string {
  return (
    account["Account Name Editable"] ||
    account["Account Name Original"] ||
    account.name ||
    "Ad account"
  );
}

function accountNumber(account: AdsAccount): string {
  return formatAccountNumber(account.Id || account.id || "");
}

interface ConsumerAdsAccountSwitcherProps {
  variant?: "sidebar" | "header";
}

export function ConsumerAdsAccountSwitcher({
  variant = "sidebar",
}: ConsumerAdsAccountSwitcherProps) {
  const isHeader = variant === "header";
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { userDoc } = useAuthStore();
  const {
    userAdsAccounts,
    selectedAdsAccount,
    setSelectedAdsAccount,
    fetchUserAdsAccounts,
    loading,
  } = useUserAdsAccountsStore();
  const [open, setOpen] = useState(false);

  const connectedCount = userAdsAccounts.length;

  useEffect(() => {
    if (userDoc && !loading && connectedCount === 0) {
      void fetchUserAdsAccounts(userDoc);
    }
  }, [userDoc, loading, connectedCount, fetchUserAdsAccounts]);

  const activeAccount = useMemo(() => {
    if (selectedAdsAccount) {
      return selectedAdsAccount;
    }
    if (connectedCount === 1) {
      return userAdsAccounts[0] ?? null;
    }
    return null;
  }, [selectedAdsAccount, connectedCount, userAdsAccounts]);

  const handleSelectAccount = (account: AdsAccount) => {
    const isNewSelection =
      !selectedAdsAccount || selectedAdsAccount.id !== account.id;
    setSelectedAdsAccount(account);
    setOpen(false);

    const dashboardPath = consumerPathForClassicRoute("/dashboard");
    if (isNewSelection || !pathname.startsWith(dashboardPath)) {
      router.push(dashboardPath);
    }
  };

  if (!userDoc) {
    return null;
  }

  if (loading && connectedCount === 0) {
    return (
      <div
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-[13px]",
          isHeader
            ? "border-slate-200 bg-white text-slate-500 shadow-sm"
            : "border-white/[0.08] bg-[#111b32] text-[#94a3b8]",
        )}
      >
        <Loader2 className="size-4 shrink-0 animate-spin text-[#015AFD]" aria-hidden />
        <span>Loading accounts…</span>
      </div>
    );
  }

  if (connectedCount === 0) {
    return (
      <div
        className={cn(
          "w-full rounded-xl border border-dashed px-3 py-2.5 text-[12px] leading-snug",
          isHeader
            ? "border-slate-200 bg-slate-50 text-slate-600"
            : "border-white/[0.12] bg-[#111b32]/80 text-[#94a3b8]",
        )}
      >
        No connected ad accounts yet.{" "}
        <Link
          href="/add-ads-account"
          className={cn(
            "font-semibold hover:underline",
            isHeader
              ? "text-[#015AFD] hover:text-[#0146ca]"
              : "text-[#60a5fa] hover:text-[#93c5fd]",
          )}
        >
          Connect one
        </Link>
      </div>
    );
  }

  const triggerLabel = activeAccount
    ? accountDisplayName(activeAccount)
    : "Select ad account";
  const triggerSub = activeAccount
    ? accountNumber(activeAccount)
    : connectedCount > 1
      ? `${connectedCount} connected accounts`
      : "";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Switch ad account"
          className={cn(
            "group flex w-full items-center gap-2.5 rounded-xl border px-3 text-left outline-none transition-colors",
            isHeader ? "py-2" : "py-2.5",
            isHeader
              ? "border-slate-200 bg-white shadow-sm hover:border-[#015AFD]/30 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#015AFD]/25"
              : "border-white/[0.1] bg-[#111b32] hover:border-[#3b82f6]/40 hover:bg-[#152542] focus-visible:ring-2 focus-visible:ring-[#3b82f6]",
            open &&
              (isHeader
                ? "border-[#015AFD]/40 bg-blue-50/50 ring-2 ring-[#015AFD]/20"
                : "border-[#3b82f6]/50 bg-[#152542] ring-2 ring-[#3b82f6]/30"),
          )}
        >
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              isHeader ? "bg-slate-100" : "bg-white/[0.06]",
            )}
          >
            <GoogleAdsMark className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate text-[13px] font-semibold leading-tight",
                isHeader ? "text-slate-900" : "text-white",
              )}
            >
              {triggerLabel}
            </span>
            {triggerSub ? (
              <span
                className={cn(
                  "mt-0.5 block truncate text-[11px] font-medium tabular-nums",
                  isHeader
                    ? "text-slate-500 group-hover:text-slate-600"
                    : "text-[#64748b] group-hover:text-[#94a3b8]",
                )}
              >
                {triggerSub}
              </span>
            ) : null}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 transition-transform duration-200",
              isHeader ? "text-slate-400" : "text-[#64748b]",
              open && (isHeader ? "rotate-180 text-[#015AFD]" : "rotate-180 text-[#94a3b8]"),
              !open && "rotate-0",
            )}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[240px] max-w-[280px] border-slate-200/90 p-1.5 shadow-xl"
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Switch workspace
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
        <div className="max-h-[min(280px,50vh)] overflow-y-auto">
          {userAdsAccounts.map((account) => {
            const isSelected = activeAccount?.id === account.id;
            const name = accountDisplayName(account);
            const number = accountNumber(account);

            return (
              <DropdownMenuItem
                key={account.id}
                className={cn(
                  "cursor-pointer gap-3 rounded-lg px-2 py-2.5 focus:bg-slate-100",
                  isSelected && "bg-blue-50/90 focus:bg-blue-50",
                )}
                onSelect={() => handleSelectAccount(account)}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                    isSelected
                      ? "border-[#3b82f6]/30 bg-[#3b82f6]/10"
                      : "border-slate-200 bg-slate-50",
                  )}
                >
                  <GoogleAdsMark className="size-4" muted={!isSelected} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-[13px] font-semibold leading-tight",
                      isSelected ? "text-[#015AFD]" : "text-slate-900",
                    )}
                  >
                    {name}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] tabular-nums text-slate-500">
                    {number}
                  </span>
                </span>
                {isSelected ? (
                  <Check className="size-4 shrink-0 text-[#015AFD]" aria-hidden />
                ) : (
                  <span className="size-4 shrink-0" aria-hidden />
                )}
              </DropdownMenuItem>
            );
          })}
        </div>
        {connectedCount > 1 ? (
          <>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2 py-2 text-[12px] text-slate-600">
              <Link href="/consumer/summary" className="w-full">
                View all accounts on Summary
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
