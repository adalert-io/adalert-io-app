"use client";

import { ProtectedRoute } from "@/components/auth";
import { AddAdsAccount } from "./AddAdsAccount";

export default function AddAdsAccountWrapper() {
  return (
    <ProtectedRoute>
      <AddAdsAccount />
    </ProtectedRoute>
  );
}
