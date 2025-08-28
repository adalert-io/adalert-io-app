'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { useAuthStore } from '@/lib/store/auth-store';

const SETTINGS_SUBTABS = [
  { label: 'Alerts', value: 'alerts' },
  { label: 'Users', value: 'users' },
  { label: 'Ad Accounts', value: 'ad-accounts' },
];

export default function SettingsTabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentSubtab = pathname?.split('/')[3] || 'alerts';
  const { userDoc } = useAuthStore();

  // Filter tabs based on user type
  const filteredSubtabs = SETTINGS_SUBTABS.filter((tab) => {
    if (
      (tab.value === 'users' || tab.value === 'ad-accounts') &&
      userDoc?.['User Type'] === 'Manager'
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="w-full flex flex-col items-start">
      {/* Outer Card */}
      <div className="bg-white rounded-2xl shadow w-full overflow-hidden">
        {/* Tabs */}
        <div className="flex gap-4 border-b p-0">
          {filteredSubtabs.map((subtab) => (
            <Link
              key={subtab.value}
              href={`/settings/settings/${subtab.value}`}
              className={`px-4 py-2 font-normal text-base transition-all ${
                currentSubtab === subtab.value
                  ? 'bg-blue-600 text-white'
                  : 'text-[#7A7D9C] hover:bg-blue-50'
              }`}
              aria-current={currentSubtab === subtab.value ? 'page' : undefined}
            >
              {subtab.label}
            </Link>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
