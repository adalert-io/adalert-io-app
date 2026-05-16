import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CreditCard,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  ScrollText,
  Settings2,
  UsersRound,
} from "lucide-react";

export interface AdminNavLeaf {
  title: string;
  href: string;
}

export interface AdminNavItem {
  title: string;
  href?: string;
  icon: LucideIcon;
  items?: AdminNavLeaf[];
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

/** Collapsible sidebar nav — stubs only until APIs are wired. */
export const adminConsoleNavGroups: AdminNavGroup[] = [
  {
    label: "Platform",
    items: [
      {
        title: "Overview",
        href: "/administrator",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Directory",
    items: [
      {
        title: "Users",
        icon: UsersRound,
        items: [
          { title: "Accounts", href: "/administrator/users" },
          { title: "Roles", href: "/administrator/users/roles" },
        ],
      },
    ],
  },
  {
    label: "Revenue",
    items: [
      {
        title: "Subscriptions",
        href: "/administrator/subscriptions",
        icon: CreditCard,
      },
      {
        title: "Billing",
        icon: FileText,
        items: [
          { title: "Invoices", href: "/administrator/billing/invoices" },
          { title: "Payouts", href: "/administrator/billing/payouts" },
        ],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Alerts",
        href: "/administrator/alerts",
        icon: AlertTriangle,
      },
    ],
  },
  {
    label: "Support",
    items: [
      {
        title: "Tickets",
        href: "/administrator/support",
        icon: LifeBuoy,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Audit log",
        href: "/administrator/audit",
        icon: ScrollText,
      },
      {
        title: "Settings",
        icon: Settings2,
        items: [
          { title: "General", href: "/administrator/settings/general" },
          { title: "Integrations", href: "/administrator/settings/integrations" },
        ],
      },
    ],
  },
];

interface Crumb {
  title: string;
  href?: string;
}

/** True when `pathname` is exactly `href` or nested under `href/` (excluding `/administrator` subtree vs dashboard). */
export function pathsMatchHref(pathname: string, href: string): boolean {
  if (pathname === href) {
    return true;
  }
  if (href === "/administrator") {
    return false;
  }
  const normalized = href.endsWith("/") ? href.slice(0, -1) : href;
  return pathname.startsWith(`${normalized}/`);
}

export function breadcrumbsForPathname(pathname: string): Crumb[] {
  if (pathname === "/administrator") {
    return [
      { title: "Administrator", href: "/administrator" },
      { title: "Overview" },
    ];
  }

  const trail: Crumb[] = [{ title: "Administrator", href: "/administrator" }];

  for (const group of adminConsoleNavGroups) {
    for (const item of group.items) {
      if (item.href && pathname === item.href) {
        return [...trail, { title: item.title }];
      }
    }
  }

  let bestLeaf: AdminNavLeaf | null = null;
  for (const group of adminConsoleNavGroups) {
    for (const item of group.items) {
      for (const leaf of item.items ?? []) {
        if (pathsMatchHref(pathname, leaf.href)) {
          if (
            !bestLeaf ||
            leaf.href.length > bestLeaf.href.length
          ) {
            bestLeaf = leaf;
          }
        }
      }
    }
  }

  if (bestLeaf) {
    const parentNav = adminConsoleNavGroups
      .flatMap((g) => g.items)
      .find((candidate) =>
        candidate.items?.some((leaf) => leaf.href === bestLeaf!.href),
      );
    const parentTitle = parentNav?.title;
    if (parentTitle) {
      trail.push({ title: parentTitle });
    }
    trail.push({ title: bestLeaf.title });
    return trail;
  }

  let deepestTopHref: AdminNavItem | null = null;
  for (const group of adminConsoleNavGroups) {
    for (const candidate of group.items) {
      if (
        candidate.href &&
        candidate.href !== "/administrator" &&
        pathname !== candidate.href &&
        pathsMatchHref(pathname, candidate.href)
      ) {
        if (
          !deepestTopHref ||
          candidate.href.length > (deepestTopHref.href ?? "").length
        ) {
          deepestTopHref = candidate;
        }
      }
    }
  }

  if (deepestTopHref?.href) {
    trail.push({ title: deepestTopHref.title });
    if (pathname !== deepestTopHref.href) {
      const segmentTitle = pathname
        .replace(/^\/?administrator\/?/, "")
        .split("/")
        .filter(Boolean)
        .slice(-1)[0];
      trail.push({
        title: segmentTitle ? formatSegment(segmentTitle) : "Details",
      });
    }
    return trail;
  }

  const segmentTitle = pathname
    .replace(/^\/?administrator\/?/, "")
    .split("/")
    .filter(Boolean)
    .slice(-1)[0];

  trail.push({
    title: segmentTitle ? formatSegment(segmentTitle) : "Page",
  });
  return trail;
}

function formatSegment(seg: string): string {
  return seg
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}
