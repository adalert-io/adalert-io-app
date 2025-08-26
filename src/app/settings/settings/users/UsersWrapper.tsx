"use client";

import { ProtectedRoute } from "@/components/auth";
import Users from "./Users";

export default function UsersWrapper() {
  return (
    <ProtectedRoute>
      <Users />
    </ProtectedRoute>
  );
}
