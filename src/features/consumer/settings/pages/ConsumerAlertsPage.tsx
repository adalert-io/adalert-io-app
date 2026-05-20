"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { Info, Loader2, Mail, MessageSquare } from "lucide-react";
import { useAlertSettingsStore } from "@/lib/store/settings-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { CHECKBOX_CLASS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const FIELD_MAP = [
  // Email/SMS
  {
    key: "Send Email Alerts",
    label: (
      <>
        Send me in <span className="font-bold">Email</span> alerts
      </>
    ),
    id: "email-alerts",
  },
  {
    key: "Send SMS Alerts",
    label: (
      <>
        Send me in <span className="font-bold">SMS</span> alerts{" "}
        <span className="font-normal text-xs">(critical alerts only)</span>
      </>
    ),
    id: "sms-alerts",
  },
  // Severity
  {
    key: "Severity Critical",
    label: "Critical",
    id: "critical",
    group: "Severity",
  },
  { key: "Severity Medium", label: "Medium", id: "medium", group: "Severity" },
  { key: "Severity Low", label: "Low", id: "low", group: "Severity" },
  // Level
  { key: "Level Account", label: "Account", id: "account", group: "Level" },
  { key: "Level Ads", label: "Ads", id: "ads", group: "Level" },
  { key: "Level Keyword", label: "Keyword", id: "keyword", group: "Level" },
  // Type
  {
    key: "Type Ad Performance",
    label: "Ad Performance",
    id: "ad-performance",
    group: "Type",
  },
  {
    key: "Type Brand Checker",
    label: "Brand Checker",
    id: "brand-checker",
    group: "Type",
  },
  { key: "Type Budget", label: "Budget", id: "budget", group: "Type" },
  {
    key: "Type KPI Trends",
    label: "KPI Trends",
    id: "kpi-trends",
    group: "Type",
  },
  {
    key: "Type Keyword Performance",
    label: "Keyword Performance",
    id: "keyword-performance",
    group: "Type",
  },
  {
    key: "Type Landing Page",
    label: "Landing Page",
    id: "landing-page",
    group: "Type",
  },
  {
    key: "Type Optimization Score",
    label: "Optimization Score",
    id: "optimization-score",
    group: "Type",
  },
  { key: "Type Policy", label: "Policy", id: "policy", group: "Type" },
  {
    key: "Type Serving Ads",
    label: "Serving Ads",
    id: "serving-ads",
    group: "Type",
  },
];

interface AlertsSubtabProps {
  /** Consumer console: slate styling + profile link under `/consumer`. */
  consumerShell?: boolean;
}

