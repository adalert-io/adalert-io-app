import { create } from "zustand";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  DocumentReference,
  Timestamp,
  setDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { COLLECTIONS } from "@/lib/constants";
import moment from "moment";
import { getFirebaseFnPath } from "@/lib/utils";
import { useAlertOptionSetsStore } from "./alert-option-sets-store";
import { useUserAdsAccountsStore } from "./user-ads-accounts-store";

export interface Alert {
  id: string;
  "Ads Account": DocumentReference;
  Alert: string;
  "Alert Key": string;
  "Date Found": Timestamp;
  "Long Description": string;
  "Long Description Plain Text": string;
  Severity: string;
  "Is Archived"?: boolean;
  // [key: string]: any;
}

export interface DashboardDaily {
  id: string;
  "Ads Account": DocumentReference;
  "Created Date": Timestamp;
  "Modified Date": Timestamp;
  "Spend MTD"?: number | null;
  "Spend MTD Indicator Alert"?: any | null;
  "Last Fetch Spend MTD"?: Timestamp | null;

  // KPIs from dashboard-kpi-fb
  "Is KPI Fetched"?: boolean;
  conversions7?: number;
  conversionsPercentage7?: number;
  cpa7?: number;
  cpaPercentage7?: number;
  cpc7?: number;
  cpcPercentage7?: number;
  ctr7?: number;
  ctrPercentage7?: number;
  searchImpressionShare7?: number;
  searchImpressionSharePercentage7?: number;
  topImpressionPercentage7?: number;
  topImpressionPercentagePercentage7?: number;
  costMicros7?: number;
  costMicrosPercentage7?: number;
  impressions7?: number;
  impressionsPercentage7?: number;
  interactions7?: number;
  interactionsPercentage7?: number;
  invalidClicks7?: number;
  invalidClicksPercentage7?: number;
  conversions30?: number;
  conversionsPercentage30?: number;
  cpa30?: number;
  cpaPercentage30?: number;
  cpc30?: number;
  cpcPercentage30?: number;
  ctr30?: number;
  ctrPercentage30?: number;
  searchImpressionShare30?: number;
  searchImpressionSharePercentage30?: number;
  topImpressionPercentage30?: number;
  topImpressionPercentagePercentage30?: number;
  costMicros30?: number;
  costMicrosPercentage30?: number;
  impressions30?: number;
  impressionsPercentage30?: number;
  interactions30?: number;
  interactionsPercentage30?: number;
  invalidClicks30?: number;
  invalidClicksPercentage30?: number;
  conversions90?: number;
  conversionsPercentage90?: number;
  cpa90?: number;
  cpaPercentage90?: number;
  cpc90?: number;
  cpcPercentage90?: number;
  ctr90?: number;
  ctrPercentage90?: number;
  searchImpressionShare90?: number;
  searchImpressionSharePercentage90?: number;
  topImpressionPercentage90?: number;
  topImpressionPercentagePercentage90?: number;
  costMicros90?: number;
  costMicrosPercentage90?: number;
  impressions90?: number;
  impressionsPercentage90?: number;
  interactions90?: number;
  interactionsPercentage90?: number;
  invalidClicks90?: number;
  invalidClicksPercentage90?: number;

  [key: string]: any;
}

interface DashboardState {
  alerts: Alert[];
  dashboardDaily: DashboardDaily | null;
  adsLabel: any | null;
  loading: boolean;
  spendMtdLoading: boolean;
  spendMtdIndicatorLoading: boolean;
  kpiDataLoading: boolean;
  currencySymbolLoading: boolean;
  error: string | null;
  fetchAlerts: (adsAccountId: string) => Promise<void>;
  fetchOrCreateDashboardDaily: (adsAccountId: string) => Promise<void>;
  fetchSpendMtd: (adsAccount: any) => Promise<void>;
  fetchSpendMtdIndicator: (adsAccount: any) => Promise<void>;
  fetchKpiData: (adsAccount: any) => Promise<void>;
  fetchCurrencySymbol: (adsAccount: any) => Promise<void>;
  triggerShowingAdsLabel: (adsAccount: any) => Promise<void>;
  updateMonthlyBudget: (adsAccountId: string, newMonthlyBudget: number, currentMonthlyBudget: number) => Promise<boolean>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  alerts: [],
  dashboardDaily: null,
  adsLabel: null,
  loading: false,
  spendMtdLoading: false,
  spendMtdIndicatorLoading: false,
  kpiDataLoading: false,
  currencySymbolLoading: false,
  error: null,

