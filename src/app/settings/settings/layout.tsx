"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

const SETTINGS_SUBTABS = [
  { label: 'Alerts', value: 'alerts' },
  { label: 'Users', value: 'users' },
  { label: 'Ad Accounts', value: 'ad-accounts' },
];

export default function SettingsTabLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentSubtab = pathname?.split('/')[3] || 'alerts';

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex gap-4 bg-[#F6F8FB] rounded-2xl shadow p-2 mb-8">
        {SETTINGS_SUBTABS.map(subtab => (
          <Link
            key={subtab.value}
            href={`/settings/settings/${subtab.value}`}
            className={`px-4 py-2 rounded-xl font-medium text-base transition-all ${currentSubtab === subtab.value ? 'bg-blue-600 text-white' : 'text-[#7A7D9C] hover:bg-blue-50'}`}
            aria-current={currentSubtab === subtab.value ? 'page' : undefined}
          >
            {subtab.label}
          </Link>
        ))}
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
} 