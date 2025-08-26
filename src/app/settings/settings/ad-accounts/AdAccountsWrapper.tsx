"use client";

import { ProtectedRoute } from "@/components/auth";
import AdAccounts from "./AdAccounts";

export default function AdAccountsWrapper() {
  return (
    <ProtectedRoute>
      <AdAccounts />
    </ProtectedRoute>
  );
}
