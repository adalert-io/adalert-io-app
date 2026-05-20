"use client";

import ConsumerUsersPage from "@/features/consumer/settings/pages/ConsumerUsersPage";
import { ConsumerSettingsPageShell } from "@/features/consumer/settings/pages/ConsumerSettingsPageShell";

export default function ConsumerSettingsUsersPageRoute() {
  return (
    <ConsumerSettingsPageShell
      title="Users"
      description="Invite teammates, manage roles, and control account access."
    >
      <ConsumerUsersPage consumerShell />
    </ConsumerSettingsPageShell>
  );
}
