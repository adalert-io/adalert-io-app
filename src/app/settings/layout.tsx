"use client";

import { Header } from '@/components/layout/header';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

const MAIN_TABS = [
  { label: 'Settings', value: 'settings' },
  { label: 'Account', value: 'account' },
  { label: 'My Profile', value: 'my-profile' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentMainTab = pathname?.split('/')[2] || 'settings';

  return (
    <div className="min-h-screen bg-[#FAFBFF]">
      <Header />
      <div className="w-full flex flex-col items-center mt-8">
        <div className="flex gap-4 bg-white rounded-2xl shadow-md p-2 mb-8">
          {MAIN_TABS.map(tab => (
            <Link
              key={tab.value}
              href={`/settings/${tab.value}${tab.value === 'settings' ? '/alerts' : tab.value === 'account' ? '/subscriptions' : ''}`}
              className={`px-6 py-2 rounded-xl font-semibold text-base transition-all ${currentMainTab === tab.value ? 'bg-blue-600 text-white' : 'text-[#7A7D9C] hover:bg-blue-50'}`}
              aria-current={currentMainTab === tab.value ? 'page' : undefined}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <div className="w-full max-w-4xl">
          {children}
        </div>
      </div>
    </div>
  );
} 