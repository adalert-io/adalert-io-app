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
import { CONSUMER_SUBSCRIPTION_EXPIRED_NAV_TITLE } from "./consumer-subscription-access";
import { CONSUMER_HELP_HREF } from "./help";
import { CONSUMER_MISSION_CONTROL_HREF } from "./consumer-console-nav";

const ICON_BUTTON_CLASS =
  "size-9 shrink-0 rounded-lg text-[#015AFD] hover:bg-[#015AFD]/10";

interface ConsumerHeaderActionsProps {
  isSubscriptionExpired?: boolean;
}

export function ConsumerHeaderActions({
  isSubscriptionExpired = false,
}: ConsumerHeaderActionsProps) {
  const { userDoc } = useAuthStore();
  const { isOpen, setIsOpen } = useConsumerAddAdsAccountDialog();
  const canAddAccount = userDoc?.["User Type"] !== "Manager";

  const expiredClass = "cursor-not-allowed opacity-50";

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
            className={cn(ICON_BUTTON_CLASS, isSubscriptionExpired && expiredClass)}
            onClick={() => {
              if (!isSubscriptionExpired) setIsOpen(true);
            }}
            disabled={isSubscriptionExpired}
            aria-label="Add ad account"
            title={
              isSubscriptionExpired
                ? CONSUMER_SUBSCRIPTION_EXPIRED_NAV_TITLE
                : "Add ad account"
            }
          >
            <Plus className="size-5" strokeWidth={2} aria-hidden />
          </Button>
        ) : null}

        {isSubscriptionExpired ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(ICON_BUTTON_CLASS, expiredClass)}
            disabled
            aria-label="Mission Control"
            title={CONSUMER_SUBSCRIPTION_EXPIRED_NAV_TITLE}
          >
            <BarChart2 className="size-5" strokeWidth={2} aria-hidden />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className={ICON_BUTTON_CLASS}
            asChild
            title="Mission Control"
          >
            <Link href={CONSUMER_MISSION_CONTROL_HREF} aria-label="Mission Control">
              <BarChart2 className="size-5" strokeWidth={2} aria-hidden />
            </Link>
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className={ICON_BUTTON_CLASS}
          asChild
          title="Help center"
        >
          <Link href={CONSUMER_HELP_HREF} aria-label="Help center">
            <HelpCircle className="size-5" strokeWidth={2} aria-hidden />
          </Link>
        </Button>
      </div>

      {canAddAccount && !isSubscriptionExpired ? (
        <ConsumerAddAdsAccountDialog open={isOpen} onOpenChange={setIsOpen} />
      ) : null}
    </>
  );
}
