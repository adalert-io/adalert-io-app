// Subscription Status Constants
export const SUBSCRIPTION_STATUS = {
  TRIAL_NEW: "Trial New",
  TRIAL_ENDED: "Trial Ended",
  CANCELLED: "Cancelled",
  PAYMENT_FAILED: "Payment Failed",
  ACTIVE: "Active",
} as const;

// Subscription Period Constants
export const SUBSCRIPTION_PERIODS = {
  TRIAL_DAYS: 7,
  PAYMENT_FAILED_GRACE_DAYS: 3,
} as const;

// User Type Constants
export const USER_TYPES = {
  ADMIN: "Admin",
  USER: "User",
} as const;

// Collection Names
export const COLLECTIONS = {
  USERS: "users",
  SUBSCRIPTIONS: "subscriptions",
  ALERT_SETTINGS: "alertSettings",
  AUTH_TRACKERS: "authenticationPageTrackers",
  STRIPE_COMPANIES: "stripeCompanies",
} as const;

export const FIREBASE_FN_DOMAINS = {
  // DEV: "adalert-kmotjdlnmq-uc.a.run.app",
  DEV: "127.0.0.1:5001/adalertdev/us-central1/test",
  PROD: "adalert-kmotjdlnmq-uc.a.run.app",
  // ACTUAL_PROD: "adalert-msrjiafroa-uc.a.run.app",
};
