"use client";

import type { Action } from "kbar";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CreditCard,
  LayoutDashboard,
  ListTree,
  UserCircle2,
  UsersRound,
} from "lucide-react";
import { createElement, useMemo } from "react";
import { useRouter } from "next/navigation";

import { consumerPathForClassicRoute } from "@/lib/consumer-shell-preference";
import { useAuthStore } from "@/lib/store/auth-store";
import type { AdsAccount } from "@/lib/store/user-ads-accounts-store";
import { useUserAdsAccountsStore } from "@/lib/store/user-ads-accounts-store";
import { formatAccountNumber } from "@/lib/utils";

import { consumerNavGroupsForUser } from "./consumer-console-nav";

function actionIcon(Icon: LucideIcon) {
  return createElement(Icon, {
    className: "size-4 shrink-0 text-[#015AFD]",
    strokeWidth: 1.75,
    "aria-hidden": true,
  });
}

function accountDisplayName(account: AdsAccount): string {
  return (
    account["Account Name Editable"] ||
    account["Account Name Original"] ||
    account.name ||
    "Ad account"
  );
}

export function useConsumerKbarActions(): Action[] {
  const router = useRouter();
  const { userDoc } = useAuthStore();
  const { userAdsAccounts, setSelectedAdsAccount } = useUserAdsAccountsStore();

  const connectedAccountCount = userAdsAccounts.length;
  const userType = userDoc?.["User Type"] as string | undefined;

  return useMemo(() => {
    const actions: Action[] = [];
    const navGroups = consumerNavGroupsForUser(userType, connectedAccountCount);

    const push = (href: string) => {
      router.push(href);
    };

    const pushDashboardForAccount = (account: AdsAccount) => {
      setSelectedAdsAccount(account);
      router.push(consumerPathForClassicRoute("/dashboard"));
    };

    for (const group of navGroups) {
      for (const item of group.items) {
        if (item.href) {
          const shortcutMap: Record<string, string[]> = {
            "Mission Control": ["g", "m"],
            Dashboard: ["g", "d"],
          };

          actions.push({
            id: `nav-${item.href}`,
            name: item.title,
            section: "Navigate",
            shortcut: shortcutMap[item.title],
            keywords: item.title.toLowerCase(),
            icon: actionIcon(item.icon),
            perform: () => push(item.href!),
          });
          continue;
        }

        const sectionName = item.title;
        const leafShortcuts: Record<string, string[]> = {
          Alerts: ["g", "a"],
          Users: ["g", "u"],
          "Ad Accounts": ["g", "n"],
          Subscriptions: ["g", "1"],
          Billing: ["g", "2"],
          "Company Details": ["g", "3"],
        };

        for (const leaf of item.items ?? []) {
          actions.push({
            id: `nav-${leaf.href}`,
            name: leaf.title,
            section: sectionName,
            shortcut: leafShortcuts[leaf.title],
            keywords: `${leaf.title} ${sectionName}`.toLowerCase(),
            icon: actionIcon(
              leaf.title === "Users"
                ? UsersRound
                : leaf.title === "Alerts"
                  ? Bell
                  : leaf.title.includes("Billing") || leaf.title.includes("Subscription")
                    ? CreditCard
                    : item.icon,
            ),
            perform: () => push(leaf.href),
          });
        }
      }
    }

    if (userAdsAccounts.length > 0) {
      for (const account of userAdsAccounts) {
        const name = accountDisplayName(account);
        const number = formatAccountNumber(account.Id || account.id || "");

        actions.push({
          id: `account-${account.id}`,
          name: name,
          subtitle: number,
          section: "Ad accounts",
          keywords: `${name} ${number} dashboard`.toLowerCase(),
          icon: actionIcon(LayoutDashboard),
          perform: () => pushDashboardForAccount(account),
        });
      }
    }

    return actions;
  }, [
    userType,
    connectedAccountCount,
    userAdsAccounts,
    router,
    setSelectedAdsAccount,
  ]);
}
