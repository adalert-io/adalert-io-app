"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Menu,
  User,
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

/** Logo + wordmark — same asset as LoginForm (`/images/adalert-logo.avif`); sidebar uses white text on `#0B1426`. */
function AdminSidebarAuthBrandLockup({ className }: { className?: string }) {
  return (
    <Link
      href="https://adalert.io/"
      className={cn("flex items-center gap-2 min-w-0 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] rounded-lg", className)}
    >
      <span className="flex items-center gap-2 min-w-0">
        <Image
          src="/images/adalert-logo.avif"
          alt=""
          width={40}
          height={40}
          priority
          className="size-10 shrink-0"
        />
        <span className="truncate text-[25px] font-bold leading-none tracking-tight text-white">adAlert.io</span>
      </span>
    </Link>
  );
}

/** Aligns icons to a fixed gutter so labels align — matches screenshot grid. */
const ICON_COL = "flex size-[22px] shrink-0 items-center justify-center";

const SIDEBAR_GUTTER = "px-[22px]";
const SIDEBAR_W = "w-[264px]";
function DarkNavLeafLink({ leaf, pathname }: { leaf: AdminNavLeaf; pathname: string }) {
  const isActive = pathname.length > 0 && leafHrefMatches(pathname, leaf);

  return (
    <Link
      href={leaf.href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg py-[6px] pe-2 ps-3 text-[13px] font-medium leading-snug outline-none ring-offset-[#0b1426] focus-visible:ring-2 focus-visible:ring-[#3b82f6]",
        isActive ? "text-[#3b82f6]" : "text-[#94a3b8] hover:text-white",
      )}
    >
      <span
        className={cn(
          "size-[5px] shrink-0 rounded-full",
          isActive ? "bg-[#3b82f6]" : "bg-[#64748b]",
        )}
        aria-hidden
      />
      <span>{leaf.title}</span>
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
        "group block rounded-lg px-1 outline-none ring-offset-[#0b1426] focus-visible:ring-2 focus-visible:ring-[#3b82f6]",
      )}
    >
      <span
        className={cn(
          "flex items-center gap-[14px] rounded-lg px-3 py-2.5 text-[14px] font-medium leading-none",
          isActive
            ? "bg-[#1e293b] text-white"
            : "text-[#94a3b8] hover:bg-white/[0.06] hover:text-white",
        )}
      >
        <span className={ICON_COL}>
          <Icon
            className="size-[18px]"
            aria-hidden
            strokeWidth={1.65}
          />
        </span>
        <span className="min-w-0 flex-1">{title}</span>
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

  const headerActiveStyles = open || isSubActive;

  return (
    <div className="px-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          "group flex w-full items-center gap-[14px] rounded-lg px-3 py-2.5 text-left text-[14px] font-medium leading-none outline-none ring-offset-[#0b1426] focus-visible:ring-2 focus-visible:ring-[#3b82f6]",
          headerActiveStyles
            ? "bg-[#1e293b] text-white"
            : "text-[#94a3b8] hover:bg-white/[0.06] hover:text-white",
        )}
      >
        <span className={ICON_COL}>
          <Icon className="size-[18px]" aria-hidden strokeWidth={1.65} />
        </span>
        <span className="min-w-0 flex-1">{item.title}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-[#64748b] transition-transform duration-200",
            open ? "rotate-180" : "rotate-0",
            headerActiveStyles && "text-white/70",
          )}
        />
      </button>
      {open ? (
        <nav
          className="ml-[44px] mt-1 space-y-[2px] border-l border-white/[0.08] pl-4"
          aria-label={`${item.title} sub-navigation`}
        >
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
      <div
        className={cn("fixed inset-0 z-40 bg-slate-900/65 backdrop-blur-sm lg:hidden", mobileOpen ? "block" : "hidden")}
        aria-hidden={!mobileOpen}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex bg-[#0b1426] text-slate-200 shadow-xl transition-transform duration-300 lg:translate-x-0",
          SIDEBAR_W,
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "flex-col overflow-hidden antialiased font-sans",
        )}
      >
        <header
          className={cn(
            "flex shrink-0 items-start gap-3 border-b border-white/[0.08] pb-8 pt-7",
            SIDEBAR_GUTTER,
          )}
        >
          <div className="min-w-0 flex-1">
            <AdminSidebarAuthBrandLockup />
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="-mt-1 -me-2 shrink-0 rounded-lg p-2 text-[#94a3b8] hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="size-5" />
          </button>
        </header>

        <nav
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            SIDEBAR_GUTTER,
          )}
        >
          {adminConsoleNavGroups.flatMap((group) =>
            group.items.map((item) => {
              const hasChildren = (item.items?.length ?? 0) > 0;
              if (hasChildren) {
                return <DarkPaymentsGroup key={item.title} item={item} pathname={pathname} />;
              }
              const href = item.href;
              return href ? (
                <DarkNavPrimaryLink
                  key={item.title}
                  href={href}
                  title={item.title}
                  icon={item.icon}
                  pathname={pathname}
                />
              ) : null;
            }),
          )}
        </nav>

        <footer className={cn("border-t border-white/[0.08] pb-7 pt-6", SIDEBAR_GUTTER)}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl bg-[#111b32] px-3 py-2.5 text-left outline-none hover:bg-[#152542] focus-visible:ring-2 focus-visible:ring-[#3b82f6]"
              >
                <Avatar className="size-10 shrink-0 border border-white/[0.1]">
                  <AvatarFallback className="bg-[#3b82f6] text-[13px] font-semibold text-white">
                    NT
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold leading-tight text-white">Nishant Thakur</p>
                  <p className="text-[#64748b] text-[12px] leading-tight">Administrator</p>
                </div>
                <ChevronDown aria-hidden className="size-4 shrink-0 text-[#64748b]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="center" sideOffset={8} className="w-[232px]">
              <DropdownMenuItem asChild>
                <Link
                  href="/administrator/settings/general"
                  className="flex w-full cursor-pointer items-center gap-2"
                >
                  <User className="size-4 shrink-0" aria-hidden />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild variant="destructive">
                <Link href="/auth" className="flex w-full cursor-pointer items-center gap-2">
                  <LogOut className="size-4 shrink-0" aria-hidden />
                  Logout
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </footer>
      </aside>

      <div className="flex min-h-svh min-w-0 flex-1 flex-col lg:pl-[264px]">
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

        <div className={cn(isDashboardHome ? "sticky top-0 z-30 flex items-center border-b border-slate-200/80 bg-[#f8fafc]/90 px-3 py-2 backdrop-blur-sm lg:hidden" : "hidden")}>
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

        <main className="relative flex min-w-0 flex-1 flex-col">
          {isDashboardHome ? children : <div className="flex flex-1 flex-col px-4 py-6 md:px-6 lg:px-8">{children}</div>}
        </main>
      </div>
    </div>
  );
}
