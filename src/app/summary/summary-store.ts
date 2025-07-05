import { create } from "zustand";
import { collection, getDocs, query, where, doc, DocumentReference, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { COLLECTIONS, ALERT_SEVERITIES } from "@/lib/constants";
import moment from "moment";
import { getFirebaseFnPath } from "@/lib/utils";
import { useAlertOptionSetsStore } from "@/lib/store/alert-option-sets-store";
import type { DashboardDaily } from "@/lib/store/dashboard-store";

export interface SummaryAdsAccount {
  id: string;
  Id: string;
  isConnected: boolean;
  accountName: string;
  showingAds: boolean | null;
  impact: {
    critical: number;
    medium: number;
    low: number;
  };
  spendMtd: number | null;
  spendMtdIndicatorKey: string | null;
  monthlyBudget: number | null;
  currencySymbol: string;
  dashboardDailyId: string | null;
  progressBar: {
    percent: number;
    dayPercent: number;
    day: number;
    daysInMonth: number;
  };
}

interface SummaryStoreState {
  accounts: SummaryAdsAccount[];
  allAdsAccounts: any[];
  loading: boolean;
  error: string | null;
  fetchSummaryAccounts: (userDoc: any) => Promise<void>;
}

export const useSummaryStore = create<SummaryStoreState>((set, get) => ({
  accounts: [],
  allAdsAccounts: [],
  loading: false,
  error: null,

  fetchSummaryAccounts: async (userDoc) => {
    set({ loading: true, error: null });
    try {
      // 1. Fetch all selected ads accounts for the company admin
      const adsAccountRef = collection(db, COLLECTIONS.ADS_ACCOUNTS);
      const companyAdminRef = userDoc["Company Admin"];
      const adsAccountQuery = query(
        adsAccountRef,
        where("User", "==", companyAdminRef),
        where("Is Selected", "==", true)
      );
      const adsAccountSnap = await getDocs(adsAccountQuery);
      const adsAccounts = adsAccountSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // 2. For each account, fetch dashboardDaily, spendMtd, kpiData, spendMtdIndicator, showingAdsLabel, and alert counts
      const alertOptionSets = useAlertOptionSetsStore.getState().alertOptionSets;
      const fetchAll = await Promise.all(
        adsAccounts.map(async (account: any) => {
          // Fetch dashboardDaily for today
          const today = moment().startOf("day");
          const tomorrow = moment().endOf("day");
          const dashboardDailiesRef = collection(db, COLLECTIONS.DASHBOARD_DAILIES);
          const dashboardDailyQuery = query(
            dashboardDailiesRef,
            where("Ads Account", "==", doc(db, COLLECTIONS.ADS_ACCOUNTS, account.id)),
            where("Created Date", ">=", Timestamp.fromDate(today.toDate())),
            where("Created Date", "<=", Timestamp.fromDate(tomorrow.toDate()))
          );
          const dashboardDailySnap = await getDocs(dashboardDailyQuery);
          let dashboardDaily: DashboardDaily | null = null;
          if (!dashboardDailySnap.empty) {
            dashboardDaily = { id: dashboardDailySnap.docs[0].id, ...dashboardDailySnap.docs[0].data() } as DashboardDaily;
          }

          // Fetch spend MTD
          let spendMtd: number | null = null;
          let spendMtdIndicatorKey: string | null = null;
          if (dashboardDaily && dashboardDaily["Spend MTD"] !== undefined) {
            spendMtd = dashboardDaily["Spend MTD"] ?? null;
          } else {
            // Optionally, call the spend MTD endpoint if needed
            spendMtd = null;
          }
          if (dashboardDaily && dashboardDaily["Spend MTD Indicator Alert"]) {
            spendMtdIndicatorKey = dashboardDaily["Spend MTD Indicator Alert"]?.["Key"] || null;
          }

          // Fetch showing ads label
          let showingAds: boolean | null = null;
          const showingAdsRef = collection(db, COLLECTIONS.DASHBOARD_SHOWING_ADS);
          const startOfHour = moment().startOf("hour").toDate();
          const endOfHour = moment().endOf("hour").toDate();
          const showingAdsQuery = query(
            showingAdsRef,
            where("Ads Account", "==", doc(db, COLLECTIONS.ADS_ACCOUNTS, account.id)),
            where("Date", ">=", startOfHour),
            where("Date", "<=", endOfHour)
          );
          const showingAdsSnap = await getDocs(showingAdsQuery);
          
          if (showingAdsSnap.size === 0) {
            // No record exists for the current hour, trigger label check
            console.log("No 'Dashboard Showing Ads' record for the current hour. Triggering label check.");
            const path = getFirebaseFnPath("dashboard-display-showing-ads-label-fb");
            
            await fetch(path, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                adsAccountId: account.id,
              }),
            });
            
            // After creating the record, fetch it
            const updatedShowingAdsSnap = await getDocs(showingAdsQuery);
            if (!updatedShowingAdsSnap.empty) {
              showingAds = updatedShowingAdsSnap.docs[0].data()["Is Showing Ads"] ?? null;
            }
          } else {
            // Record already exists, use it
            showingAds = showingAdsSnap.docs[0].data()["Is Showing Ads"] ?? null;
          }

          // Fetch alert counts by severity
          const alertsRef = collection(db, COLLECTIONS.ALERTS);
          const alertsQuery = query(
            alertsRef,
            where("Ads Account", "==", doc(db, COLLECTIONS.ADS_ACCOUNTS, account.id))
          );
          const alertsSnap = await getDocs(alertsQuery);
          let critical = 0, medium = 0, low = 0;
          alertsSnap.docs.forEach((doc) => {
            const severity = doc.data().Severity;
            if (severity === ALERT_SEVERITIES.CRITICAL) critical++;
            else if (severity === ALERT_SEVERITIES.MEDIUM) medium++;
            else if (severity === ALERT_SEVERITIES.LOW) low++;
          });

          // Progress bar logic
          const spend = Number(spendMtd ?? 0);
          const monthlyBudget = Number(account["Monthly Budget"] ?? 1);
          const now = moment();
          const day = now.date();
          const daysInMonth = now.daysInMonth();
          const percent = monthlyBudget ? Math.min((spend / monthlyBudget) * 100, 100) : 0;
          const dayPercent = (day / daysInMonth) * 100;

          return {
            id: account.id,
            Id: account["Id"],
            isConnected: !!account["Is Connected"],
            accountName: account["Account Name Editable"] || account["Account Name Original"] || "-",
            showingAds,
            impact: { critical, medium, low },
            spendMtd,
            spendMtdIndicatorKey,
            monthlyBudget: account["Monthly Budget"] ?? null,
            currencySymbol: account["Currency Symbol"] || "$",
            dashboardDailyId: dashboardDaily ? dashboardDaily.id : null,
            progressBar: { percent, dayPercent, day, daysInMonth },
          } as SummaryAdsAccount;
        })
      );
      set({ accounts: fetchAll, allAdsAccounts: adsAccounts, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
})); 