import type { LucideIcon } from "lucide-react";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";

import { ALERT_SEVERITIES, ALERT_SEVERITY_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function getAlertSeverityKey(severity: string | undefined): "critical" | "medium" | "low" {
  const lower = severity?.toLowerCase() ?? "";
  if (lower === ALERT_SEVERITIES.CRITICAL.toLowerCase()) return "critical";
  if (lower === ALERT_SEVERITIES.MEDIUM.toLowerCase()) return "medium";
  return "low";
}

const SEVERITY_DOT_COLOR: Record<
  ReturnType<typeof getAlertSeverityKey>,
  string
> = {
  critical: ALERT_SEVERITY_COLORS.CRITICAL,
  medium: ALERT_SEVERITY_COLORS.MEDIUM,
  low: ALERT_SEVERITY_COLORS.LOW,
};

const SEVERITY_BADGE_CLASS: Record<
  ReturnType<typeof getAlertSeverityKey>,
  string
> = {
  critical:
    "bg-[#ED1A22]/12 text-[#ED1A22] ring-[#ED1A22]/35",
  medium:
    "bg-[#FF8028]/14 text-[#FF8028] ring-[#FF8028]/40",
  low:
    "bg-[#ECE31B]/35 text-[#78700a] ring-[#ECE31B]/55",
};

export function SeverityBadge({ severity }: { severity?: string }) {
  const key = getAlertSeverityKey(severity);
  const label =
    key === "critical"
      ? ALERT_SEVERITIES.CRITICAL
      : key === "medium"
        ? ALERT_SEVERITIES.MEDIUM
        : ALERT_SEVERITIES.LOW;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1",
        SEVERITY_BADGE_CLASS[key],
      )}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: SEVERITY_DOT_COLOR[key] }}
        aria-hidden
      />
      {label}
    </span>
  );
}

const SEVERITY_ICON: Record<
  ReturnType<typeof getAlertSeverityKey>,
  { Icon: LucideIcon; dotColor: string; bgClassName: string }
> = {
  critical: {
    Icon: TriangleAlert,
    dotColor: ALERT_SEVERITY_COLORS.CRITICAL,
    bgClassName: "bg-[#ED1A22]/10",
  },
  medium: {
    Icon: CircleAlert,
    dotColor: ALERT_SEVERITY_COLORS.MEDIUM,
    bgClassName: "bg-[#FF8028]/12",
  },
  low: {
    Icon: Info,
    dotColor: ALERT_SEVERITY_COLORS.LOW,
    bgClassName: "bg-[#ECE31B]/25",
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
  const { Icon, dotColor, bgClassName } = SEVERITY_ICON[key];

  return (
    <span
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-xl",
        bgClassName,
        className,
      )}
    >
      <Icon
        className={cn("size-7", iconClassName)}
        style={{ color: dotColor }}
        strokeWidth={1.85}
        aria-hidden
      />
    </span>
  );
}