  fetchAlerts: async (adsAccountId: string) => {
    console.log("useDashboardStore - adsAccountId: ", adsAccountId);
    set({ loading: true, error: null });
    try {
      const alertsRef = collection(db, COLLECTIONS.ALERTS);
      const alertsQuery = query(
        alertsRef,
        where(
          "Ads Account",
          "==",
          doc(db, COLLECTIONS.ADS_ACCOUNTS, adsAccountId)
        ),
        orderBy("Date Found", "desc")
      );
      const alertsSnap = await getDocs(alertsQuery);
      const alerts: Alert[] = alertsSnap.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...(doc.data() as Partial<Alert>),
          } as Alert)
      );

      console.log("alerts from useDashboardStore: ", alerts);

      set({ alerts, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchOrCreateDashboardDaily: async (adsAccountId: string) => {
    try {
      console.log(
        "Fetching or creating dashboardDaily for adsAccountId:",
        adsAccountId
      );

      // Get today's date range using moment.js
      const today = moment().startOf("day");
      const tomorrow = moment().endOf("day");

      // Query for existing dashboardDaily document
      const dashboardDailiesRef = collection(db, COLLECTIONS.DASHBOARD_DAILIES);
      const dashboardDailyQuery = query(
        dashboardDailiesRef,
        where(
          "Ads Account",
          "==",
          doc(db, COLLECTIONS.ADS_ACCOUNTS, adsAccountId)
        ),
        where("Created Date", ">=", Timestamp.fromDate(today.toDate())),
        where("Created Date", "<=", Timestamp.fromDate(tomorrow.toDate()))
      );

      const dashboardDailySnap = await getDocs(dashboardDailyQuery);

      if (!dashboardDailySnap.empty) {
        // Document exists, use the first one
        const existingDoc = dashboardDailySnap.docs[0];
        const dashboardDailyData = {
          id: existingDoc.id,
          ...existingDoc.data(),
        } as DashboardDaily;

        console.log("Found existing dashboardDaily:", dashboardDailyData);
        set({ dashboardDaily: dashboardDailyData });
      } else {
        // Document doesn't exist, create a new one
        const newDashboardDailyRef = doc(
          collection(db, COLLECTIONS.DASHBOARD_DAILIES)
        );
        const now = Timestamp.now();

        const newDashboardDailyData = {
          id: newDashboardDailyRef.id,
          "Ads Account": doc(db, COLLECTIONS.ADS_ACCOUNTS, adsAccountId),
          "Created Date": now,
          "Modified Date": now,
        };

        await setDoc(newDashboardDailyRef, newDashboardDailyData);

        console.log("Created new dashboardDaily:", newDashboardDailyData);
        set({ dashboardDaily: newDashboardDailyData });
      }
    } catch (error: any) {
      console.error("Error fetching or creating dashboardDaily:", error);
      set({ error: error.message });
    }
  },

  fetchSpendMtd: async (adsAccount: any) => {
    try {
      console.log("Fetching spend MTD for adsAccount:", adsAccount);
      set({ spendMtdLoading: true, error: null });

      const path = getFirebaseFnPath("dashboard-spend-mtd-fb");

      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adsAccountId: adsAccount.id,
          customerId: adsAccount["Id"],
          loginCustomerId: adsAccount["Manager Account Id"],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch spend MTD data");
      }

      const result = await response.json();
      console.log("Spend MTD result:", result);

      // Update the dashboardDaily state with the spendMtd value
      const currentDashboardDaily = get().dashboardDaily;
      if (currentDashboardDaily) {
        const updatedDashboardDaily = {
          ...currentDashboardDaily,
          "Spend MTD": result.spendMtd,
        };

        console.log(
          "Updated dashboardDaily with spend MTD:",
          updatedDashboardDaily
        );
        set({ dashboardDaily: updatedDashboardDaily, spendMtdLoading: false });
      } else {
        set({ spendMtdLoading: false });
      }
    } catch (error: any) {
      console.error("Error fetching spend MTD:", error);
      const currentDashboardDaily = get().dashboardDaily;
      if (currentDashboardDaily) {
        set({
          dashboardDaily: { ...currentDashboardDaily, "Spend MTD": null },
          error: error.message,
          spendMtdLoading: false,
        });
      } else {
        set({ error: error.message, spendMtdLoading: false });
      }
    }
  },

  fetchSpendMtdIndicator: async (adsAccount: any) => {
    set({ spendMtdIndicatorLoading: true, error: null });
    try {
      // Ensure alertOptionSets are loaded before proceeding
      const { alertOptionSets, fetchAlertOptionSets } =
        useAlertOptionSetsStore.getState();
      if (alertOptionSets.length === 0) {
        await fetchAlertOptionSets();
      }
      const freshAlertOptionSets =
        useAlertOptionSetsStore.getState().alertOptionSets;

      const path = getFirebaseFnPath("dashboard-spendMtd-indicator-fb");
      const userTokenRef = adsAccount["User Token"] as DocumentReference;

      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adsAccountId: adsAccount.Id,
          adsAccountManagerAccountId: adsAccount["Manager Account Id"],
          userTokenId: userTokenRef.id,
          monthlyBudget: adsAccount["Monthly Budget"],
          dailyBudget: adsAccount["Daily Budget"],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch spend MTD indicator");
      }

      const result = await response.json();
      console.log("Spend MTD indicator result:", result);

      const indicatorAlert = freshAlertOptionSets.find(
        (item) => item["Key"] === result.alert
      );
      console.log("indicatorAlert:", indicatorAlert);

      const currentDashboardDaily = get().dashboardDaily;
      if (currentDashboardDaily) {
        const updatedDashboardDaily = {
          ...currentDashboardDaily,
          "Spend MTD Indicator Alert": indicatorAlert || null,
          "Last Fetch Spend MTD": Timestamp.now(),
        };
        set({
          dashboardDaily: updatedDashboardDaily,
          spendMtdIndicatorLoading: false,
        });
      } else {
        set({ spendMtdIndicatorLoading: false });
      }
    } catch (error: any) {
      console.error("Error fetching spend MTD indicator:", error);
      const currentDashboardDaily = get().dashboardDaily;
      if (currentDashboardDaily) {
        set({
          dashboardDaily: {
            ...currentDashboardDaily,
            "Spend MTD Indicator Alert": null,
            "Last Fetch Spend MTD": Timestamp.now(),
          },
          error: error.message,
          spendMtdIndicatorLoading: false,
        });
      } else {
        set({ error: error.message, spendMtdIndicatorLoading: false });
      }
    }
  },

  fetchKpiData: async (adsAccount: any) => {
    set({ kpiDataLoading: true, error: null });
    try {
      const path = getFirebaseFnPath("dashboard-kpi-fb");

      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adsAccountId: adsAccount.id,
          customerId: adsAccount.Id,
          loginCustomerId: adsAccount["Manager Account Id"],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch KPI data");
      }

      const result = await response.json();
      console.log("KPI data result:", result);

      const currentDashboardDaily = get().dashboardDaily;
      if (currentDashboardDaily) {
        const updatedDashboardDaily = {
          ...currentDashboardDaily,
          ...result,
          "Is KPI Fetched": true,
        };
        set({
          dashboardDaily: updatedDashboardDaily,
          kpiDataLoading: false,
        });
      } else {
        set({ kpiDataLoading: false });
      }
    } catch (error: any) {
      console.error("Error fetching KPI data:", error);
      const currentDashboardDaily = get().dashboardDaily;
      if (currentDashboardDaily) {
        set({
          dashboardDaily: {
            ...currentDashboardDaily,
            // "Is KPI Fetched": "No"
          },
          error: error.message,
          kpiDataLoading: false,
        });
      } else {
        set({ error: error.message, kpiDataLoading: false });
      }
    }
  },

  fetchCurrencySymbol: async (adsAccount: any) => {
    console.log("Fetching currency symbol for adsAccount:", adsAccount);
    set({ currencySymbolLoading: true, error: null });
    try {
      const path = getFirebaseFnPath("dashboard-customer-currency-symbol-fb");
      const userTokenRef = adsAccount["User Token"] as DocumentReference;

      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userTokenId: userTokenRef.id,
          adsAccountId: adsAccount.Id,
          adsAccountManagerAccountId: adsAccount["Manager Account Id"],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch currency symbol");
      }

      const result = await response.json();
      console.log("Currency symbol result:", result);

      // Update the state in the other store
      useUserAdsAccountsStore
        .getState()
        .updateAdAccountCurrencySymbol(adsAccount.id, result.symbol);

      set({ currencySymbolLoading: false });
    } catch (error: any) {
      console.error("Error fetching currency symbol:", error);
      set({ error: error.message, currencySymbolLoading: false });
    }
  },

  triggerShowingAdsLabel: async (adsAccount: any) => {
    try {
      const adsAccountId = adsAccount.id;
      const startOfHour = moment().startOf("hour").toDate();
      const endOfHour = moment().endOf("hour").toDate();

      const showingAdsRef = collection(db, COLLECTIONS.DASHBOARD_SHOWING_ADS);
      const q = query(
        showingAdsRef,
        where(
          "Ads Account",
          "==",
          doc(db, COLLECTIONS.ADS_ACCOUNTS, adsAccountId)
        ),
        where("Date", ">=", startOfHour),
        where("Date", "<=", endOfHour)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.size === 0) {
        console.log(
          "No 'Dashboard Showing Ads' record for the current hour. Triggering label check."
        );
        const path = getFirebaseFnPath(
          "dashboard-display-showing-ads-label-fb"
        );

        await fetch(path, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            adsAccountId: adsAccountId,
          }),
        });

        // After creating the record, fetch it and store in adsLabel state
        const updatedQuerySnapshot = await getDocs(q);
        if (updatedQuerySnapshot.size > 0) {
          const firstRecord = updatedQuerySnapshot.docs[0];
          const adsLabelData = {
            id: firstRecord.id,
            ...firstRecord.data(),
          };
          console.log("Fetched ads label data after creation:", adsLabelData);
          set({ adsLabel: adsLabelData });
        }
      } else {
        console.log(
          "'Dashboard Showing Ads' record already exists for the current hour. Skipping label check."
        );
        
        // Store the existing record in adsLabel state
        const firstRecord = querySnapshot.docs[0];
        const adsLabelData = {
          id: firstRecord.id,
          ...firstRecord.data(),
        };
        console.log("Fetched existing ads label data:", adsLabelData);
        set({ adsLabel: adsLabelData });
      }
    } catch (error: any) {
      console.error("Error in triggerShowingAdsLabel:", error);
      set({ error: error.message });
    }
  },

  updateMonthlyBudget: async (adsAccountId: string, newMonthlyBudget: number, currentMonthlyBudget: number) => {
    if (newMonthlyBudget === currentMonthlyBudget) return false;
    const dailyBudget = Number((newMonthlyBudget / 30.4).toFixed(2));
    try {
      // Update ads account
      const accountRef = doc(db, COLLECTIONS.ADS_ACCOUNTS, adsAccountId);
      await updateDoc(accountRef, {
        "Monthly Budget": newMonthlyBudget,
        "Daily Budget": dailyBudget,
      });
      // Update adsAccountVariables
      const adsAccountVarQuery = query(
        collection(db, "adsAccountVariables"),
        where("Ads Account", "==", accountRef)
      );
      const adsAccountVarSnap = await getDocs(adsAccountVarQuery);
      if (!adsAccountVarSnap.empty) {
        const adsAccountVarRef = adsAccountVarSnap.docs[0].ref;
        await updateDoc(adsAccountVarRef, {
          "MonthlyBudget": newMonthlyBudget,
          "DailyBudget": dailyBudget,
        });
      }
      // Fetch the updated ads account
      const updatedDoc = await getDoc(doc(db, COLLECTIONS.ADS_ACCOUNTS, adsAccountId));
      let updatedAccount = null;
      if (updatedDoc.exists()) {
        updatedAccount = { id: updatedDoc.id, ...updatedDoc.data() };
        // Update selectedAdsAccount in user-ads-accounts-store
        useUserAdsAccountsStore.getState().setSelectedAdsAccount(updatedAccount);
      }
      // Update local state for dashboardDaily if needed
      const currentDashboardDaily = get().dashboardDaily;
      if (currentDashboardDaily && updatedAccount) {
        set({
          dashboardDaily: {
            ...currentDashboardDaily,
            "Monthly Budget": (updatedAccount as any)["Monthly Budget"],
            "Daily Budget": (updatedAccount as any)["Daily Budget"],
          },
        });
      }
      // Refetch with the fresh account object
      if (updatedAccount) {
        await get().fetchSpendMtd(updatedAccount);
        await get().fetchSpendMtdIndicator(updatedAccount);
      }
      return true;
    } catch (err) {
      console.error("Failed to update monthly budget", err);
      return false;
    }
  },
}));
