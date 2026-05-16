"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  Building2,
  CreditCard,
  Mail,
  Plug,
  Settings2,
  Shield,
  Trash2,
  Sparkles,
  UserCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { AdminDashboardDateRangePicker } from "../dashboard/AdminDashboardDateRangePicker";

type SettingsTab =
  | "general"
  | "account"
  | "alerts"
  | "billing"
  | "email"
  | "security"
  | "integrations"
  | "advanced";

interface SettingsTabConfig {
  key: SettingsTab;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const TAB_ITEMS: SettingsTabConfig[] = [
  { key: "general", label: "General", Icon: Settings2 },
  { key: "account", label: "Account", Icon: UserCircle2 },
  { key: "alerts", label: "Alerts", Icon: Bell },
  { key: "billing", label: "Billing", Icon: CreditCard },
  { key: "email", label: "Email", Icon: Mail },
  { key: "security", label: "Security", Icon: Shield },
  { key: "integrations", label: "Integrations", Icon: Plug },
  { key: "advanced", label: "Advanced", Icon: Sparkles },
];

const SELECT_CLASS =
  "w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 ps-4 pe-10 text-[13px] font-medium text-gray-900 shadow-xs outline-none transition-colors focus-visible:border-[#015AFD] focus-visible:ring-2 focus-visible:ring-[#015AFD]/25";

export function AdminSettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [platformName, setPlatformName] = useState("adAlert.io");
  const [timezone, setTimezone] = useState("gmt-530");
  const [dateFormat, setDateFormat] = useState("mdy");
  const [timeFormat, setTimeFormat] = useState("12h");
  const [currency, setCurrency] = useState("usd");
  const [pageSize, setPageSize] = useState("10");
  const [language, setLanguage] = useState("en-us");

  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);

  const tabLegend = useMemo(
    () =>
      ({
        general: "General settings view",
        account: "Account preferences",
        alerts: "Tenant alert defaults",
        billing: "Invoicing connectors",
        email: "SMTP + templates",
        security: "Sessions, MFA enforcement",
        integrations: "API keys + webhooks",
        advanced: "Feature flags + maintenance",
      }) satisfies Record<SettingsTab, string>,
    [],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-10 pb-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl space-y-2">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 sm:text-[30px]">
            Settings
          </h1>
          <p className="text-[15px] text-[#7A7D9C]">
            Manage your account, preferences and system settings
          </p>
        </div>
        <AdminDashboardDateRangePicker />
      </header>

      <nav
        aria-label="Settings sections"
        className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-1 scrollbar-thin"
      >
        {TAB_ITEMS.map(({ key, label, Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-[13px] font-semibold outline-none transition-colors",
                isActive
                  ? "border-x border-t border-gray-200 bg-white text-[#015AFD]"
                  : "text-gray-600 hover:text-gray-900",
              )}
            >
              <Icon
                className={cn("size-4", isActive ? "text-[#015AFD]" : "text-gray-500")}
              />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-8">
          {activeTab === "general" ? (
            <Card className="rounded-2xl border border-gray-200 shadow-sm">
              <CardHeader className="gap-2 border-b border-gray-100 pb-6">
                <div className="space-y-1">
                  <p className="text-lg font-bold text-gray-900">General Settings</p>
                  <p className="text-[14px] text-[#64748b]">
                    Manage your platform preferences and default configurations.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-8">
                <div className="space-y-2">
                  <Label htmlFor="platform-name">Platform Name</Label>
                  <p className="text-[12px] text-[#94a3b8]">
                    Shown in outbound emails and the console header.
                  </p>
                  <Input
                    id="platform-name"
                    value={platformName}
                    onChange={(event) => setPlatformName(event.target.value)}
                    className="max-w-xl rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Default timezone</Label>
                  <p className="text-[12px] text-[#94a3b8]">
                    Used for scheduled reports and SLA clocks.
                  </p>
                  <div className="relative max-w-xl">
                    <select
                      id="timezone"
                      className={SELECT_CLASS}
                      value={timezone}
                      onChange={(event) => setTimezone(event.target.value)}
                    >
                      <option value="gmt-530">(GMT+05:30) Asia/Kolkata</option>
                      <option value="gmt-0">(GMT+00:00) London</option>
                      <option value="gmt-0500">(GMT-05:00) America/New York</option>
                    </select>
                    <div className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-gray-500">
                      ▼
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date-format">Date Format</Label>
                  <div className="relative max-w-xl">
                    <select
                      id="date-format"
                      className={SELECT_CLASS}
                      value={dateFormat}
                      onChange={(event) => setDateFormat(event.target.value)}
                    >
                      <option value="mdy">May 15, 2025 (MMM DD, YYYY)</option>
                      <option value="dmy">15 May 2025 (DD MMM YYYY)</option>
                      <option value="iso">2025-05-15 (ISO)</option>
                    </select>
                    <div className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-gray-500">
                      ▼
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time-format">Time Format</Label>
                  <div className="relative max-w-xl">
                    <select
                      id="time-format"
                      className={SELECT_CLASS}
                      value={timeFormat}
                      onChange={(event) => setTimeFormat(event.target.value)}
                    >
                      <option value="12h">12 Hour (02:30 PM)</option>
                      <option value="24h">24 Hour (14:30)</option>
                    </select>
                    <div className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-gray-500">
                      ▼
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <div className="relative max-w-xl">
                    <select
                      id="currency"
                      className={SELECT_CLASS}
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value)}
                    >
                      <option value="usd">USD - US Dollar ($)</option>
                      <option value="eur">EUR - Euro (€)</option>
                      <option value="inr">INR - Indian Rupee (₹)</option>
                    </select>
                    <div className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-gray-500">
                      ▼
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="items-per-page">Items Per Page</Label>
                  <div className="relative max-w-xl">
                    <select
                      id="items-per-page"
                      className={SELECT_CLASS}
                      value={pageSize}
                      onChange={(event) => setPageSize(event.target.value)}
                    >
                      {[10, 25, 50, 100].map((option) => (
                        <option key={option} value={String(option)}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-gray-500">
                      ▼
                    </div>
                  </div>
                </div>

                <fieldset className="space-y-3">
                  <legend className="px-1 text-sm font-semibold text-gray-900">
                    Language
                  </legend>
                  <RadioGroup value={language} onValueChange={setLanguage} className="space-y-2">
                    {[
                      { value: "en-us", title: "English (US)", description: "" },
                      {
                        value: "en-gb",
                        title: "English (UK)",
                        description: "",
                      },
                      { value: "hi", title: "Hindi", description: "" },
                    ].map((option) => (
                      <Label
                        key={option.value}
                        htmlFor={`lang-${option.value}`}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50"
                      >
                        <RadioGroupItem value={option.value} id={`lang-${option.value}`} />
                        <span className="text-[13px] font-semibold text-gray-900">
                          {option.title}
                        </span>
                      </Label>
                    ))}
                  </RadioGroup>
                </fieldset>
              </CardContent>
              <CardFooter className="border-t border-gray-100 pt-8">
                <Button className="rounded-xl bg-[#015AFD] px-10 font-semibold hover:bg-[#014bcc]">
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="rounded-2xl border border-dashed border-[#cfd7f5] bg-white p-10 text-[15px] text-[#64748b]">
              <div className="flex items-center gap-3 text-gray-900">
                <BellRing className="size-5 text-[#015AFD]" />
                <span className="text-lg font-semibold">
                  {TAB_ITEMS.find((tab) => tab.key === activeTab)?.label ??
                    "Settings"}
                </span>
              </div>
              <p className="mt-4 leading-relaxed">
                {tabLegend[activeTab]} will ship shortly. General defaults stay
                available on the adjacent column while integrations remain
                discoverable inside this workspace tab.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-6 rounded-xl"
                type="button"
                onClick={() => setActiveTab("general")}
              >
                Jump to general
              </Button>
            </Card>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between border-b border-gray-100 pb-6">
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  Company Information
                </p>
                <p className="text-[13px] text-[#64748b]">
                  Shared with auditors and SSO metadata.
                </p>
              </div>
              <Button variant="ghost" size="sm" type="button" className="-mt-1 text-[#015AFD]">
                Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-start gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[#e0e9ff] text-[#015AFD]">
                  <Building2 className="size-7" aria-hidden />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="text-lg font-bold text-gray-900">adAlert.io</p>
                  <p className="text-[13px] leading-relaxed text-[#475569]">
                    123 Business Street, New York, NY 10001, USA
                  </p>
                  <div className="space-y-0.5 text-[13px] font-semibold">
                    <p className="text-[#015AFD]">support@adalert.io</p>
                    <p className="text-gray-800">+1 (555) 123-4567</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-4">
              <p className="text-lg font-semibold text-gray-900">
                Notification Preferences
              </p>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="flex items-center justify-between gap-6">
                <div>
                  <p className="text-[13px] font-semibold text-gray-900">
                    In-App Notifications
                  </p>
                  <p className="text-[12px] text-[#94a3b8]">
                    Alerts inside the administrator console shell.
                  </p>
                </div>
                <Switch
                  checked={notifyInApp}
                  onCheckedChange={setNotifyInApp}
                  aria-label="In-app notifications"
                  className="data-[state=checked]:bg-[#22c55e]"
                />
              </div>
              <div className="flex items-center justify-between gap-6">
                <div>
                  <p className="text-[13px] font-semibold text-gray-900">
                    Email Notifications
                  </p>
                  <p className="text-[12px] text-[#94a3b8]">
                    Operational digests routed to stewardship mailboxes.
                  </p>
                </div>
                <Switch
                  checked={notifyEmail}
                  onCheckedChange={setNotifyEmail}
                  aria-label="Email notifications"
                  className="data-[state=checked]:bg-[#22c55e]"
                />
              </div>
              <div className="flex items-center justify-between gap-6">
                <div>
                  <p className="text-[13px] font-semibold text-gray-900">
                    SMS Notifications
                  </p>
                  <p className="text-[12px] text-[#94a3b8]">
                    Incident bridges for P0 escalation policies.
                  </p>
                </div>
                <Switch
                  checked={notifySms}
                  onCheckedChange={setNotifySms}
                  aria-label="SMS notifications"
                  className="data-[state=checked]:bg-[#22c55e] data-[state=unchecked]:bg-[#f87171]"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-4">
              <p className="text-lg font-semibold text-gray-900">Platform Activity</p>
            </CardHeader>
            <CardContent className="divide-y divide-gray-100 text-[13px]">
              <div className="flex justify-between gap-4 py-3">
                <span className="text-[#64748b]">Member Since</span>
                <span className="font-semibold text-gray-900">Apr 10, 2025</span>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <span className="text-[#64748b]">Last Login</span>
                <span className="font-semibold text-gray-900">
                  May 15, 2025, 10:24 AM
                </span>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <span className="text-[#64748b]">Current Plan</span>
                <span className="font-semibold text-gray-900">Professional</span>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <span className="text-[#64748b]">Active Users</span>
                <span className="font-semibold text-gray-900">24 / 50</span>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <span className="text-[#64748b]">Total Customers</span>
                <span className="font-semibold text-gray-900">102</span>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <span className="text-[#64748b]">Total Ad Accounts</span>
                <span className="font-semibold text-gray-900">128</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-[#fca5a5] bg-[#fff7f7] shadow-sm">
            <CardHeader className="gap-3 border-none pb-4">
              <div className="flex items-start gap-2">
                <div className="mt-1 flex size-8 items-center justify-center rounded-full bg-[#fee2e2] text-[#b91c1c]">
                  <Trash2 className="size-4" aria-hidden />
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#991b1b]">Danger Zone</p>
                  <p className="text-[13px] leading-relaxed text-[#991b1b]/80">
                    Permanently delete your account and all associated data.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full rounded-xl border-[#f87171] font-semibold text-[#dc2626] hover:bg-[#fee2e2]"
                type="button"
              >
                <Trash2 className="me-2 size-4" />
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>

      <footer className="mt-8 flex flex-col gap-3 border-t border-gray-100 pt-6 text-[13px] text-[#94a3b8] md:flex-row md:items-center md:justify-between">
        <span>© 2025 adAlert.io. All rights reserved.</span>
        <div className="flex flex-wrap gap-4 font-semibold text-[#015AFD]">
          <Link className="hover:underline" href="#">
            Privacy Policy
          </Link>
          <Link className="hover:underline" href="#">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}
