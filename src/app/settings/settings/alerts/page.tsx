"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Info } from "lucide-react";
import { useAlertSettingsStore } from "@/lib/store/settings-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { CHECKBOX_CLASS } from "@/lib/constants";

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

export default function AlertsSubtab() {
  const { user } = useAuthStore();
  const userDoc = useAuthStore().userDoc;
  const {
    alertSettings,
    loading,
    error,
    fetchAlertSettings,
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
    await updateAlertSettings(user.uid, localSettings);
    await fetchAlertSettings(user.uid);
    setSaving(false);
  };

  // Group fields for rendering
  const getFieldsByGroup = (group: string) =>
    FIELD_MAP.filter((f) => f.group === group);

  return (
    <div className="bg-white p-4">
      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-2xl font-bold">Alerts</h2>
        {loading && <span className="text-blue-600 text-base">Loading...</span>}
      </div>
      <p className="text-gray-500 text-base mb-8">
        Control alerts frequency, add SMS, add or remove notification categories
      </p>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {/* Email/SMS */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <Card className="flex-1 p-4 border-2 shadow-none">
          <div className="flex flex-row items-center justify-center gap-3 w-full h-full">
            <Checkbox
              checked={!!localSettings["Send Email Alerts"]}
              onCheckedChange={() => handleCheckbox("Send Email Alerts")}
              className={`mr-2 ${CHECKBOX_CLASS}`}
              id="email-alerts"
            />
            <label
              htmlFor="email-alerts"
              className="text-base font-normal select-none"
            >
              Send me in <span className="font-bold">Email</span> alerts
            </label>
          </div>
        </Card>
        <Card className="flex-1 p-4 flex flex-col gap-2 border-2 shadow-none">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={!!localSettings["Send SMS Alerts"]}
              onCheckedChange={() => handleCheckbox("Send SMS Alerts")}
              className={`mr-3 ${CHECKBOX_CLASS}`}
              id="sms-alerts"
              disabled={!userDoc?.Telephone || !(userDoc && userDoc["Telephone Dial Code"]) }
            />
            <label
              htmlFor="sms-alerts"
              className="text-base font-normal select-none"
            >
              Send me in <span className="font-bold">SMS</span> alerts{" "}
              <span className="font-normal text-xs">
                (critical alerts only)
              </span>
            </label>
          </div>
          <div className="flex items-center gap-2 mt-1 ml-7 text-xs text-gray-500 bg-gray-100 rounded-lg px-3 py-2">
            <Info className="w-4 h-4 text-blue-400" />
            Update phone or withdraw consent in{" "}
            <Link
              href="/settings/my-profile"
              className="text-blue-600 underline font-medium"
            >
              My Profile
            </Link>
          </div>
        </Card>
      </div>
      {/* Severity */}
      <div className="mb-8">
        <div className="font-semibold text-lg mb-2">Severity</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {getFieldsByGroup("Severity").map((f) => (
            <Card key={f.key} className="flex items-center gap-3 p-4 shadow-none">
              <div className="flex flex-row items-center gap-3 w-full h-full">
                <Checkbox
                  checked={!!localSettings[f.key]}
                  onCheckedChange={() => handleCheckbox(f.key)}
                  id={f.id}
                  className={`mr-2 ${CHECKBOX_CLASS}`}
                />
                <label
                  htmlFor={f.id}
                  className="text-base font-normal select-none"
                >
                  {f.label}
                </label>
              </div>
            </Card>
          ))}
        </div>
      </div>
      {/* Level */}
      <div className="mb-8">
        <div className="font-semibold text-lg mb-2">Level</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {getFieldsByGroup("Level").map((f) => (
            <Card key={f.key} className="flex items-center gap-3 p-4 shadow-none">
              <div className="flex flex-row items-center gap-3 w-full h-full">
                <Checkbox
                  checked={!!localSettings[f.key]}
                  onCheckedChange={() => handleCheckbox(f.key)}
                  id={f.id}
                  className={`mr-2 ${CHECKBOX_CLASS}`}
                />
                <label
                  htmlFor={f.id}
                  className="text-base font-normal select-none"
                >
                  {f.label}
                </label>
              </div>
            </Card>
          ))}
        </div>
      </div>
      {/* Type */}
      <div className="mb-8">
        <div className="font-semibold text-lg mb-2">Type</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {getFieldsByGroup("Type").map((f) => (
            <Card key={f.key} className="flex items-center gap-3 p-4 shadow-none">
              <div className="flex flex-row items-center gap-3 w-full h-full">
                <Checkbox
                  checked={!!localSettings[f.key]}
                  onCheckedChange={() => handleCheckbox(f.key)}
                  id={f.id}
                  className={`mr-2 ${CHECKBOX_CLASS}`}
                />
                <label
                  htmlFor={f.id}
                  className="text-base font-normal select-none"
                >
                  {f.label}
                </label>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <div className="flex justify-center mt-8">
        <Button
          onClick={handleSave}
          disabled={saving || loading}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
