"use client";

import ConsumerBillingPage from "@/features/consumer/settings/pages/ConsumerBillingPage";
import { ConsumerSettingsPageShell } from "@/features/consumer/settings/pages/ConsumerSettingsPageShell";

export default function ConsumerAccountBillingPageRoute() {
  return (
    <ConsumerSettingsPageShell
      title="Billing"
      description="Update payment methods and review invoice and receipt history."
    >
      <ConsumerBillingPage consumerShell />
    </ConsumerSettingsPageShell>
  );
}
