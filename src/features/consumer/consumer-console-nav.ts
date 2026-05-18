import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CreditCard,
  LayoutDashboard,
  ListTree,
  UserCircle2,
} from "lucide-react";

export interface ConsumerNavLeaf {
  title: string;
  href: string;
  matchExact?: boolean;
}

export interface ConsumerNavItem {
  title: string;
  href?: string;
  icon: LucideIcon;
  items?: ConsumerNavLeaf[];
}

export interface ConsumerNavGroup {
  label: string;
  items: ConsumerNavItem[];
}

const ORG_LEAVES: ConsumerNavLeaf[] = [
  { title: "Alerts", href: "/consumer/settings/settings/alerts" },
  { title: "Users", href: "/consumer/settings/settings/users" },
  { title: "Ad Accounts", href: "/consumer/settings/settings/ad-accounts" },
];

const ACCOUNT_LEAVES: ConsumerNavLeaf[] = [
  { title: "Subscriptions", href: "/consumer/settings/account/subscriptions" },
  { title: "Billing", href: "/consumer/settings/account/billing" },
  { title: "Company Details", href: "/consumer/settings/account/company-details" },
];

export function consumerNavGroupsForUser(userType: string | undefined): ConsumerNavGroup[] {
  const isManager = userType === "Manager";
  const orgLeaves = isManager
    ? ORG_LEAVES.filter((l) => l.title === "Alerts")
    : ORG_LEAVES;

  return [
    {
      label: "",
      items: [
        { title: "Summary", href: "/consumer/summary", icon: ListTree },
        { title: "Dashboard", href: "/consumer/dashboard", icon: LayoutDashboard },
        {
          title: "Organization",
          icon: Bell,
          items: orgLeaves,
        },
        {
          title: "Account",
          icon: CreditCard,
          items: ACCOUNT_LEAVES,
        },
        {
          title: "My profile",
          href: "/consumer/settings/my-profile",
          icon: UserCircle2,
        },
      ],
    },
  ];
}

interface Crumb {
  title: string;
  href?: string;
}

export function consumerLeafMatches(pathname: string, leaf: ConsumerNavLeaf): boolean {
  if (pathname === leaf.href) return true;
  if (leaf.matchExact) return false;
  const normalized = leaf.href.endsWith("/") ? leaf.href.slice(0, -1) : leaf.href;
  return pathname.startsWith(`${normalized}/`);
}

export function consumerPathsMatchHref(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  const exactOnlyHref =
    href === "/consumer/summary" ||
    href === "/consumer/dashboard" ||
    href === "/consumer/settings/my-profile";
  if (exactOnlyHref) {
    return false;
  }
  const normalized = href.endsWith("/") ? href.slice(0, -1) : href;
  return pathname.startsWith(`${normalized}/`);
}

export function consumerBreadcrumbs(pathname: string): Crumb[] {
  const root: Crumb = { title: "Console", href: "/consumer/summary" };

  if (pathname === "/consumer/summary") {
    return [root, { title: "Summary" }];
  }
  if (pathname === "/consumer/dashboard") {
    return [root, { title: "Dashboard" }];
  }
  if (pathname === "/consumer/settings/my-profile") {
    return [root, { title: "My profile" }];
  }

  if (pathname.startsWith("/consumer/settings/settings/")) {
    const seg = pathname.split("/").pop() ?? "";
    const label = seg
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
    return [root, { title: "Organization" }, { title: label }];
  }

  if (pathname.startsWith("/consumer/settings/account/")) {
    const seg = pathname.split("/").pop() ?? "";
    const label = seg
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
    return [root, { title: "Account" }, { title: label }];
  }

  return [root, { title: "Page" }];
}
