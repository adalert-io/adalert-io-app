"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  Menu,
  PanelLeftIcon,
  X,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  adminConsoleNavGroups,
  breadcrumbsForPathname,
  pathsMatchHref,
  type AdminNavItem,
  type AdminNavLeaf,
} from "./admin-console-nav";

const STORAGE_KEY = "admin_console_sidebar_collapsed";

/** Same visual lockup as `LoginForm` (logo + adAlert.io + marketing link). */
function AdminSidebarBrand({ collapsed }: { collapsed: boolean }) {
  const lockup = collapsed ? (
    <Link
      href="https://adalert.io/"
      className="flex items-center justify-center rounded-lg py-1 outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <Image src="/images/adalert-logo.avif" alt="adAlert.io logo" width={38} height={38} priority />
    </Link>
  ) : (
    <Link
      href="https://adalert.io/"
      className="flex items-center gap-2 min-w-0 py-2 outline-none hover:opacity-95 focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded-lg px-1"
    >
      <Image src="/images/adalert-logo.avif" alt="" width={40} height={40} priority />
      <span className="truncate text-[22px] font-bold leading-none text-[#223b53] sm:text-[25px]">
        adAlert.io
      </span>
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{lockup}</TooltipTrigger>
        <TooltipContent side="right">adAlert.io</TooltipContent>
      </Tooltip>
    );
  }

  return lockup;
}

function NavSubLink({ leaf, collapsed }: { leaf: AdminNavLeaf; collapsed: boolean }) {
  const pathname = usePathname();
  const isActive =
    !!pathname &&
    !!(leaf.href && pathsMatchHref(pathname, leaf.href));

  const linkInner = (
    <Link
      href={leaf.href}
      data-active={isActive}
      className={cn(
        "flex w-full items-center rounded-md px-3 py-1.5 text-sm transition-colors",
        collapsed ? "justify-center px-2" : "pl-8",
        isActive
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
      )}
      title={collapsed ? leaf.title : undefined}
    >
      {!collapsed ? leaf.title : <span className="sr-only">{leaf.title}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkInner}</TooltipTrigger>
        <TooltipContent side="right">{leaf.title}</TooltipContent>
      </Tooltip>
    );
  }

  return linkInner;
}

