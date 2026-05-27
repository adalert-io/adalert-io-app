import { CONSUMER_HELP_HREF } from "./help/helpers";
import {
  CONSUMER_DASHBOARD_HREF,
  CONSUMER_MISSION_CONTROL_HREF,
} from "./consumer-console-nav";

export const CONSUMER_BILLING_HREF = "/consumer/settings/account/billing";

const CONSUMER_ORG_SETTINGS_PREFIX = "/consumer/settings/settings/";
const CONSUMER_ACCOUNT_SETTINGS_PREFIX = "/consumer/settings/account/";
const CONSUMER_PROFILE_HREF = "/consumer/settings/my-profile";

export function isConsumerBillingPath(pathname: string): boolean {
  return (
    pathname === CONSUMER_BILLING_HREF ||
    pathname.startsWith(`${CONSUMER_BILLING_HREF}/`)
  );
}

export function isConsumerAccountSettingsPath(pathname: string): boolean {
  return pathname.startsWith(CONSUMER_ACCOUNT_SETTINGS_PREFIX);
}

export function isConsumerProfilePath(pathname: string): boolean {
  return (
    pathname === CONSUMER_PROFILE_HREF ||
    pathname.startsWith(`${CONSUMER_PROFILE_HREF}/`)
  );
}

export function isConsumerHelpPath(pathname: string): boolean {
  return (
    pathname === CONSUMER_HELP_HREF ||
    pathname.startsWith(`${CONSUMER_HELP_HREF}/`)
  );
}

/** Account, profile, and help stay reachable when trial is expired. */
export function isConsumerPathAllowedWithoutFullAccess(pathname: string): boolean {
  return (
    isConsumerAccountSettingsPath(pathname) ||
    isConsumerProfilePath(pathname) ||
    isConsumerHelpPath(pathname)
  );
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
  return false;
}

export const CONSUMER_SUBSCRIPTION_EXPIRED_NAV_TITLE =
  "Subscription expired. Upgrade on the billing page to continue.";
