"use client";

import { ProtectedRoute } from "@/components/auth";
import Summary from "./Summary";

export default function SummaryWrapper() {
  return (
    <ProtectedRoute>
      <Summary />
    </ProtectedRoute>
  );
}
