"use client";

import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/auth");
    } else {
      // Redirect to default tab if at /settings
      router.replace("/settings/settings/alerts");
    }
  }, [user, router]);

  return null;
}
