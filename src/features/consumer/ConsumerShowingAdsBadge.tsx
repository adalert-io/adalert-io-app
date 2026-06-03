"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ShowingAdsDisplayStatus = "checking" | "showing" | "not_showing";

export function showingAdsStatusFromLabel(
  adsLabel: { "Is Showing Ads"?: boolean } | null | undefined,
): ShowingAdsDisplayStatus | null {
  if (!adsLabel) return "checking";
  return adsLabel["Is Showing Ads"] ? "showing" : "not_showing";
}

export function ConsumerShowingAdsBadge({
  status,
  className,
  compact = false,
}: {
  status: ShowingAdsDisplayStatus;
  className?: string;
  compact?: boolean;
}) {
  if (status === "checking") {
    return (
      <Badge variant="secondary" className={cn(compact && "text-[10px]", className)}>
        Checking ads status
      </Badge>
    );
  }
  if (status === "showing") {
    return (
      <Badge variant="success" className={cn(compact && "text-[10px]", className)}>
        Showing ads
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className={cn(compact && "text-[10px]", className)}>
      Not showing ads
    </Badge>
  );
}
