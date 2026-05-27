import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  Bell,
  Building2,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  MoreHorizontal,
  Settings,
  UserCircle2,
  Users,
  Wallet,
} from "lucide-react";

export const CONSUMER_MISSION_CONTROL_HREF = "/consumer/summary";
export const CONSUMER_MISSION_CONTROL_LABEL = "Mission Control";
export const CONSUMER_DASHBOARD_HREF = "/consumer/dashboard";

export function isConsumerDashboardPath(pathname: string): boolean {
  return (
    pathname === CONSUMER_DASHBOARD_HREF ||
    pathname.startsWith(`${CONSUMER_DASHBOARD_HREF}/`)
  );
}

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

export function consumerNavGroupsForUser(
  userType: string | undefined,
  connectedAccountCount: number,
): ConsumerNavGroup[] {
  const isManager = userType === "Manager";
  const orgLeaves = isManager
    ? ORG_LEAVES.filter((l) => l.title === "Alerts")
    : ORG_LEAVES;

  const primaryItems: ConsumerNavItem[] = [
    {
      title: CONSUMER_MISSION_CONTROL_LABEL,
      href: CONSUMER_MISSION_CONTROL_HREF,
      icon: BarChart2,
    },
  ];

  if (connectedAccountCount === 1) {
    primaryItems.push({
      title: "Dashboard",
      href: "/consumer/dashboard",
      icon: LayoutDashboard,
    });
  }

  return [
    {
      label: "",
      items: [
        ...primaryItems,
        {
          title: "Settings",
          icon: Settings,
          items: orgLeaves,
        },
        {
          title: "Account",
          icon: CreditCard,
          items: ACCOUNT_LEAVES,
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
    href === "/consumer/settings/my-profile" ||
    href === "/consumer/help";
  if (exactOnlyHref) {
    return false;
  }
  const normalized = href.endsWith("/") ? href.slice(0, -1) : href;
  return pathname.startsWith(`${normalized}/`);
}

export function consumerBreadcrumbs(pathname: string): Crumb[] {
  const root: Crumb = { title: "Console", href: "/consumer/summary" };

  if (pathname === CONSUMER_MISSION_CONTROL_HREF) {
    return [root, { title: CONSUMER_MISSION_CONTROL_LABEL }];
  }
  if (pathname === "/consumer/dashboard") {
    return [root, { title: "Dashboard" }];
  }
  if (pathname === "/consumer/help" || pathname.startsWith("/consumer/help/")) {
    return [root, { title: "Help center" }];
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
    return [root, { title: "Settings" }, { title: label }];
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

export interface ConsumerMobileMoreSection {
  title: string;
  items: ConsumerNavLeaf[];
}

export interface ConsumerMobileLinkTab {
  type: "link";
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}

export interface ConsumerMobileMoreTab {
  type: "more";
  id: string;
  label: string;
  icon: LucideIcon;
  sections: ConsumerMobileMoreSection[];
  isActive: (pathname: string) => boolean;
}

export type ConsumerMobileTab = ConsumerMobileLinkTab | ConsumerMobileMoreTab;

const LEAF_ICONS: Record<string, LucideIcon> = {
  Alerts: Bell,
  Users: Users,
  "Ad Accounts": Megaphone,
  Subscriptions: CreditCard,
  Billing: Wallet,
  "Company Details": Building2,
};

export function consumerMobileLeafIcon(title: string): LucideIcon {
  return LEAF_ICONS[title] ?? Bell;
}

export function consumerMobileTabsForUser(
  userType: string | undefined,
  connectedAccountCount: number,
): ConsumerMobileTab[] {
  const navGroups = consumerNavGroupsForUser(userType, connectedAccountCount);
  const items = navGroups[0]?.items ?? [];

  const orgItem = items.find((i) => i.title === "Settings");
  const accountItem = items.find((i) => i.title === "Account");
  const orgLeaves = orgItem?.items ?? [];
  const accountLeaves = accountItem?.items ?? [];

  const tabs: ConsumerMobileTab[] = [
    {
      type: "link",
      id: "mission-control",
      label: "Mission Control",
      href: CONSUMER_MISSION_CONTROL_HREF,
      icon: BarChart2,
      isActive: (pathname) => pathname === CONSUMER_MISSION_CONTROL_HREF,
    },
  ];

  if (connectedAccountCount === 1) {
    tabs.push({
      type: "link",
      id: "dashboard",
      label: "Dashboard",
      href: "/consumer/dashboard",
      icon: LayoutDashboard,
      isActive: (pathname) => pathname === "/consumer/dashboard",
    });
  }

  const alertsLeaf = orgLeaves.find((l) => l.title === "Alerts");
  if (alertsLeaf) {
    tabs.push({
      type: "link",
      id: "alerts",
      label: "Alerts",
      href: alertsLeaf.href,
      icon: Bell,
      isActive: (pathname) => consumerLeafMatches(pathname, alertsLeaf),
    });
  }

  const moreSections: ConsumerMobileMoreSection[] = [];
  const moreOrgLeaves = orgLeaves.filter((l) => l.title !== "Alerts");
  if (moreOrgLeaves.length > 0) {
    moreSections.push({ title: "Settings", items: moreOrgLeaves });
  }
  if (accountLeaves.length > 0) {
    moreSections.push({ title: "Account", items: accountLeaves });
  }

  if (moreSections.length > 0) {
    tabs.push({
      type: "more",
      id: "more",
      label: "More",
      icon: MoreHorizontal,
      sections: moreSections,
      isActive: (pathname) =>
        moreSections.some((section) =>
          section.items.some((leaf) => consumerLeafMatches(pathname, leaf)),
        ),
    });
  }

  tabs.push({
    type: "link",
    id: "profile",
    label: "Profile",
    href: "/consumer/settings/my-profile",
    icon: UserCircle2,
    isActive: (pathname) => pathname === "/consumer/settings/my-profile",
  });

  return tabs;
}
