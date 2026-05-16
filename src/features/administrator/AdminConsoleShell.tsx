"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import * as React from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import {
  adminConsoleNavGroups,
  breadcrumbsForPathname,
  leafHrefMatches,
  pathsMatchHref,
  type AdminNavItem,
  type AdminNavLeaf,
} from "./admin-console-nav";

function DarkNavLeafLink({ leaf, pathname }: { leaf: AdminNavLeaf; pathname: string }) {
  const isActive = pathname.length > 0 && leafHrefMatches(pathname, leaf);

  return (
    <Link
      href={leaf.href}
      className={cn(
        "relative flex items-center gap-3 rounded-lg py-2 ps-11 pe-4 text-[13px] font-medium transition-colors",
        isActive ? "bg-[#334155]/60 text-white" : "text-slate-400 hover:bg-white/[0.05] hover:text-white",
      )}
    >
      <span
        className={cn(
          "absolute left-9 top-1/2 size-2 -translate-y-1/2 rounded-full",
          isActive ? "bg-[#3b82f6]" : "bg-transparent",
        )}
        aria-hidden
      />
      {leaf.title}
    </Link>
  );
}

function DarkNavPrimaryLink({
  href,
  title,
  icon: Icon,
  pathname,
}: {
  href: string;
  title: string;
  icon: AdminNavItem["icon"];
  pathname: string;
}) {
  const isActive =
    pathname === "/administrator" && href === "/administrator"
      ? pathname === href
      : href !== "/administrator" && pathsMatchHref(pathname, href);

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-lg px-2 outline-none ring-offset-[#0f172a] focus-visible:ring-2 focus-visible:ring-[#3b82f6] ring-offset-2",
      )}
    >
      <span
        className={cn(
          "relative flex items-center gap-3 rounded-lg px-3 py-2.5 ps-8 text-[14px] font-medium",
          "border-l-[3px]",
          isActive
            ? "border-[#3b82f6] bg-[#1e293b] text-white"
            : "border-transparent text-slate-300 hover:bg-white/[0.05] hover:text-white",
        )}
      >
        <Icon className="size-[18px] shrink-0 text-[#cbd5f5]" aria-hidden />
        <span>{title}</span>
      </span>
    </Link>
  );
}

function DarkPaymentsGroup({
  item,
  pathname,
}: {
  item: AdminNavItem;
  pathname: string;
}) {
  const subItems = item.items ?? [];
  const Icon = item.icon;
  const isSubActive =
    pathname.length > 0 && subItems.some((leaf) => leafHrefMatches(pathname, leaf));
  const [open, setOpen] = React.useState(Boolean(isSubActive));

  React.useEffect(() => {
    if (isSubActive) {
      setOpen(true);
    }
  }, [isSubActive]);

  return (
    <div className="space-y-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 ps-8 text-[14px] font-medium outline-none ring-offset-[#0f172a] focus-visible:ring-2 focus-visible:ring-[#3b82f6] ring-offset-2",
          "border-l-[3px]",
          open || isSubActive
            ? "border-[#3b82f6]/80 bg-[#1e293b]/85 text-white"
            : "border-transparent text-slate-300 hover:bg-white/[0.05] hover:text-white",
        )}
      >
        <Icon className="size-[18px] shrink-0 text-[#cbd5f5]" aria-hidden />
        <span className="flex-1 text-start">{item.title}</span>
        <ChevronDown
          aria-hidden
          className={cn("size-4 shrink-0 text-slate-500 transition-transform", open ? "rotate-180" : "rotate-0")}
        />
      </button>
      {open ? (
        <nav className="mt-2 space-y-1 border-l border-[#334155] ms-11 ps-5" aria-label={`${item.title} sub-navigation`}>
          {subItems.map((leaf) => (
            <DarkNavLeafLink key={leaf.href} leaf={leaf} pathname={pathname} />
          ))}
        </nav>
      ) : null}
    </div>
  );
}

interface AdminConsoleShellProps {
  children: ReactNode;
}

