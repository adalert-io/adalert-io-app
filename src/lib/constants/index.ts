// Application Name Constant
export const APPLICATION_NAME = "adAlert.io";

// Subscription Status Constants
export const SUBSCRIPTION_STATUS = {
  TRIAL_NEW: "Trial New",
  TRIAL_ENDED: "Trial Ended",
  CANCELED: "Canceled",
  PAYMENT_FAILED: "Payment Failed",
  PAYING: "Paying",
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
  ADS_ACCOUNTS: "adsAccounts",
  SUBSCRIPTIONS: "subscriptions",
  ALERT_SETTINGS: "alertSettings",
  AUTH_TRACKERS: "authenticationPageTrackers",
  STRIPE_COMPANIES: "stripeCompanies",
  ALERTS: "alerts",
  DASHBOARD_DAILIES: "dashboardDailies",
  ALERT_OPTION_SETS: "alertOptionSets",
  DASHBOARD_SHOWING_ADS: "dashboardShowingAds",
} as const;

export const FIREBASE_FN_DOMAINS = {
  // DEV: "adalert-kmotjdlnmq-uc.a.run.app",
  DEV: "127.0.0.1:5001/adalertdev/us-central1/test",
  // PROD: "adalert-kmotjdlnmq-uc.a.run.app", // dev project
  PROD: "adalert-msrjiafroa-uc.a.run.app", // prod project
};

export const ALERT_SEVERITIES = {
  CRITICAL: "Critical",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const ALERT_SEVERITY_COLORS = {
  CRITICAL: "#ED1A22",
  MEDIUM: "#FF8028",
  LOW: "#ECE31B",
};

// Reusable class for checkboxes
export const CHECKBOX_CLASS =
  "data-[state=checked]:bg-blue-700 data-[state=checked]:border-blue-700";

// Subscription Prices
export const SUBSCRIPTION_PRICES = {
  FIRST_ADS_ACCOUNT: 59,
  ADDITIONAL_ADS_ACCOUNT: 19,
} as const;

export const DEFAULT_ADS_ACCOUNT_VARIABLE = {
  // 'Ads Account': null,
  // User: null
  // DailyBudget: 0,
  // MonthlyBudget: 0,
  AdCTRLowArr: "",
  AdCTRTodayLowCount: 0,
  AdCTRTodayVeryLowCount: 0,
  AdCTRVeryLowArr: "",
  AllConv14Counter: 0,
  AllConv28Counter: 0,
  ASO_AllConv14: 0,
  ASO_AllConv28: 0,
  ASO_Conv14_1: 0,
  ASO_Conv14_2: 0,
  ASO_Conv30: 0,
  ASO_Conv7: 0,
  ASO_Interactions14: 0,
  ASO_Interactions30: 0,
  ASO_Interactions7: 0,
  ASO_invalidClicks: 0,
  BudgetCounter: 0,
  BudgetCounter25down: 0,
  BudgetCounter33_5up: 0,
  BudgetCounter5_25down: 0,
  BudgetCounter5_75up: 0,
  BudgetCounter66_5down: 0,
  BudgetCounter75up: 0,
  Conv14counter1: 0,
  Conv14counter2: 0,
  Conv30counter: 0,
  Conv7counter: 0,
  ConvRate14counter: 0,
  ConvRate30counter: 0,
  CPA14counter1: 0,
  CPA14counter2: 0,
  CPA30counter: 0,
  CPA7counter: 0,
  CPC14counter1: 0,
  CPC14counter2: 0,
  CPC30counter: 0,
  CPC7counter: 0,
  CTR14counter1: 0,
  CTR14counter2: 0,
  CTR30counter: 0,
  CTR7counter: 0,
  DisapprovedAdsArr: "",
  DisapprovedAssetsArr: "",
  EligibleLimitedAds: 0,
  EligibleLimitedAdsArr: "",
  EligibleLimitedAssetsArr: "",
  ImprTop14counter: 0,
  ImprTop30counter: 0,
  Interactions14counter: 0,
  Interactions30counter: 0,
  Interactions7counter: 0,
  InvalidClicks: 0,
  InvalidClicksHigh: 0,
  KwCPAHighArr: "",
  KwCPALowArr: "",
  KwCPAMediumArr: "",
  KwCPATodayHighCount: 0,
  KwCPATodayLowCount: 0,
  KwCPATodayMediumCount: 0,
  KwCPCHighArr: "",
  KwCPCLowArr: "",
  KwCPCMediumArr: "",
  KwCPCTodayHighCount: 0,
  KwCPCTodayLowCount: 0,
  KwCPCTodayMediumCount: 0,
  KwCTRLowArr: "",
  KwCTRTodayLowCount: 0,
  KwCTRTodayVeryLowCount: 0,
  KwCTRVeryLowArr: "",
  NumApprovedLimitedStatusAds: 0,
  NumAverageStrengthAds: 0,
  NumDisapprovedAds: 0,
  NumDisapprovedAssets: 0,
  NumDisapprovedStatusAds: 0,
  NumEligibleLimitedAds: 0,
  NumEligibleLimitedAssets: 0,
  NumLowQualityScoreKeywords: 0,
  NumPoorStrengthAds: 0,
  OptimizationScore: 0,
  OptimizationScoreLow: 0,
  SearchIS14counter: 0,
  SearchIS30counter: 0,
  ServingAdsCounter: 0,
  SpeedScore: 0,
};
