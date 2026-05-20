"use client";

import ConsumerAlertsPage from "@/features/consumer/settings/pages/ConsumerAlertsPage";
import { ConsumerSettingsPageShell } from "@/features/consumer/settings/pages/ConsumerSettingsPageShell";

export default function ConsumerSettingsAlertsPageRoute() {
  return (
    <ConsumerSettingsPageShell
      title="Alerts"
      description="Configure how and when your team receives notifications."
    >
      <ConsumerAlertsPage consumerShell />
    </ConsumerSettingsPageShell>
  );
}