export default function AlertsSubtab({ consumerShell = false }: AlertsSubtabProps) {
  const { user } = useAuthStore();
  const userDoc = useAuthStore().userDoc;
  const {
    alertSettings,
    loading,
    error,
    fetchAlertSettings,
    refreshAlertSettings,
    updateAlertSettings,
    loadedUserId,
  } = useAlertSettingsStore();
  const [localSettings, setLocalSettings] = useState<Record<string, boolean>>(
    {}
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.uid && loadedUserId !== user.uid) fetchAlertSettings(user.uid);
  }, [user?.uid, loadedUserId, fetchAlertSettings]);

  // On mount or when tab becomes active again, force refresh to avoid stale state
  useEffect(() => {
    if (!user?.uid) return;
    const onFocus = () => refreshAlertSettings(user.uid);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.uid, refreshAlertSettings]);

  useEffect(() => {
    if (alertSettings) {
      setLocalSettings(
        Object.fromEntries(
          FIELD_MAP.map((f) => [
            f.key,
            !!alertSettings[f.key as keyof typeof alertSettings],
          ])
        )
      );
    }
  }, [alertSettings]);

  const handleCheckbox = (key: string) => {
    setLocalSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!user?.uid || !alertSettings) return;
    setSaving(true);
    try {
      await updateAlertSettings(user.uid, localSettings);
      await refreshAlertSettings(user.uid);
      toast.success("Alert settings saved successfully!");
    } catch (error: any) {
      console.error("Failed to save alert settings:", error);
      toast.error(error?.message || "Failed to save alert settings");
    } finally {
      setSaving(false);
    }
  };

  // Group fields for rendering
  const getFieldsByGroup = (group: string) =>
    FIELD_MAP.filter((f) => f.group === group);

  const profileHref = consumerShell
    ? "/consumer/settings/my-profile"
    : "/settings/my-profile";

  const groupCardClassName = cn(
    "rounded-2xl border border-slate-200 bg-white shadow-sm",
    consumerShell && "border-slate-200/90 shadow-sm",
  );

  return (
    <div
      className={cn(
        "min-w-0",
        consumerShell
          ? "mx-auto max-w-[1480px] space-y-6 pb-4"
          : "bg-white p-4",
      )}
    >
      {!consumerShell && (
        <>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold">Alerts</h2>
          </div>
          <p className="text-base mb-8 text-gray-500">
            Control alerts frequency, add SMS, add or remove notification
            categories
          </p>
        </>
      )}
      {error && <div className="mb-4 text-red-600">{error}</div>}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          className={cn(
            "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
            consumerShell && "border-slate-200/90",
          )}
        >
          <div className="flex items-center gap-4">
            <Checkbox
              checked={!!localSettings["Send Email Alerts"]}
              onCheckedChange={() => handleCheckbox("Send Email Alerts")}
              className={CHECKBOX_CLASS}
              id="email-alerts"
            />
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#015AFD]/10 text-[#015AFD]">
              <Mail className="h-5 w-5" />
            </span>
            <label
              htmlFor="email-alerts"
              className="select-none text-[15px] font-medium text-slate-800"
            >
              Send me in <span className="font-semibold">Email</span> alerts
            </label>
          </div>
        </Card>
        <Card
          className={cn(
            "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
            consumerShell && "border-slate-200/90",
          )}
        >
          <div className="flex items-center gap-4">
            <Checkbox
              checked={!!localSettings["Send SMS Alerts"]}
              onCheckedChange={() => handleCheckbox("Send SMS Alerts")}
              className={CHECKBOX_CLASS}
              id="sms-alerts"
              disabled={!userDoc?.Telephone || !(userDoc && userDoc["Telephone Dial Code"]) }
            />
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#015AFD]/10 text-[#015AFD]">
              <MessageSquare className="h-5 w-5" />
            </span>
            <label
              htmlFor="sms-alerts"
              className="select-none text-[15px] font-medium text-slate-800"
            >
              Send me in <span className="font-semibold">SMS</span> alerts{" "}
              <span className="font-normal text-xs text-slate-500">
                (critical alerts only)
              </span>
            </label>
          </div>
          <div
            className={cn(
              "mt-3 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600",
            )}
          >
            <Info className="h-4 w-4 text-[#015AFD]" />
            Update phone or withdraw consent in{" "}
            <Link
              href={profileHref}
              className={cn(
                "font-medium text-blue-600 underline",
                consumerShell && "text-[#015AFD] hover:text-[#0146ca]",
              )}
            >
              My Profile
            </Link>
          </div>
        </Card>
      </div>

      {localSettings["Send Email Alerts"] && (
        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className={cn(groupCardClassName, "lg:col-span-3")}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Severity</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {getFieldsByGroup("Severity").map((f) => (
                <div key={f.key} className="flex items-center gap-3 px-5 py-3">
                  <Checkbox
                    checked={!!localSettings[f.key]}
                    onCheckedChange={() => handleCheckbox(f.key)}
                    id={f.id}
                    className={CHECKBOX_CLASS}
                  />
                  <label htmlFor={f.id} className="select-none text-[15px] text-slate-700">
                    {f.label}
                  </label>
                </div>
              ))}
            </div>
          </Card>

          <Card className={cn(groupCardClassName, "lg:col-span-3")}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Level</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {getFieldsByGroup("Level").map((f) => (
                <div key={f.key} className="flex items-center gap-3 px-5 py-3">
                  <Checkbox
                    checked={!!localSettings[f.key]}
                    onCheckedChange={() => handleCheckbox(f.key)}
                    id={f.id}
                    className={CHECKBOX_CLASS}
                  />
                  <label htmlFor={f.id} className="select-none text-[15px] text-slate-700">
                    {f.label}
                  </label>
                </div>
              ))}
            </div>
          </Card>

          <Card className={cn(groupCardClassName, "lg:col-span-6")}>
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Type</h3>
            </div>
            <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-3">
              {getFieldsByGroup("Type").map((f) => (
                <div key={f.key} className="flex items-center gap-3 px-5 py-3">
                  <Checkbox
                    checked={!!localSettings[f.key]}
                    onCheckedChange={() => handleCheckbox(f.key)}
                    id={f.id}
                    className={CHECKBOX_CLASS}
                  />
                  <label htmlFor={f.id} className="select-none text-[15px] text-slate-700">
                    {f.label}
                  </label>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
      <div className="mt-8 flex justify-center">
        <Button
          onClick={handleSave}
          disabled={saving || loading}
          className={cn(
            "min-w-[180px] rounded px-8 py-3 text-sm font-semibold text-white shadow-md",
            consumerShell
              ? "rounded-xl bg-[#015AFD] hover:bg-[#0146ca]"
              : "bg-blue-600 font-normal",
          )}
        >
          {saving ? (
            <>
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
      </div>
    </div>
  );
}
