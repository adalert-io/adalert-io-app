"use client";

import ConsumerMyProfilePage from "@/features/consumer/settings/pages/ConsumerMyProfilePage";
import { ConsumerSettingsPageShell } from "@/features/consumer/settings/pages/ConsumerSettingsPageShell";

export default function ConsumerMyProfilePageRoute() {
  return (
    <ConsumerSettingsPageShell
      title="My Profile"
      description="Manage your account profile, contact info, and notification preferences."
    >
      <ConsumerMyProfilePage consumerShell />
    </ConsumerSettingsPageShell>
  );
}
