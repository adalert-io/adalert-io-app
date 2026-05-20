"use client";

import ConsumerCompanyDetailsPage from "@/features/consumer/settings/pages/ConsumerCompanyDetailsPage";
import { ConsumerSettingsPageShell } from "@/features/consumer/settings/pages/ConsumerSettingsPageShell";

export default function ConsumerAccountCompanyDetailsPageRoute() {
  return (
    <ConsumerSettingsPageShell
      title="Company Details"
      description="Keep your legal and invoicing profile information up to date."
    >
      <ConsumerCompanyDetailsPage consumerShell />
    </ConsumerSettingsPageShell>
  );
}
