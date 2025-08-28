"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

const ACCOUNT_SUBTABS = [
  { label: 'Subscriptions', value: 'subscriptions' },
  { label: 'Billing', value: 'billing' },
  { label: 'Company Details', value: 'company-details' },
];

export default function AccountTabLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentSubtab = pathname?.split('/')[3] || 'subscriptions';

  return (
<div className="w-full flex flex-col items-start p-4">
  {/* Outer Card */}
  <div className="bg-white rounded-2xl shadow w-full overflow-hidden">
    
    {/* Tabs */}
    <div className="flex gap-4 border-b p-0">
      {ACCOUNT_SUBTABS.map((subtab) => (
        <Link
          key={subtab.value}
          href={`/settings/account/${subtab.value}`}
          className={`px-2 py-2 font-normal text-base transition-all sm:px-4 ${
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
    <div className="p-6">
      {children}
    </div>
  </div>
</div>



  );
} 