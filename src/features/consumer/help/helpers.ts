import type { SupportTicketStatus } from "./types";

export const CONSUMER_HELP_HREF = "/consumer/help";

export const SUPPORT_CATEGORIES = [
  { value: "billing", label: "Billing & subscription" },
  { value: "ads-account", label: "Ad account connection" },
  { value: "alerts", label: "Alerts & notifications" },
  { value: "dashboard", label: "Dashboard & reporting" },
  { value: "users", label: "Users & permissions" },
  { value: "other", label: "Other" },
] as const;

export function formatTicketDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTicketRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return "Just now";

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatTicketDate(iso);
}

export function statusLabel(status: SupportTicketStatus): string {
  const labels: Record<SupportTicketStatus, string> = {
    open: "Open",
    in_progress: "In progress",
    waiting: "Awaiting reply",
    resolved: "Resolved",
  };
  return labels[status];
}

export function statusBadgeClass(status: SupportTicketStatus): string {
  const classes: Record<SupportTicketStatus, string> = {
    open: "bg-[#015AFD]/10 text-[#015AFD] ring-[#015AFD]/20",
    in_progress: "bg-amber-50 text-amber-800 ring-amber-200/80",
    waiting: "bg-violet-50 text-violet-800 ring-violet-200/80",
    resolved: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  };
  return classes[status];
}

export function priorityLabel(priority: "low" | "medium" | "high"): string {
  if (priority === "low") return "Low";
  if (priority === "high") return "High";
  return "Medium";
}
