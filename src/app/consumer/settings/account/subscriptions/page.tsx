"use client";

import ConsumerSubscriptionsPage from "@/features/consumer/settings/pages/ConsumerSubscriptionsPage";
import { ConsumerSettingsPageShell } from "@/features/consumer/settings/pages/ConsumerSettingsPageShell";

export default function ConsumerAccountSubscriptionsPageRoute() {
  return (
    <ConsumerSettingsPageShell
      title="Subscriptions"
      description="Review plan details, pricing, and account subscription status."
    >
      <ConsumerSubscriptionsPage consumerShell />
    </ConsumerSettingsPageShell>
  );
}
