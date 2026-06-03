import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  Bell,
  Building2,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  HelpCircle,
  UserCircle2,
  Users,
  Wallet,
} from "lucide-react";

import { ALERT_SEVERITIES, ALERT_SEVERITY_COLORS } from "@/lib/constants";

export interface HelpGuidePage {
  title: string;
  href?: string;
  icon: LucideIcon;
  description: string;
  functions: string[];
  /** Hide for Manager role */
  adminOnly?: boolean;
  requiresSingleAccount?: boolean;
}

export interface HelpSeverityLevel {
  key: "critical" | "medium" | "low";
  label: string;
  color: string;
  meaning: string;
  whereUsed: string;
}

export const HELP_SEVERITY_LEVELS: HelpSeverityLevel[] = [
  {
    key: "critical",
    label: ALERT_SEVERITIES.CRITICAL,
    color: ALERT_SEVERITY_COLORS.CRITICAL,
    meaning: "Urgent issues that need immediate attention (e.g. spend or policy risk).",
    whereUsed: "Dashboard KPI cards, alert rows, Mission Control summaries, and charts.",
  },
  {
    key: "medium",
    label: ALERT_SEVERITIES.MEDIUM,
    color: ALERT_SEVERITY_COLORS.MEDIUM,
    meaning: "Important warnings to review soon; may become critical if ignored.",
    whereUsed: "Same as Critical—look for the orange accent and badge.",
  },
  {
    key: "low",
    label: ALERT_SEVERITIES.LOW,
    color: ALERT_SEVERITY_COLORS.LOW,
    meaning: "Informational or lower-priority items; still worth checking on a schedule.",
    whereUsed: "Yellow accent on cards and badges throughout alerts and reporting.",
  },
];

export const HELP_APP_PAGES: HelpGuidePage[] = [
  {
    title: "Mission Control",
    href: "/consumer/summary",
    icon: BarChart2,
    description:
      "Your home view across connected ad accounts—high-level health, alert volume, and quick navigation.",
    functions: [
      "Scan alert counts and trends before diving into a single account.",
      "Use header actions to add an ad account, return here, or open Help.",
      "Open an account dashboard when you have exactly one connected account.",
    ],
  },
  {
    title: "Dashboard",
    href: "/consumer/dashboard",
    icon: LayoutDashboard,
    description:
      "Deep dive for one ad account: live alerts, filters, and performance context.",
    functions: [
      "Filter alerts by severity, label, time range, and search.",
      "Archive or unarchive alerts in bulk when rows are selected.",
      "Open PPC Action Plan (AI) and export alert data to CSV.",
      "Tap a row to view full alert details and suggested next steps.",
    ],
    requiresSingleAccount: true,
  },
  {
    title: "Alerts (Settings)",
    href: "/consumer/settings/settings/alerts",
    icon: Bell,
    description: "Configure who gets notified and which severities trigger outreach.",
    functions: [
      "Set email notification rules for your organization.",
      "Focus on critical-only delivery when you want fewer emails.",
    ],
  },
  {
    title: "Users",
    href: "/consumer/settings/settings/users",
    icon: Users,
    description: "Invite teammates and manage roles (Company Admin only).",
    functions: [
      "Add or edit users and control access to ad accounts.",
      "Managers see a limited Settings menu (Alerts only).",
    ],
    adminOnly: true,
  },
  {
    title: "Ad Accounts",
    href: "/consumer/settings/settings/ad-accounts",
    icon: Megaphone,
    description: "Connect and manage Google Ads (and related) accounts.",
    functions: [
      "Link new accounts from Mission Control or Settings.",
      "Control which users can access each account.",
    ],
    adminOnly: true,
  },
  {
    title: "Subscriptions",
    href: "/consumer/settings/account/subscriptions",
    icon: CreditCard,
    description: "View plan, trial status, and subscription changes.",
    functions: [
      "See current plan and billing period.",
      "Manage upgrade paths with your account admin.",
    ],
  },
  {
    title: "Billing",
    href: "/consumer/settings/account/billing",
    icon: Wallet,
    description: "Payment method and invoice history.",
    functions: [
      "Update card on file and review past charges.",
      "Download or reference invoices for accounting.",
    ],
  },
  {
    title: "Company Details",
    href: "/consumer/settings/account/company-details",
    icon: Building2,
    description: "Legal and billing identity for your organization.",
    functions: [
      "Keep company name, address, and tax details current.",
    ],
  },
  {
    title: "Help center",
    href: "/consumer/help",
    icon: HelpCircle,
    description: "Support tickets and this guide—you are here.",
    functions: [
      "Submit a ticket with one attachment per request.",
      "Track status: Open, In progress, Awaiting reply, Resolved.",
      "Open a ticket thread to read replies and add follow-ups.",
    ],
  },
  {
    title: "My Profile",
    href: "/consumer/settings/my-profile",
    icon: UserCircle2,
    description: "Your personal login, password, and profile details.",
    functions: [
      "Update name, email preferences, and password (non-Google sign-in).",
      "Available from the sidebar (desktop) or Profile tab (mobile).",
    ],
  },
];
