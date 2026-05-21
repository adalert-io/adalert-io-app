"use client";

import * as React from "react";
import { Calendar1Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import moment from "moment";

import { useAuthStore } from "@/lib/store/auth-store";
import { SUBSCRIPTION_PERIODS, SUBSCRIPTION_STATUS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ConsumerFreeTrialBannerProps {
  upgradeHref: string;
  className?: string;
}

function useTrialDaysLeft() {
  const { subscription } = useAuthStore();

  return React.useMemo(() => {
    if (!subscription) return { trialDaysLeft: 0, isTrialUser: false };

    const status = subscription["User Status"];
    const isTrialUser =
      status === SUBSCRIPTION_STATUS.TRIAL_NEW ||
      status === SUBSCRIPTION_STATUS.TRIAL_ENDED;

    if (!isTrialUser) {
      return { trialDaysLeft: 0, isTrialUser: false };
    }

    const trialStartDate = subscription["Free Trial Start Date"]?.toDate?.();
    if (!trialStartDate) {
      return { trialDaysLeft: 0, isTrialUser: true };
    }

    const trialEndDate = moment(trialStartDate).add(
      SUBSCRIPTION_PERIODS.TRIAL_DAYS,
      "days",
    );
    const now = moment();
    const trialDaysLeft = Math.max(
      0,
      Math.ceil(trialEndDate.diff(now, "days", true)),
    );

    return { trialDaysLeft, isTrialUser: true };
  }, [subscription]);
}

export function ConsumerFreeTrialBanner({
  upgradeHref,
  className,
}: ConsumerFreeTrialBannerProps) {
  const router = useRouter();
  const { trialDaysLeft, isTrialUser } = useTrialDaysLeft();

  if (!isTrialUser) {
    return null;
  }

  const handleUpgrade = () => {
    router.push(upgradeHref);
  };

  const mobileStatusText =
    trialDaysLeft > 0
      ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`
      : "Trial ended";

  return (
    <div
      className={cn(
        "w-full shrink-0 bg-[#FFEBEE] px-3 py-2 sm:px-4 md:px-6 lg:px-8",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {/* Mobile: single compact row */}
      <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-2 lg:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Calendar1Icon
            className="size-3.5 shrink-0 text-gray-900"
            aria-hidden
          />
          <p className="truncate text-[12px] font-semibold leading-none text-gray-900">
            <span className="sr-only">Free trial: </span>
            {mobileStatusText}
          </p>
        </div>
        <button
          type="button"
          onClick={handleUpgrade}
          className="shrink-0 cursor-pointer rounded-[5px] border-0 bg-[#da486b] px-2.5 py-1 text-[11px] font-semibold leading-none text-white transition-colors hover:bg-black"
        >
          Upgrade
        </button>
      </div>

      {/* Desktop: full message (matches classic banner) */}
      <div className="mx-auto hidden max-w-[1480px] flex-wrap items-center justify-center gap-x-1 gap-y-2 text-center lg:flex">
        <span className="text-[13px] text-gray-900">
          <Calendar1Icon className="mb-1 mr-1 inline size-4" aria-hidden />
          {trialDaysLeft > 0 ? (
            <>You&apos;re on a free trial with </>
          ) : (
            <>Your free trial has ended. </>
          )}
        </span>
        {trialDaysLeft > 0 ? (
          <span className="text-[13px] font-bold text-gray-900">
            {trialDaysLeft} days left.
          </span>
        ) : null}
        <span className="text-[13px] text-gray-900">
          {" "}
          Upgrade for 24/7 monitoring and peace of mind!
        </span>
        <button
          type="button"
          onClick={handleUpgrade}
          className="ml-0 cursor-pointer rounded-[5px] border bg-[#da486b] px-3 py-1 text-[12px] font-medium text-white transition-colors hover:bg-black sm:ml-3"
        >
          Upgrade Now
        </button>
      </div>
    </div>
  );
}
