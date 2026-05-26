import {
  CONSUMER_DASHBOARD_HREF,
  CONSUMER_MISSION_CONTROL_HREF,
} from "./consumer-console-nav";

export const CONSUMER_BILLING_HREF = "/consumer/settings/account/billing";

const CONSUMER_ORG_SETTINGS_PREFIX = "/consumer/settings/settings/";

export function isConsumerBillingPath(pathname: string): boolean {
  return (
    pathname === CONSUMER_BILLING_HREF ||
    pathname.startsWith(`${CONSUMER_BILLING_HREF}/`)
  );
}

/** Paths reachable without paid / active trial (matches classic `ProtectedRoute`). */
export function isConsumerPathAllowedWithoutFullAccess(pathname: string): boolean {
  return isConsumerBillingPath(pathname);
}

export function isConsumerOrgSettingsPath(pathname: string): boolean {
  return pathname.startsWith(CONSUMER_ORG_SETTINGS_PREFIX);
}

export function isConsumerNavHrefDisabledWhenExpired(href: string): boolean {
  if (href === CONSUMER_MISSION_CONTROL_HREF) return true;
  if (href === CONSUMER_DASHBOARD_HREF || href.startsWith(`${CONSUMER_DASHBOARD_HREF}/`)) {
    return true;
  }
  if (isConsumerOrgSettingsPath(href)) return true;
  if (href === "/consumer/settings/my-profile") return true;
  return false;
}

export const CONSUMER_SUBSCRIPTION_EXPIRED_NAV_TITLE =
  "Subscription expired. Upgrade on the billing page to continue.";
