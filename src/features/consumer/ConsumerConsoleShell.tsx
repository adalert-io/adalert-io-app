"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, User } from "lucide-react";
import type { ReactNode } from "react";
import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FreeTrialBanner } from "@/components/layout/FreeTrialBanner";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";

import { ConsumerAddAdsAccountHeaderControl } from "./add-ads-account/ConsumerAddAdsAccountHeaderControl";
import { ConsumerAdsAccountSwitcher } from "./ConsumerAdsAccountSwitcher";
import { ConsumerKBar, ConsumerKBarTrigger } from "./ConsumerKBar";
import {
  CONSUMER_MOBILE_TAB_BAR_OFFSET,
  ConsumerMobileTabBar,
} from "./ConsumerMobileTabBar";
import {
  consumerBreadcrumbs,
  consumerLeafMatches,
  consumerNavGroupsForUser,
  type ConsumerNavItem,
  type ConsumerNavLeaf,
} from "./consumer-console-nav";
import { useUserAdsAccountsStore } from "@/lib/store/user-ads-accounts-store";

function ConsumerSidebarBrand({ className }: { className?: string }) {
  return (
    <Link
      href="https://adalert.io/"
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-lg py-2 outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]",
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Image
          src="/images/adalert-logo.avif"
          alt=""
          width={40}
          height={40}
          priority
          className="size-10 shrink-0"
        />
        <span className="truncate text-[25px] font-bold leading-none tracking-tight text-white">
          adAlert.io
        </span>
      </span>
    </Link>
  );
}

const ICON_COL = "flex size-[22px] shrink-0 items-center justify-center";
const SIDEBAR_GUTTER = "px-[22px]";
const SIDEBAR_W = "w-[264px]";

function DarkNavLeafLink({ leaf, pathname }: { leaf: ConsumerNavLeaf; pathname: string }) {
  const isActive = pathname.length > 0 && consumerLeafMatches(pathname, leaf);

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
  icon: ConsumerNavItem["icon"];
  pathname: string;
}) {
  const isActive = pathname === href;

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
          <Icon className="size-[18px]" aria-hidden strokeWidth={1.65} />
        </span>
        <span className="min-w-0 flex-1">{title}</span>
      </span>
    </Link>
  );
}

function DarkConsumerGroup({ item, pathname }: { item: ConsumerNavItem; pathname: string }) {
  const subItems = item.items ?? [];
  const Icon = item.icon;
  const isSubActive =
    pathname.length > 0 && subItems.some((leaf) => consumerLeafMatches(pathname, leaf));
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

interface ConsumerConsoleShellProps {
  children: ReactNode;
}

function displayInitials(name: string | undefined, email: string | undefined): string {
  const fromName = name?.trim();
  if (fromName) {
    const parts = fromName.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0];
    const b = parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1];
    return `${a ?? "?"}${b ?? "?"}`.toUpperCase().slice(0, 2);
  }
  const local = email?.split("@")[0];
  return (local?.slice(0, 2) ?? "AA").toUpperCase();
}

