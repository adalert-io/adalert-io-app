"use client";

import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Summary() {
  const { user, isFullAccess } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
    }
  }, [user, router]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Weekly Summary</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-6">
          {/* Performance Summary */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Performance Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700">Impressions</h3>
                <p className="text-2xl font-bold">--</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700">Clicks</h3>
                <p className="text-2xl font-bold">--</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700">Conversions</h3>
                <p className="text-2xl font-bold">--</p>
              </div>
            </div>
          </section>

          {/* Alerts Summary */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Alerts Summary</h2>
            <div className="space-y-4">
              <p className="text-gray-600">No alerts for this period.</p>
            </div>
          </section>

          {/* Recommendations */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
            <div className="space-y-4">
              <p className="text-gray-600">No recommendations available.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
