"use client";

import { ProtectedRoute } from "@/components/auth";
import Alerts from "./Alerts";

export default function AlertsWrapper() {
  return (
    <ProtectedRoute>
      <Alerts />
    </ProtectedRoute>
  );
}
