"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountMainTabPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/settings/account/subscriptions');
  }, [router]);
  return null;
} 