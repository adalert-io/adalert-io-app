"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart2,
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Search,
} from "lucide-react";

import { GoogleAdsMark } from "@/components/GoogleAdsMark";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ConsumerAddAdsAccountDialog,
} from "@/features/consumer/add-ads-account/ConsumerAddAdsAccountDialog";
import { useConsumerAddAdsAccountDialog } from "@/features/consumer/add-ads-account/use-consumer-add-ads-account-dialog";
import {
  CONSUMER_MISSION_CONTROL_HREF,
  isConsumerDashboardPath,
} from "@/features/consumer/consumer-console-nav";
import { CONSUMER_BILLING_HREF } from "@/features/consumer/consumer-subscription-access";
import { consumerPathForClassicRoute } from "@/lib/consumer-shell-preference";
import {
  ConsumerShowingAdsBadge,
  showingAdsStatusFromLabel,
} from "@/features/consumer/ConsumerShowingAdsBadge";
import { useAuthStore } from "@/lib/store/auth-store";
import { useDashboardStore } from "@/lib/store/dashboard-store";
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
  isSubscriptionExpired?: boolean;
}

export function ConsumerAdsAccountSwitcher({
  variant = "sidebar",
  isSubscriptionExpired = false,
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
  const [searchQuery, setSearchQuery] = useState("");
  const { isOpen: isAddAccountOpen, setIsOpen: setIsAddAccountOpen } =
    useConsumerAddAdsAccountDialog();
  const canAddAccount = userDoc?.["User Type"] !== "Manager";

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearchQuery("");
    }
  };

  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return userAdsAccounts;
    }
    return userAdsAccounts.filter((account) => {
      const name = accountDisplayName(account).toLowerCase();
      const number = accountNumber(account).toLowerCase();
      return name.includes(query) || number.includes(query);
    });
  }, [userAdsAccounts, searchQuery]);

  const connectedCount = userAdsAccounts.length;

  useEffect(() => {
    if (isSubscriptionExpired) {
      return;
    }
    if (userDoc && !loading && connectedCount === 0) {
      void fetchUserAdsAccounts(userDoc);
    }
  }, [userDoc, loading, connectedCount, fetchUserAdsAccounts, isSubscriptionExpired]);

  const isOnDashboard = isConsumerDashboardPath(pathname);
  const adsLabel = useDashboardStore((s) => s.adsLabel);
  const selectedShowingAdsStatus = isOnDashboard
    ? showingAdsStatusFromLabel(adsLabel)
    : null;

  const activeAccount = useMemo(() => {
    if (!isOnDashboard) {
      if (connectedCount === 1) {
        return userAdsAccounts[0] ?? null;
      }
      return null;
    }
    if (selectedAdsAccount) {
      return selectedAdsAccount;
    }
    if (connectedCount === 1) {
      return userAdsAccounts[0] ?? null;
    }
    return null;
  }, [isOnDashboard, selectedAdsAccount, connectedCount, userAdsAccounts]);

  const highlightedAccountId =
    isOnDashboard && selectedAdsAccount
      ? selectedAdsAccount.id
      : null;

  const handleSelectAccount = (account: AdsAccount) => {
    if (isSubscriptionExpired) return;

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

  if (isSubscriptionExpired && connectedCount === 0) {
    return (
      <div
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-[13px]",
          isHeader
            ? "border-amber-200/80 bg-amber-50 text-amber-800"
            : "border-amber-300/20 bg-amber-400/10 text-amber-200",
        )}
        title="Trial expired. Upgrade on Billing to reconnect and switch ad accounts."
      >
        <span className="inline-flex size-2.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
        <span className="font-medium">Trial expired</span>
      </div>
    );
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
        <button
          type="button"
          onClick={() => setIsAddAccountOpen(true)}
          className={cn(
            "font-semibold hover:underline",
            isHeader
              ? "text-[#015AFD] hover:text-[#0146ca]"
              : "text-[#60a5fa] hover:text-[#93c5fd]",
          )}
        >
          Connect one
        </button>
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

  const triggerButton = (
    <button
      type="button"
      aria-label="Switch ad account"
      disabled={isSubscriptionExpired}
      title={
        isSubscriptionExpired
          ? "Subscription expired. Please renew on the billing page."
          : "Switch ad account"
      }
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-xl border px-3 text-left outline-none transition-colors",
        isHeader ? "py-2" : "py-2.5",
        isSubscriptionExpired && "cursor-not-allowed opacity-50",
        isHeader
          ? "border-slate-200 bg-white shadow-sm hover:border-[#015AFD]/30 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#015AFD]/25"
          : "border-white/[0.1] bg-[#111b32] hover:border-[#3b82f6]/40 hover:bg-[#152542] focus-visible:ring-2 focus-visible:ring-[#3b82f6]",
        !isSubscriptionExpired &&
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
            {isOnDashboard && selectedShowingAdsStatus && isHeader ? (
              <span className="mt-1.5 flex">
                <ConsumerShowingAdsBadge
                  status={selectedShowingAdsStatus}
                  compact
                />
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
  );

  const showMobileDashboardBack = isOnDashboard && isHeader;
  const mobileBackHref = isSubscriptionExpired
    ? CONSUMER_BILLING_HREF
    : CONSUMER_MISSION_CONTROL_HREF;

  return (
    <div
      className={cn(
        showMobileDashboardBack && "flex w-full items-stretch gap-2 lg:block",
      )}
    >
      {showMobileDashboardBack ? (
        <Link
          href={mobileBackHref}
          className="flex size-10 shrink-0 items-center justify-center self-center rounded-xl border border-slate-200 bg-white text-[#015AFD] shadow-sm transition-colors hover:border-[#015AFD]/30 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#015AFD]/25 lg:hidden"
          aria-label={
            isSubscriptionExpired
              ? "Back to billing"
              : "Back to Mission Control"
          }
        >
          <ArrowLeft className="size-5" strokeWidth={2} aria-hidden />
        </Link>
      ) : null}

      <div className={cn(showMobileDashboardBack && "min-w-0 flex-1")}>
      <DropdownMenu
        open={isSubscriptionExpired ? false : open}
        onOpenChange={(next) => {
          if (!isSubscriptionExpired) handleOpenChange(next);
        }}
      >
      <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[240px] max-w-[280px] border-slate-200/90 p-1.5 shadow-xl"
      >
        <div
          className="mx-1.5 mb-1.5 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2"
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("input")) {
              return;
            }
            e.preventDefault();
          }}
        >
          <Search className="size-4 shrink-0 text-[#015AFD]" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ad accounts"
            aria-label="Search ad accounts"
            autoFocus={open}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>
        <DropdownMenuSeparator className="my-1" />
        <div className="max-h-[min(280px,50vh)] overflow-y-auto">
          {filteredAccounts.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12px] text-slate-500">
              No accounts match your search.
            </p>
          ) : null}
          {filteredAccounts.map((account) => {
            const isSelected = highlightedAccountId === account.id;
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
                  {isOnDashboard && isSelected && selectedShowingAdsStatus ? (
                    <span className="mt-1.5">
                      <ConsumerShowingAdsBadge
                        status={selectedShowingAdsStatus}
                        compact
                      />
                    </span>
                  ) : null}
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
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          asChild
          className="cursor-pointer gap-3 rounded-lg px-2 py-2.5 focus:bg-slate-100"
        >
          <Link
            href="/consumer/summary"
            className="flex w-full items-center gap-3"
            onClick={() => setOpen(false)}
          >
            <BarChart2
              className="size-4 shrink-0 text-[#015AFD]"
              strokeWidth={2}
              aria-hidden
            />
            <span className="text-[13px] font-medium text-slate-700">
              View all accounts
            </span>
          </Link>
        </DropdownMenuItem>
        {canAddAccount && !isSubscriptionExpired ? (
          <DropdownMenuItem
            className="cursor-pointer gap-3 rounded-lg px-2 py-2.5 focus:bg-slate-100"
            onSelect={() => {
              setOpen(false);
              setIsAddAccountOpen(true);
            }}
          >
            <Plus
              className="size-4 shrink-0 text-[#015AFD]"
              strokeWidth={2}
              aria-hidden
            />
            <span className="text-[13px] font-medium text-slate-700">
              Add another ad account
            </span>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
      {canAddAccount ? (
        <ConsumerAddAdsAccountDialog
          open={isAddAccountOpen}
          onOpenChange={setIsAddAccountOpen}
        />
      ) : null}
    </DropdownMenu>
      </div>
    </div>
  );
}
