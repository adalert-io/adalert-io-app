"use client";

import { Plus } from "lucide-react";

import { AddAdsAccountFlow } from "@/app/add-ads-account/AddAdsAccountFlow";
import { useSummaryStore } from "@/app/summary/summary-store";
import { Button } from "@/components/ui/button";
import {
  ConsumerResponsiveModal,
  ConsumerResponsiveModalBody,
  ConsumerResponsiveModalHeader,
  ConsumerResponsiveModalTitle,
} from "@/features/consumer/ConsumerResponsiveModal";
import { useAuthStore } from "@/lib/store/auth-store";
import { useUserAdsAccountsStore } from "@/lib/store/user-ads-accounts-store";
import { cn } from "@/lib/utils";

export const CONSUMER_ADD_ACCOUNT_QUERY = "addAccount";

interface ConsumerAddAdsAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsumerAddAdsAccountDialog({
  open,
  onOpenChange,
}: ConsumerAddAdsAccountDialogProps) {
  const { userDoc } = useAuthStore();
  const fetchSummaryAccounts = useSummaryStore((s) => s.fetchSummaryAccounts);
  const fetchUserAdsAccounts = useUserAdsAccountsStore(
    (s) => s.fetchUserAdsAccounts,
  );

  const handleSuccess = async () => {
    onOpenChange(false);
    if (!userDoc) return;
    await Promise.all([
      fetchUserAdsAccounts(userDoc),
      fetchSummaryAccounts(userDoc),
    ]);
  };

  return (
    <ConsumerResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      overlayClassName="bg-slate-900/40 backdrop-blur-md"
      dialogClassName="max-w-2xl sm:rounded-2xl"
      drawerClassName="max-h-[min(90dvh,720px)]"
    >
      <ConsumerResponsiveModalHeader>
        <ConsumerResponsiveModalTitle>Add ad account</ConsumerResponsiveModalTitle>
      </ConsumerResponsiveModalHeader>
      <ConsumerResponsiveModalBody>
        <AddAdsAccountFlow
          oauthContext="consumer"
          onSuccess={() => {
            void handleSuccess();
          }}
        />
      </ConsumerResponsiveModalBody>
    </ConsumerResponsiveModal>
  );
}

interface ConsumerAddAdsAccountTriggerProps {
  onClick: () => void;
  className?: string;
}

export function ConsumerAddAdsAccountTrigger({
  onClick,
  className,
}: ConsumerAddAdsAccountTriggerProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={cn(
        "gap-2 rounded-xl bg-[#015AFD] px-4 font-semibold text-white shadow-sm hover:bg-[#0146ca]",
        className,
      )}
    >
      <Plus className="size-4 shrink-0" aria-hidden />
      <span className="hidden sm:inline">Add ad account</span>
      <span className="sr-only sm:hidden">Add ad account</span>
    </Button>
  );
}
