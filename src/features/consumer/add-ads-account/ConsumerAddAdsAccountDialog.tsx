"use client";

import { Plus } from "lucide-react";

import { AddAdsAccountFlow } from "@/app/add-ads-account/AddAdsAccountFlow";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSummaryStore } from "@/app/summary/summary-store";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        overlayClassName="bg-slate-900/40 backdrop-blur-md"
        className="max-h-[min(90vh,880px)] max-w-2xl gap-0 overflow-y-auto p-0 sm:rounded-2xl"
      >
        <DialogHeader className="border-b border-slate-100 px-6 py-5 text-start">
          <DialogTitle className="text-xl font-bold text-slate-900">
            Add ad account
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 py-6">
          <AddAdsAccountFlow
            oauthContext="consumer"
            onSuccess={() => {
              void handleSuccess();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
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
      <Plus className="size-4" aria-hidden />
      Add ad account
    </Button>
  );
}
