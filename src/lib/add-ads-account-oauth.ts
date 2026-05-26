/** Passed through Google OAuth `state` and read on `/redirect`. */
export const ADD_ADS_ACCOUNT_OAUTH_STATE = {
  consumer: "consumer-add-ads-account",
  settings: "settings-add-ads-account",
  classic: "classic-add-ads-account",
} as const;

export type AddAdsAccountOAuthState =
  (typeof ADD_ADS_ACCOUNT_OAUTH_STATE)[keyof typeof ADD_ADS_ACCOUNT_OAUTH_STATE];

export const CONSUMER_ADD_ADS_ACCOUNT_STORAGE_KEY = "consumerAddAdsAccountDialog";

export function markConsumerAddAdsAccountReturn(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CONSUMER_ADD_ADS_ACCOUNT_STORAGE_KEY, "1");
  localStorage.setItem(CONSUMER_ADD_ADS_ACCOUNT_STORAGE_KEY, "1");
}

export function isConsumerAddAdsAccountOAuthReturn({
  oauthState,
  page,
}: {
  oauthState: string | null;
  page: string | null;
}): boolean {
  if (oauthState === ADD_ADS_ACCOUNT_OAUTH_STATE.consumer) {
    return true;
  }
  if (page === "add-ads-account-consumer") {
    return true;
  }
  if (typeof window === "undefined" || page !== "add-ads-account") {
    return false;
  }
  return (
    sessionStorage.getItem(CONSUMER_ADD_ADS_ACCOUNT_STORAGE_KEY) === "1" ||
    localStorage.getItem(CONSUMER_ADD_ADS_ACCOUNT_STORAGE_KEY) === "1"
  );
}

export function clearConsumerAddAdsAccountReturnMarker(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CONSUMER_ADD_ADS_ACCOUNT_STORAGE_KEY);
  localStorage.removeItem(CONSUMER_ADD_ADS_ACCOUNT_STORAGE_KEY);
}

export const CONSUMER_ADD_ADS_ACCOUNT_RETURN_PATH =
  "/consumer/summary?addAccount=open";
