"use client";

import ConsumerAdAccountsPage from "@/features/consumer/settings/pages/ConsumerAdAccountsPage";
import { ConsumerSettingsPageShell } from "@/features/consumer/settings/pages/ConsumerSettingsPageShell";

export default function ConsumerSettingsAdAccountsPageRoute() {
  return (
    <ConsumerSettingsPageShell
      title="Ad Accounts"
      description="Manage connected ad accounts and update account-level settings."
    >
      <ConsumerAdAccountsPage consumerShell />
    </ConsumerSettingsPageShell>
  );
}