export function ConsumerConsoleShell({ children }: ConsumerConsoleShellProps) {
  const pathname = usePathname() ?? "/consumer/summary";
  const router = useRouter();
  const crumbs = consumerBreadcrumbs(pathname);
  const { user, userDoc, logout } = useAuthStore();
  const {
    userAdsAccounts,
    selectedAdsAccount,
    setSelectedAdsAccount,
    fetchUserAdsAccounts,
  } = useUserAdsAccountsStore();

  const connectedAccountCount = userAdsAccounts.length;

  const navGroups = React.useMemo(
    () =>
      consumerNavGroupsForUser(
        userDoc?.["User Type"] as string | undefined,
        connectedAccountCount,
      ),
    [userDoc, connectedAccountCount],
  );

  React.useEffect(() => {
    if (!userDoc) return;
    if (userAdsAccounts.length === 0) {
      void fetchUserAdsAccounts(userDoc);
      return;
    }
    if (userAdsAccounts.length === 1 && !selectedAdsAccount) {
      setSelectedAdsAccount(userAdsAccounts[0]);
    }
  }, [
    userDoc,
    userAdsAccounts,
    selectedAdsAccount,
    fetchUserAdsAccounts,
    setSelectedAdsAccount,
  ]);

  const displayName =
    userDoc?.Name || user?.displayName || user?.email?.split("@")[0] || "Account";
  const subtitle = userDoc?.["User Type"] === "Manager" ? "Manager" : "Member";
  const avatarSrc =
    typeof userDoc?.Avatar === "string" && userDoc.Avatar.trim().length > 0
      ? userDoc.Avatar.trim()
      : undefined;

  React.useEffect(() => {
    if (
      pathname === "/consumer/dashboard" &&
      connectedAccountCount > 1 &&
      !selectedAdsAccount
    ) {
      router.replace("/consumer/summary");
    }
  }, [pathname, connectedAccountCount, selectedAdsAccount, router]);

  return (
    <ConsumerKBar>
    <div className="flex min-h-svh w-full bg-[#f8fafc]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 hidden bg-[#0b1426] text-slate-200 shadow-xl lg:flex",
          SIDEBAR_W,
          "flex-col overflow-hidden antialiased font-sans",
        )}
      >
        <header
          className={cn(
            "flex shrink-0 flex-col gap-4 border-b border-white/[0.08] pb-6 pt-7",
            SIDEBAR_GUTTER,
          )}
        >
          <ConsumerSidebarBrand />
          <ConsumerAdsAccountSwitcher variant="sidebar" />
        </header>

        <nav
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            SIDEBAR_GUTTER,
          )}
          aria-label="Consumer console"
        >
          {navGroups.flatMap((group) =>
            group.items.map((item) => {
              const hasChildren = (item.items?.length ?? 0) > 0;
              if (hasChildren) {
                return <DarkConsumerGroup key={item.title} item={item} pathname={pathname} />;
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
                  {avatarSrc ? (
                    <AvatarImage src={avatarSrc} alt="" className="object-cover object-top" />
                  ) : null}
                  <AvatarFallback className="bg-[#3b82f6] text-[13px] font-semibold text-white">
                    {displayInitials(userDoc?.Name, user?.email ?? undefined)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold leading-tight text-white">
                    {displayName}
                  </p>
                  <p className="text-[12px] leading-tight text-[#64748b]">{subtitle}</p>
                </div>
                <ChevronDown aria-hidden className="size-4 shrink-0 text-[#64748b]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="center" sideOffset={8} className="w-[232px]">
              <DropdownMenuItem asChild>
                <Link href="/consumer/settings/my-profile" className="flex w-full cursor-pointer items-center gap-2">
                  <User className="size-4 shrink-0" aria-hidden />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
                onSelect={() => {
                  void logout();
                }}
              >
                <span className="flex items-center gap-2">
                  <LogOut className="size-4 shrink-0" aria-hidden />
                  Log out
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </footer>
      </aside>

      <div className="flex min-h-svh min-w-0 flex-1 flex-col lg:pl-[264px]">
        <FreeTrialBanner upgradeHref="/consumer/settings/account/billing?show=payment-form" />
        <div className="sticky top-0 z-30 flex shrink-0 flex-col border-b border-slate-200/90 bg-[#f8fafc]/90 backdrop-blur-md">
          <div className="flex items-center gap-2 px-4 py-2">
          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs sm:text-sm"
          >
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {crumbs.map((crumb, index) => (
                <li key={`${crumb.title}-${index}`} className="flex items-center gap-2">
                  {index > 0 ? <span className="text-muted-foreground/70">/</span> : null}
                  {crumb.href && index < crumbs.length - 1 ? (
                    <Link href={crumb.href} className="text-slate-800 hover:text-[#3b82f6] hover:underline">
                      {crumb.title}
                    </Link>
                  ) : (
                    <span
                      className={index === crumbs.length - 1 ? "font-semibold text-slate-900" : undefined}
                    >
                      {crumb.title}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <ConsumerAddAdsAccountHeaderControl />
            <ConsumerKBarTrigger />
          </div>
          </div>

          <div className="border-t border-slate-200/80 px-4 py-2 lg:hidden">
            <ConsumerAdsAccountSwitcher variant="header" />
          </div>
        </div>

        <main
          className={cn(
            "relative flex min-w-0 flex-1 flex-col overflow-x-hidden",
            CONSUMER_MOBILE_TAB_BAR_OFFSET,
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col px-4 py-6 md:px-6 lg:px-8">{children}</div>
        </main>

        <ConsumerMobileTabBar
          userType={userDoc?.["User Type"] as string | undefined}
          connectedAccountCount={connectedAccountCount}
        />
      </div>
    </div>
    </ConsumerKBar>
  );
}
