"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ShowingAdsDisplayStatus = "checking" | "showing" | "not_showing";

export function showingAdsStatusFromLabel(
  adsLabel: { "Is Showing Ads"?: boolean } | null | undefined,
): ShowingAdsDisplayStatus {
  if (!adsLabel) return "checking";
  return adsLabel["Is Showing Ads"] ? "showing" : "not_showing";
}

const SWITCHER_LABELS: Record<ShowingAdsDisplayStatus, string> = {
  checking: "Checking",
  showing: "Showing",
  not_showing: "Not showing",
};

export function ConsumerShowingAdsBadge({
  status,
  className,
  compact = false,
  fullWidth = false,
  inline = false,
}: {
  status: ShowingAdsDisplayStatus;
  className?: string;
  compact?: boolean;
  fullWidth?: boolean;
  /** Compact pill above account switcher chevron (mobile dashboard). */
  inline?: boolean;
}) {
  const sharedClass = cn(
    fullWidth &&
      "flex w-full justify-center rounded-lg px-3 py-1 text-[12px] font-semibold",
    inline &&
      "shrink-0 whitespace-nowrap rounded-md px-1.5 py-0 text-[9px] font-semibold leading-tight",
    compact && !fullWidth && !inline && "text-[10px]",
    className,
  );

  const label = inline
    ? SWITCHER_LABELS[status]
    : status === "checking"
      ? "Checking ads status"
      : status === "showing"
        ? "Showing ads"
        : "Not showing ads";

  if (status === "checking") {
    return (
      <Badge variant="secondary" className={sharedClass}>
        {label}
      </Badge>
    );
  }
  if (status === "showing") {
    return (
      <Badge variant="success" className={sharedClass}>
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className={sharedClass}>
      {label}
    </Badge>
  );
}
