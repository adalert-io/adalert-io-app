import type { LucideIcon } from "lucide-react";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";

import { ALERT_SEVERITIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function getAlertSeverityKey(severity: string | undefined): "critical" | "medium" | "low" {
  const lower = severity?.toLowerCase() ?? "";
  if (lower === ALERT_SEVERITIES.CRITICAL.toLowerCase()) return "critical";
  if (lower === ALERT_SEVERITIES.MEDIUM.toLowerCase()) return "medium";
  return "low";
}

export function SeverityBadge({ severity }: { severity?: string }) {
  const key = getAlertSeverityKey(severity);

  if (key === "critical") {
    return (
      <span className="inline-flex rounded-full bg-[#ef4444]/12 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#b91c1c] ring-1 ring-[#fecaca]/80">
        Critical
      </span>
    );
  }
  if (key === "medium") {
    return (
      <span className="inline-flex rounded-full bg-orange-400/16 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#c2410c] ring-1 ring-orange-300/55">
        Medium
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[#3b82f6]/12 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#1d4ed8] ring-1 ring-[#bfdbfe]">
      Low
    </span>
  );
}

const SEVERITY_ICON: Record<
  ReturnType<typeof getAlertSeverityKey>,
  { Icon: LucideIcon; className: string; bgClassName: string }
> = {
  critical: {
    Icon: TriangleAlert,
    className: "text-[#ef4444]",
    bgClassName: "bg-[#fef2f2]",
  },
  medium: {
    Icon: CircleAlert,
    className: "text-[#ea580c]",
    bgClassName: "bg-orange-50",
  },
  low: {
    Icon: Info,
    className: "text-[#2563eb]",
    bgClassName: "bg-[#eff6ff]",
  },
};

export function AlertSeverityGlyph({
  severity,
  className,
  iconClassName,
}: {
  severity?: string;
  className?: string;
  iconClassName?: string;
}) {
  const key = getAlertSeverityKey(severity);
  const { Icon, className: iconColor, bgClassName } = SEVERITY_ICON[key];

  return (
    <span
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-xl",
        bgClassName,
        className,
      )}
    >
      <Icon className={cn("size-7", iconColor, iconClassName)} strokeWidth={1.85} aria-hidden />
    </span>
  );
}