function NavPrimaryItem({
  item,
  pathname,
  collapsed,
}: {
  item: AdminNavItem;
  pathname: string;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const subItems = item.items ?? [];
  const hasChildren = subItems.length > 0;
  const isSubActive = subItems.some(
    (leaf) => leaf.href && pathname && pathsMatchHref(pathname, leaf.href),
  );

  const isSelfActive =
    !!item.href && !!pathname ? pathsMatchHref(pathname, item.href) : false;

  const [detailsOpen, setDetailsOpen] = React.useState(() => hasChildren && isSubActive);

  React.useEffect(() => {
    if (hasChildren && isSubActive) {
      setDetailsOpen(true);
    }
  }, [hasChildren, isSubActive]);

  const isRowActive =
    (!hasChildren && isSelfActive) || (hasChildren && (isSubActive || isSelfActive));

  const toggleButtonClass = cn(
    "flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
    isRowActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "",
    collapsed ? "justify-center gap-0 p-2 [&>svg:first-child]:size-[18px]" : ""
  );

  if (!hasChildren && item.href) {
    const outer = (
      <Link href={item.href} className="block w-full rounded-md outline-none [&:focus-visible>div]:ring-2 [&:focus-visible>div]:ring-sidebar-ring">
        <div className={toggleButtonClass}>
          <Icon className="size-[18px] shrink-0" />
          {!collapsed ? <span className="flex-1 truncate font-medium">{item.title}</span> : null}
        </div>
      </Link>
    );
    return collapsed ? (
      <Tooltip>
        <TooltipTrigger asChild>{outer}</TooltipTrigger>
        <TooltipContent side="right">{item.title}</TooltipContent>
      </Tooltip>
    ) : (
      outer
    );
  }

  if (!hasChildren) {
    return (
      <div className={toggleButtonClass}>
        <Icon className="size-[18px] shrink-0" />
        {!collapsed ? <span className="flex-1 truncate font-medium">{item.title}</span> : null}
      </div>
    );
  }

  return (
    <div className="w-full space-y-1">
      {!collapsed ? (
        <>
          <button
            type="button"
            aria-expanded={detailsOpen}
            className={toggleButtonClass}
            onClick={() => setDetailsOpen((previous) => !previous)}
          >
            <Icon className="size-[18px] shrink-0" />
            <span className="flex-1 truncate text-left font-medium">{item.title}</span>
            <ChevronDown
              className={cn("size-4 shrink-0 transition-transform", detailsOpen ? "rotate-180" : "rotate-0")}
            />
          </button>
          {detailsOpen ? (
            <ul className="mt-1 space-y-1 border-l border-sidebar-border/80 ml-4 pl-3">
              {subItems.map((leaf) => (
                <li key={leaf.href}>
                  <NavSubLink leaf={leaf} collapsed={false} />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={item.title}
                className={cn(toggleButtonClass, "justify-center")}
              >
                <Icon className="size-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{item.title}</TooltipContent>
          </Tooltip>
          <div className="space-y-1 py-2">
            {subItems.map((leaf) => (
              <NavSubLink key={leaf.href} leaf={leaf} collapsed />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface AdminConsoleShellProps {
  children: React.ReactNode;
}

export function AdminConsoleShell({ children }: AdminConsoleShellProps) {
  const pathname = usePathname() ?? "/administrator";
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === "1") {
      setCollapsed(true);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setCollapsed((previous) => !previous);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const crumbs = breadcrumbsForPathname(pathname);

  return (
    <TooltipProvider delayDuration={collapsed ? 120 : 500}>
      <div className="flex min-h-svh w-full bg-background text-foreground">
        {/* Mobile */}
        <div className={cn("fixed inset-0 z-40 bg-black/60 lg:hidden", mobileOpen ? "block" : "hidden")} aria-hidden={!mobileOpen} />
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex min-h-svh min-w-0 flex-col overflow-hidden border-r bg-sidebar text-sidebar-foreground transition-[transform,width] duration-200 lg:fixed lg:z-40",
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            collapsed ? "w-[76px]" : "w-64 lg:w-[16rem]"
          )}
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-sidebar-border px-2 py-2">
            <div className={cn("flex min-w-0 flex-1", collapsed ? "justify-center" : "justify-start")}>
              <AdminSidebarBrand collapsed={collapsed} />
            </div>
            <button
              type="button"
              className="ms-auto shrink-0 rounded-lg p-2 hover:bg-sidebar-accent lg:hidden"
              aria-label="Close sidebar"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-5 text-sidebar-foreground" />
            </button>
          </div>

          <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-width:none] p-3 [&::-webkit-scrollbar]:hidden">
            {adminConsoleNavGroups.map((group) => (
              <section key={group.label}>
                {!collapsed ? (
                  <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                    {group.label}
                  </div>
                ) : (
                  <div className="mb-2 h-px bg-sidebar-border mx-2" aria-hidden />
                )}
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item.title}>
                      <NavPrimaryItem item={item} pathname={pathname} collapsed={collapsed} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </nav>

          <div className="border-t border-sidebar-border p-2">
            {!collapsed ? (
              <Link
                href="/"
                className="rounded-lg px-2 py-3 text-[11px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                ← Back to application
              </Link>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/"
                    className="flex items-center justify-center rounded-lg py-3 text-sidebar-foreground/70 hover:bg-sidebar-accent"
                    aria-label="Back to application"
                  >
                    <ArrowLeft className="size-4 opacity-75" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Back to app</TooltipContent>
              </Tooltip>
            )}
          </div>
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute -right-[12px] top-[72px] z-40 hidden lg:flex lg:items-center lg:justify-center"
            onClick={() => setCollapsed((previous) => !previous)}
          >
            <span className="flex size-[22px] items-center justify-center rounded-full border border-sidebar-border bg-background shadow-sm hover:bg-accent">
              <PanelLeftIcon className="size-3.5 opacity-70" />
            </span>
          </button>
        </aside>

        <div
          className={cn(
            "relative flex flex-1 flex-col min-h-svh w-full transition-[padding] lg:ps-[calc(16rem+0px)]",
            collapsed ? "lg:ps-[76px]" : "lg:ps-[16rem]"
          )}
        >
          <header className="sticky top-0 z-30 flex min-h-[56px] items-center gap-3 border-b bg-background px-4 py-2">
            <button
              type="button"
              className="-ms-2 inline-flex lg:hidden rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
              onClick={() => setMobileOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="size-5" />
            </button>

            <Button
              variant="outline"
              size="icon"
              className="hidden size-9 lg:inline-flex"
              onClick={() => setCollapsed((previous) => !previous)}
              aria-label="Toggle sidebar"
            >
              <PanelLeftIcon className="size-4 opacity-75" />
            </Button>

            <div className="hidden h-4 w-px bg-border lg:block shrink-0" />

            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {crumbs.map((crumb, index) => (
                  <li key={`${crumb.title}-${index}`} className="flex items-center gap-2">
                    {index > 0 ? (
                      <span aria-hidden className="text-muted-foreground/70">
                        /
                      </span>
                    ) : null}
                    {crumb.href && index < crumbs.length - 1 ? (
                      <Link className="text-foreground hover:underline underline-offset-2" href={crumb.href}>
                        {crumb.title}
                      </Link>
                    ) : (
                      <span className={index === crumbs.length - 1 ? "font-semibold text-foreground" : ""}>{crumb.title}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>

            <div className="ms-auto flex items-center gap-2">
              <div className="hidden sm:flex rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                Ctrl / ⌘ + B collapses sidebar
              </div>
            </div>
          </header>

          <main className="relative flex flex-1 flex-col p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
