import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  UserCircle2,
  UsersRound,
} from "lucide-react";

export interface AdminNavLeaf {
  title: string;
  href: string;
  /** Use when this item must not activate for deeper paths (e.g. Payments overview). */
  matchExact?: boolean;
}

export interface AdminNavItem {
  title: string;
  href?: string;
  icon: LucideIcon;
  items?: AdminNavLeaf[];
}

export interface AdminNavGroup {
  /** Empty string skips the section heading in the sidebar. */
  label: string;
  items: AdminNavItem[];
}

export const adminConsoleNavGroups: AdminNavGroup[] = [
  {
    label: "",
    items: [
      { title: "Dashboard", href: "/administrator", icon: LayoutDashboard },
      {
        title: "Customers",
        href: "/administrator/customers",
        icon: UserCircle2,
      },
      {
        title: "Payments",
        icon: CreditCard,
        items: [
          {
            title: "Transactions",
            href: "/administrator/payments/transactions",
          },
          {
            title: "Subscriptions",
            href: "/administrator/subscriptions",
          },
        ],
      },
      {
        title: "Users",
        href: "/administrator/users",
        icon: UsersRound,
      },
      {
        title: "Monitoring",
        href: "/administrator/monitoring",
        icon: Activity,
      },
      { title: "Support", href: "/administrator/support", icon: CircleHelp },
    ],
  },
];

interface Crumb {
  title: string;
  href?: string;
}

export function leafHrefMatches(pathname: string, leaf: AdminNavLeaf): boolean {
  if (pathname === leaf.href) {
    return true;
  }
  if (leaf.matchExact) {
    return false;
  }
  const normalized = leaf.href.endsWith("/") ? leaf.href.slice(0, -1) : leaf.href;
  return pathname.startsWith(`${normalized}/`);
}

/** True when `pathname` matches `href` as exact or nested (dashboard `/administrator` excludes children). */
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
      { title: "Dashboard" },
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
        if (leafHrefMatches(pathname, leaf)) {
          if (!bestLeaf || leaf.href.length > bestLeaf.href.length) {
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
