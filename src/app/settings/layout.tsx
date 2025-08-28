'use client';

import { Header } from '@/components/layout/header';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { SUBSCRIPTION_STATUS } from '@/lib/constants';

const MAIN_TABS = [
  { label: 'Settings', value: 'settings' },
  { label: 'Account', value: 'account' },
  { label: 'My Profile', value: 'my-profile' },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentMainTab = pathname?.split('/')[2] || 'settings';
  const { subscription, isFullAccess, userDoc } = useAuthStore();

  // Use isFullAccess from auth store instead of calculating locally
  const isSubscriptionExpired = !isFullAccess;

  // Filter tabs based on user type
  const filteredTabs = MAIN_TABS.filter((tab) => {
    if (tab.value === 'account' && userDoc?.['User Type'] === 'Manager') {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <Header />
      <div className="w-full flex flex-col items-center mt-8">
        <div className="flex gap-4 bg-white rounded-2xl shadow-md p-2 mb-8">
          {filteredTabs.map((tab) => {
            const isSettingsTab = tab.value === 'settings';
            const isDisabled = isSettingsTab && isSubscriptionExpired;

            return (
              <Link
                key={tab.value}
                href={
                  isDisabled
                    ? '#'
                    : `/settings/${tab.value}${
                        tab.value === 'settings'
                          ? '/alerts'
                          : tab.value === 'account'
                          ? '/subscriptions'
                          : ''
                      }`
                }
                className={`px-6 py-2 rounded-xl font-semibold text-base transition-all ${
                  currentMainTab === tab.value
                    ? 'bg-blue-600 text-white'
                    : isDisabled
                    ? 'text-gray-400 cursor-not-allowed opacity-50 bg-gray-100'
                    : 'text-[#7A7D9C] hover:bg-blue-50'
                }`}
                aria-current={currentMainTab === tab.value ? 'page' : undefined}
                onClick={isDisabled ? (e) => e.preventDefault() : undefined}
                title={
                  isDisabled
                    ? 'Subscription expired. Please renew to access settings.'
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
