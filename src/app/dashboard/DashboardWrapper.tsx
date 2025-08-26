"use client";

import { ProtectedRoute } from "@/components/auth";
import Dashboard from "./Dashboard";

export default function DashboardWrapper() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
