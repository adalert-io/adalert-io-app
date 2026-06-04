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

export function ConsumerShowingAdsBadge({
  status,
  className,
  compact = false,
  fullWidth = false,
}: {
  status: ShowingAdsDisplayStatus;
  className?: string;
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const sharedClass = cn(
    fullWidth &&
      "flex w-full justify-center rounded-lg px-3 py-1 text-[12px] font-semibold",
    compact && !fullWidth && "text-[10px]",
    className,
  );

  if (status === "checking") {
    return (
      <Badge variant="secondary" className={sharedClass}>
        Checking ads status
      </Badge>
    );
  }
  if (status === "showing") {
    return (
      <Badge variant="success" className={sharedClass}>
        Showing ads
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className={sharedClass}>
      Not showing ads
    </Badge>
  );
}
