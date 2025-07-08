"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsMainTabPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/settings/settings/alerts');
  }, [router]);
  return null;
} 