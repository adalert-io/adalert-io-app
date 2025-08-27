// Application Name Constant
export const APPLICATION_NAME = "adAlert.io";

// Subscription Status Constants
export const SUBSCRIPTION_STATUS = {
  TRIAL_NEW: "Trial New",
  TRIAL_ENDED: "Trial Ended",
  CANCELED: "Canceled",
  PAYMENT_FAILED: "Payment Failed",
  PAYING: "Paying",
  ACTIVE: "Active"
} as const;

// Subscription Period Constants
export const SUBSCRIPTION_PERIODS = {
  TRIAL_DAYS: 7,
  PAYMENT_FAILED_GRACE_DAYS: 3
} as const;

// User Type Constants
export const USER_TYPES = {
  ADMIN: "Admin",
  USER: "User"
} as const;

// Collection Names
export const COLLECTIONS = {
  USERS: "users",
  ADS_ACCOUNTS: "adsAccounts",
  SUBSCRIPTIONS: "subscriptions",
  ALERT_SETTINGS: "alertSettings",
  AUTH_TRACKERS: "authenticationPageTrackers",
  STRIPE_COMPANIES: "stripeCompanies",
  ALERTS: "alerts",
  DASHBOARD_DAILIES: "dashboardDailies",
  ALERT_OPTION_SETS: "alertOptionSets",
  DASHBOARD_SHOWING_ADS: "dashboardShowingAds"
} as const;

export const FIREBASE_FN_DOMAINS = {
  // DEV: "adalert-kmotjdlnmq-uc.a.run.app",
  DEV: "127.0.0.1:5001/adalertdev/us-central1/test",
  // PROD: "adalert-kmotjdlnmq-uc.a.run.app", // dev project
  PROD: "adalert-msrjiafroa-uc.a.run.app" // prod project
};

export const ALERT_SEVERITIES = {
  CRITICAL: "Critical",
  MEDIUM: "Medium",
  LOW: "Low"
};

export const ALERT_SEVERITY_COLORS = {
  CRITICAL: "#ED1A22",
  MEDIUM: "#FF8028",
  LOW: "#ECE31B"
};

// Reusable class for checkboxes
export const CHECKBOX_CLASS =
  "data-[state=checked]:bg-blue-700 data-[state=checked]:border-blue-700";

// Subscription Prices
export const SUBSCRIPTION_PRICES = {
  FIRST_ADS_ACCOUNT: 59,
  ADDITIONAL_ADS_ACCOUNT: 19
} as const;
