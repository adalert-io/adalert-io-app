"use client";

import Link from "next/link";
import { BarChart2, HelpCircle, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";

import {
  ConsumerAddAdsAccountDialog,
} from "./add-ads-account/ConsumerAddAdsAccountDialog";
import { useConsumerAddAdsAccountDialog } from "./add-ads-account/use-consumer-add-ads-account-dialog";

const ICON_BUTTON_CLASS =
  "size-9 shrink-0 rounded-lg text-[#015AFD] hover:bg-[#015AFD]/10";

export function ConsumerHeaderActions() {
  const { userDoc } = useAuthStore();
  const { isOpen, setIsOpen } = useConsumerAddAdsAccountDialog();
  const canAddAccount = userDoc?.["User Type"] !== "Manager";

  return (
    <>
      <div
        className="flex shrink-0 items-center gap-0.5 sm:gap-1"
        role="toolbar"
        aria-label="Quick actions"
      >
        {canAddAccount ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={ICON_BUTTON_CLASS}
            onClick={() => setIsOpen(true)}
            aria-label="Add ad account"
            title="Add ad account"
          >
            <Plus className="size-5" strokeWidth={2} aria-hidden />
          </Button>
        ) : null}

        <Button
          variant="ghost"
          size="icon"
          className={ICON_BUTTON_CLASS}
          asChild
          title="Mission Control"
        >
          <Link href="/consumer/summary" aria-label="Mission Control">
            <BarChart2 className="size-5" strokeWidth={2} aria-hidden />
          </Link>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(ICON_BUTTON_CLASS, "cursor-default opacity-70")}
          disabled
          aria-label="Help"
          title="Help (coming soon)"
        >
          <HelpCircle className="size-5" strokeWidth={2} aria-hidden />
        </Button>
      </div>

      {canAddAccount ? (
        <ConsumerAddAdsAccountDialog open={isOpen} onOpenChange={setIsOpen} />
      ) : null}
    </>
  );
}
