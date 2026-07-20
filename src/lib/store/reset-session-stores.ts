import { useSummaryStore } from '@/app/summary/summary-store';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import { useUserAdsAccountsStore } from '@/lib/store/user-ads-accounts-store';
import { useAlertSettingsStore } from '@/lib/store/settings-store';

/**
 * Clears in-memory domain state that is not scoped by user.
 * Call on logout and whenever Firebase auth becomes null so the next
 * session cannot briefly (or permanently) show another account's data.
 */
export function resetSessionStores(): void {
  useSummaryStore.getState().reset();
  useDashboardStore.getState().reset();
  useUserAdsAccountsStore.getState().reset();
  useAlertSettingsStore.getState().reset();
}
