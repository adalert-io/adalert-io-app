"use client";

import { Header } from "@/components/layout/header";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { useAuthStore } from "@/lib/store/auth-store";
import { SUBSCRIPTION_STATUS } from "@/lib/constants";

const MAIN_TABS = [
  { label: "Settings", value: "settings" },
  { label: "Account", value: "account" },
  { label: "My Profile", value: "my-profile" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentMainTab = pathname?.split("/")[2] || "settings";
  const { subscription } = useAuthStore();

  // Check if subscription is expired/limited
  const isSubscriptionExpired = React.useMemo(() => {
    if (!subscription) return false;
    const status = subscription["User Status"];
    return (
      status === SUBSCRIPTION_STATUS.TRIAL_ENDED ||
      status === SUBSCRIPTION_STATUS.CANCELED ||
      status === SUBSCRIPTION_STATUS.PAYMENT_FAILED
    );
  }, [subscription]);

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <Header />
      <div className="w-full flex flex-col items-center mt-[90px] sm:mt-[90px] md:mt-8 ">
        <div className="flex gap-4 bg-white rounded-2xl shadow-md p-2 mb-8">
          {MAIN_TABS.map((tab) => {
            const isSettingsTab = tab.value === "settings";
            const isDisabled = isSettingsTab && isSubscriptionExpired;

            return (
              <Link
                key={tab.value}
                href={
                  isDisabled
                    ? "#"
                    : `/settings/${tab.value}${
                        tab.value === "settings"
                          ? "/alerts"
                          : tab.value === "account"
                          ? "/subscriptions"
                          : ""
                      }`
                }
                className={`px-3 py-2 rounded-sm font-semibold text-base transition-all sm:px-6 py-2 rounded-xl ${
                  currentMainTab === tab.value
                    ? "bg-blue-600 text-white"
                    : isDisabled
                    ? "text-gray-400 cursor-not-allowed opacity-50 bg-gray-100"
                    : "text-[#7A7D9C] hover:bg-blue-50"
                }`}
                aria-current={currentMainTab === tab.value ? "page" : undefined}
                onClick={isDisabled ? (e) => e.preventDefault() : undefined}
                title={
                  isDisabled
                    ? "Subscription expired. Please renew to access settings."
                    : undefined
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
        <div className="w-full max-w-4xl">{children}</div>
      </div>
    </div>
  );
}
