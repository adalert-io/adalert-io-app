"use client";

import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AddAdsAccount() {
  const { user, isFullAccess } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/auth");
    }
  }, [user, router]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Add Ads Account</h1>
      <div className="bg-white rounded-lg shadow p-6">
        {/* Add your ads account connection form here */}
        <p className="text-gray-600">
          Connect your ads account to get started.
        </p>
      </div>
    </div>
  );
}
