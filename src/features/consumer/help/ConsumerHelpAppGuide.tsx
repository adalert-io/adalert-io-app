"use client";

import type { ReactNode } from "react";
import {
  BookOpen,
  Layers3,
  Monitor,
  Palette,
  Smartphone,
} from "lucide-react";

import { useAuthStore } from "@/lib/store/auth-store";
import { useUserAdsAccountsStore } from "@/lib/store/user-ads-accounts-store";
import { cn } from "@/lib/utils";

import { SeverityBadge } from "../dashboard/alert-ui";
import {
  HELP_APP_PAGES,
  HELP_SEVERITY_LEVELS,
  type HelpGuidePage,
} from "./app-guide-content";

function GuideSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof BookOpen;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-4 md:flex-row md:items-center md:gap-4 md:px-6 md:py-5 lg:px-7">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#015AFD]/10 text-[#015AFD] md:size-11">
            <Icon className="size-5 md:size-[22px]" aria-hidden />
          </span>
          <h2 className="text-lg font-bold text-slate-900 md:text-xl">{title}</h2>
        </div>
        {description ? (
          <p className="text-[13px] leading-relaxed text-slate-500 md:ms-auto md:max-w-md md:text-end md:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      <div className="px-4 py-4 md:px-6 md:py-6 lg:px-7 lg:py-7">{children}</div>
    </section>
  );
}

function PageGuideCard({ page }: { page: HelpGuidePage }) {
  const Icon = page.icon;

  return (
    <article
      className={cn(
        "rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 transition-colors md:p-5",
        "md:hover:border-[#015AFD]/25 md:hover:bg-slate-50/90",
      )}
    >
      <div className="flex items-start gap-3 md:gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#015AFD] ring-1 ring-slate-200/90 md:size-11">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-slate-900 md:text-[17px]">
            {page.title}
          </h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">
            {page.description}
          </p>
          <ul className="mt-3 space-y-2">
            {page.functions.map((item) => (
              <li
                key={item}
                className="flex gap-2 text-[13px] leading-snug text-slate-700"
              >
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#015AFD]"
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

export function ConsumerHelpAppGuide() {
  const userType = useAuthStore((s) => s.userDoc?.["User Type"]) as string | undefined;
  const isManager = userType === "Manager";
  const connectedCount = useUserAdsAccountsStore((s) => s.userAdsAccounts.length);

  const visiblePages = HELP_APP_PAGES.filter((page) => {
    if (page.adminOnly && isManager) return false;
    if (page.requiresSingleAccount && connectedCount !== 1) return false;
    return true;
  });

  return (
    <div className="space-y-5 md:space-y-8">
      <div className="flex flex-col gap-2 border-b border-slate-200/80 pb-5 md:flex-row md:items-end md:justify-between md:gap-6 md:pb-6">
        <div className="max-w-2xl space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
            App guide
          </h2>
          <p className="text-[14px] leading-relaxed text-slate-600 md:text-[15px]">
            Pages, common actions, and alert severity colors used across Mission Control,
            Dashboard, and Settings.
          </p>
        </div>
      </div>

      <GuideSection
        icon={Layers3}
        title="Pages & what they do"
        description="Where to go in the console"
      >
        <div className="grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
          {visiblePages.map((page) => (
            <PageGuideCard key={page.title} page={page} />
          ))}
        </div>
        {connectedCount !== 1 ? (
          <p className="mt-4 rounded-lg bg-slate-100/80 px-3 py-2.5 text-[13px] text-slate-600">
            The per-account <strong>Dashboard</strong> appears in navigation when exactly
            one ad account is connected. With multiple accounts, use Mission Control and
            account switchers instead.
          </p>
        ) : null}
        {isManager ? (
          <p className="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-[13px] text-amber-900">
            Manager accounts can access Mission Control, Alerts settings, Profile, and Help.
            User and Ad Account management is reserved for Company Admins.
          </p>
        ) : null}
      </GuideSection>

      <GuideSection
        icon={Palette}
        title="Alert severity color codes"
        description="Critical · Medium · Low"
      >
        <p className="mb-5 max-w-3xl text-[14px] leading-relaxed text-slate-600 md:text-[15px]">
          Every alert is labeled <strong>Critical</strong>, <strong>Medium</strong>, or{" "}
          <strong>Low</strong>. The same colors appear on badges, KPI underlines, and chart
          accents so you can scan risk at a glance.
        </p>
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          {HELP_SEVERITY_LEVELS.map((level) => (
            <div
              key={level.key}
              className="flex h-full flex-col rounded-xl border border-slate-200/90 bg-white p-4 md:p-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <SeverityBadge severity={level.label} />
                <span
                  className="inline-flex items-center gap-2 text-[12px] font-medium text-slate-500"
                >
                  <span
                    className="size-8 w-12 rounded-md ring-1 ring-slate-200/80"
                    style={{ backgroundColor: level.color }}
                    aria-hidden
                  />
                  {level.color}
                </span>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-700">
                {level.meaning}
              </p>
              <p className="mt-2 text-[13px] text-slate-500">{level.whereUsed}</p>
            </div>
          ))}
        </div>
        <div
          className={cn(
            "mt-5 flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 md:flex-row md:items-center md:gap-6 md:p-5",
          )}
        >
          <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
            Quick reference
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="flex items-center gap-2 text-[13px] text-slate-700">
              <span
                className="h-1 w-8 rounded-full"
                style={{ backgroundColor: HELP_SEVERITY_LEVELS[0].color }}
              />
              Critical
            </span>
            <span className="flex items-center gap-2 text-[13px] text-slate-700">
              <span
                className="h-1 w-8 rounded-full"
                style={{ backgroundColor: HELP_SEVERITY_LEVELS[1].color }}
              />
              Medium
            </span>
            <span className="flex items-center gap-2 text-[13px] text-slate-700">
              <span
                className="h-1 w-8 rounded-full"
                style={{ backgroundColor: HELP_SEVERITY_LEVELS[2].color }}
              />
              Low
            </span>
          </div>
        </div>
      </GuideSection>

      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        <GuideSection icon={Monitor} title="Header quick actions">
          <ul className="grid gap-3 md:gap-4">
            <li className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 text-[14px] leading-relaxed text-slate-700">
              <strong className="text-slate-900">Plus</strong> — connect another ad account
              (hidden for Managers).
            </li>
            <li className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 text-[14px] leading-relaxed text-slate-700">
              <strong className="text-slate-900">Chart</strong> — jump to Mission Control.
            </li>
            <li className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 text-[14px] leading-relaxed text-slate-700">
              <strong className="text-slate-900">Help</strong> — open this Help center from
              anywhere in the console.
            </li>
          </ul>
        </GuideSection>

        <GuideSection icon={Smartphone} title="Navigation tips">
          <div className="space-y-4 text-[14px] leading-relaxed text-slate-700">
            <p>
              <strong className="text-slate-900">Desktop:</strong> use the left sidebar for
              Mission Control, Settings, Account, and profile. Switch ad accounts from the header
              when you have more than one connection.
            </p>
            <p>
              <strong className="text-slate-900">Mobile:</strong> use the bottom tab bar for
              Mission Control, Alerts, More (Settings &amp; Account), and Profile.
            </p>
            <p className="rounded-lg bg-[#015AFD]/5 px-4 py-3 text-[13px] text-slate-600 ring-1 ring-[#015AFD]/15">
              Tip: Severity filters on the Dashboard match the color codes above—use them to
              focus on Critical items first.
            </p>
          </div>
        </GuideSection>
      </div>
    </div>
  );
}
