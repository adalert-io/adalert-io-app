"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import * as React from "react";

import { useAuthStore } from "@/lib/store/auth-store";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CONSUMER_SUBSCRIPTION_EXPIRED_NAV_TITLE,
  isConsumerNavHrefDisabledWhenExpired,
} from "./consumer-subscription-access";
import {
  consumerMobileLeafIcon,
  consumerMobileTabsForUser,
  consumerLeafMatches,
  type ConsumerMobileTab,
} from "./consumer-console-nav";
import { cn } from "@/lib/utils";

/** Matches iOS tab bar height (~49pt). */
export const CONSUMER_MOBILE_TAB_BAR_HEIGHT = "3.0625rem";

interface ConsumerMobileTabBarProps {
  userType: string | undefined;
  connectedAccountCount: number;
  isSubscriptionExpired?: boolean;
}

function MobileTabIcon({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex size-7 items-center justify-center rounded-lg transition-colors duration-200",
        active && "bg-[#015AFD]/10",
      )}
    >
      {children}
    </span>
  );
}

function MobileLinkTab({
  tab,
  pathname,
  isDisabled,
}: {
  tab: Extract<ConsumerMobileTab, { type: "link" }>;
  pathname: string;
  isDisabled: boolean;
}) {
  const Icon = tab.icon;
  const isActive = tab.isActive(pathname);

  if (isDisabled) {
    return (
      <span
        className="flex min-w-0 flex-1 cursor-not-allowed flex-col items-center justify-center gap-0.5 px-1 pt-0.5 opacity-50"
        title={CONSUMER_SUBSCRIPTION_EXPIRED_NAV_TITLE}
      >
        <MobileTabIcon active={false}>
          <Icon className="size-[22px] shrink-0" aria-hidden strokeWidth={1.75} />
        </MobileTabIcon>
        <span className="max-w-full truncate text-[10px] font-medium leading-none tracking-tight">
          {tab.label}
        </span>
      </span>
    );
  }

  return (
    <Link
      href={tab.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-0.5 outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-[#015AFD]/40 focus-visible:ring-offset-2",
        isActive ? "text-[#015AFD]" : "text-slate-400 active:text-slate-500",
      )}
    >
      <MobileTabIcon active={isActive}>
        <Icon
          className="size-[22px] shrink-0"
          aria-hidden
          strokeWidth={isActive ? 2.25 : 1.75}
        />
      </MobileTabIcon>
      <span
        className={cn(
          "max-w-full truncate text-[10px] leading-none tracking-tight",
          isActive ? "font-semibold" : "font-medium",
        )}
      >
        {tab.label}
      </span>
    </Link>
  );
}

function MobileMoreTab({
  tab,
  pathname,
  isSubscriptionExpired,
}: {
  tab: Extract<ConsumerMobileTab, { type: "more" }>;
  pathname: string;
  isSubscriptionExpired: boolean;
}) {
  const { logout } = useAuthStore();
  const Icon = tab.icon;
  const isActive = tab.isActive(pathname);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-0.5 outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-[#015AFD]/40 focus-visible:ring-offset-2",
          isActive || open ? "text-[#015AFD]" : "text-slate-400 active:text-slate-500",
        )}
      >
        <MobileTabIcon active={isActive || open}>
          <Icon
            className="size-[22px] shrink-0"
            aria-hidden
            strokeWidth={isActive || open ? 2.25 : 1.75}
          />
        </MobileTabIcon>
        <span
          className={cn(
            "max-w-full truncate text-[10px] leading-none tracking-tight",
            isActive || open ? "font-semibold" : "font-medium",
          )}
        >
          {tab.label}
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="gap-0 rounded-t-[20px] border-slate-200/90 px-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-0"
        >
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-200" aria-hidden />
          <SheetHeader className="border-b border-slate-100 px-5 pb-4 pt-3 text-start">
            <SheetTitle className="text-base font-bold text-slate-900">
              More
            </SheetTitle>
          </SheetHeader>
          <div className="max-h-[min(60vh,420px)] overflow-y-auto px-3 py-3">
            {tab.sections.map((section) => (
              <section key={section.title} className="mb-4 last:mb-0">
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {section.title}
                </p>
                <ul className="space-y-0.5">
                  {section.items.map((leaf) => {
                    const LeafIcon = consumerMobileLeafIcon(leaf.title);
                    const leafActive = consumerLeafMatches(pathname, leaf);
                    const isLeafDisabled =
                      isSubscriptionExpired &&
                      isConsumerNavHrefDisabledWhenExpired(leaf.href);

                    return (
                      <li key={leaf.href}>
                        {isLeafDisabled ? (
                          <span
                            className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 text-slate-400 opacity-50"
                            title={CONSUMER_SUBSCRIPTION_EXPIRED_NAV_TITLE}
                          >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                              <LeafIcon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1 text-[15px] font-medium leading-tight">
                              {leaf.title}
                            </span>
                          </span>
                        ) : (
                        <Link
                          href={leaf.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-3 outline-none transition-colors",
                            "focus-visible:ring-2 focus-visible:ring-[#015AFD]/30",
                            leafActive
                              ? "bg-[#015AFD]/8 text-[#015AFD]"
                              : "text-slate-800 hover:bg-slate-50 active:bg-slate-100",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-xl",
                              leafActive
                                ? "bg-[#015AFD]/12 text-[#015AFD]"
                                : "bg-slate-100 text-slate-600",
                            )}
                          >
                            <LeafIcon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1 text-[15px] font-medium leading-tight">
                            {leaf.title}
                          </span>
                        </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
          <div className="border-t border-slate-100 px-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void logout();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-red-600 outline-none transition-colors hover:bg-red-50 active:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-200"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <LogOut className="size-[18px]" strokeWidth={1.75} aria-hidden />
              </span>
              Log out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function ConsumerMobileTabBar({
  userType,
  connectedAccountCount,
  isSubscriptionExpired = false,
}: ConsumerMobileTabBarProps) {
  const pathname = usePathname() ?? "/consumer/summary";

  const tabs = React.useMemo(
    () => consumerMobileTabsForUser(userType, connectedAccountCount),
    [userType, connectedAccountCount],
  );

  const isTabDisabled = (tab: ConsumerMobileTab) => {
    if (!isSubscriptionExpired) return false;
    if (tab.type === "link") {
      return isConsumerNavHrefDisabledWhenExpired(tab.href);
    }
    return false;
  };

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 lg:hidden",
        "border-t border-slate-200/90 bg-white/90 shadow-[0_-4px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/80",
        "pb-[max(0px,env(safe-area-inset-bottom))]",
      )}
    >
      <div
        className="flex items-stretch justify-around px-0.5"
        style={{ height: CONSUMER_MOBILE_TAB_BAR_HEIGHT }}
      >
        {tabs.map((tab) =>
          tab.type === "link" ? (
            <MobileLinkTab
              key={tab.id}
              tab={tab}
              pathname={pathname}
              isDisabled={isTabDisabled(tab)}
            />
          ) : (
            <MobileMoreTab
              key={tab.id}
              tab={tab}
              pathname={pathname}
              isSubscriptionExpired={isSubscriptionExpired}
            />
          ),
        )}
      </div>
    </nav>
  );
}

export const CONSUMER_MOBILE_TAB_BAR_OFFSET =
  "pb-[calc(3.0625rem+env(safe-area-inset-bottom))] lg:pb-0";