export function AdminConsoleShell({ children }: AdminConsoleShellProps) {
  const pathname = usePathname() ?? "/administrator";
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isDashboardHome = pathname === "/administrator";
  const crumbs = breadcrumbsForPathname(pathname);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-svh w-full bg-[#f8fafc]">
      {/* Mobile overlay */}
      <div
        className={cn("fixed inset-0 z-40 bg-slate-900/65 backdrop-blur-sm lg:hidden", mobileOpen ? "block" : "hidden")}
        aria-hidden={!mobileOpen}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col overflow-hidden bg-[#0f172a] text-slate-200 shadow-xl transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex shrink-0 items-center gap-4 border-b border-white/10 px-5 pb-6 pt-7">
          <div className="flex size-[44px] shrink-0 items-center justify-center rounded-xl bg-[#3b82f6] text-xl font-black tracking-tighter text-white">
            ad
          </div>
          <span className="text-[22px] font-bold tracking-tight text-white">adAlert.io</span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="ms-auto rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto px-4 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {adminConsoleNavGroups.flatMap((group) =>
            group.items.map((item) => {
              const hasChildren = (item.items?.length ?? 0) > 0;
              if (hasChildren) {
                return (
                  <div key={item.title} className="py-px ps-2 pe-3">
                    <DarkPaymentsGroup item={item} pathname={pathname} />
                  </div>
                );
              }
              const href = item.href;
              return href ? (
                <div key={item.title} className="py-px px-3">
                  <DarkNavPrimaryLink href={href} title={item.title} icon={item.icon} pathname={pathname} />
                </div>
              ) : null;
            }),
          )}
        </nav>

        <div className="border-t border-white/10 px-5 py-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl bg-[#172039] px-3 py-2.5 text-left outline-none hover:bg-[#1a2544] focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
              >
                <Avatar className="size-10 border border-white/10">
                  <AvatarFallback className="bg-[#3b82f6] text-[13px] font-semibold text-white">
                    NT
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-white">Nishant Thakur</p>
                  <p className="text-slate-500 text-[12px]">Administrator</p>
                </div>
                <ChevronDown aria-hidden className="size-4 shrink-0 text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="center" sideOffset={8} className="w-[232px]">
              <DropdownMenuItem asChild>
                <Link href="/administrator/settings/general">Profile &amp; preferences</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/">Switch to customer app</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            href="/auth"
            className="mt-6 flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] font-medium text-slate-400 hover:bg-white/[0.05] hover:text-white"
          >
            <LogOut className="size-[18px] shrink-0" aria-hidden />
            Logout
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-h-svh min-w-0 lg:pl-[272px]">
        <div className={cn(isDashboardHome ? "hidden" : "sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b border-slate-200/90 bg-[#f8fafc]/90 px-4 py-2 backdrop-blur-md")}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 border-slate-200 bg-white shadow-sm lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>

          <div className="hidden h-4 w-px bg-slate-200 lg:block" />

          <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs sm:text-sm">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {crumbs.map((crumb, index) => (
                <li key={`${crumb.title}-${index}`} className="flex items-center gap-2">
                  {index > 0 ? <span className="text-muted-foreground/70">/</span> : null}
                  {crumb.href && index < crumbs.length - 1 ? (
                    <Link href={crumb.href} className="text-slate-800 hover:text-[#3b82f6] hover:underline">
                      {crumb.title}
                    </Link>
                  ) : (
                    <span className={index === crumbs.length - 1 ? "font-semibold text-slate-900" : undefined}>
                      {crumb.title}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Mobile menu trigger on dashboard */}
        <div className={cn(isDashboardHome ? "sticky top-0 z-30 flex items-center lg:hidden bg-[#f8fafc]/90 border-b border-slate-200/80 backdrop-blur-sm px-3 py-2" : "hidden")}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 border-slate-200 bg-white shadow-sm"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
        </div>

        <main className="relative flex flex-1 flex-col min-w-0">
          {isDashboardHome ? children : <div className="flex flex-1 flex-col px-4 py-6 md:px-6 lg:px-8">{children}</div>}
        </main>
      </div>
    </div>
  );
}
