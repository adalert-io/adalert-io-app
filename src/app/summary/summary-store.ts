import { create } from "zustand";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  DocumentReference,
  Timestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
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
  isRefreshing: boolean;
  fetchSummaryAccounts: (userDoc: any) => Promise<void>;
}

export const useSummaryStore = create<SummaryStoreState>((set, get) => ({
  accounts: [],
  allAdsAccounts: [],
  loading: false,
  error: null,
  isRefreshing: false,

  fetchSummaryAccounts: async (userDoc) => {
    // Check if we already have data - if so, this is a background refresh
    const hasExistingData = get().accounts.length > 0;

    if (hasExistingData) {
      // Background refresh - don't show loading, just set refreshing flag
      set({ isRefreshing: true });
    } else {
      // Initial load - show loading
      set({ loading: true, error: null });
    }

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
      const alertOptionSets =
        useAlertOptionSetsStore.getState().alertOptionSets;
      const fetchAll = await Promise.all(
        adsAccounts.map(async (account: any) => {
          // Fetch dashboardDaily for today
          const today = moment().startOf("day");
          const tomorrow = moment().endOf("day");
          const dashboardDailiesRef = collection(
            db,
            COLLECTIONS.DASHBOARD_DAILIES
          );
          const dashboardDailyQuery = query(
            dashboardDailiesRef,
            where(
              "Ads Account",
              "==",
              doc(db, COLLECTIONS.ADS_ACCOUNTS, account.id)
            ),
            where("Created Date", ">=", Timestamp.fromDate(today.toDate())),
            where("Created Date", "<=", Timestamp.fromDate(tomorrow.toDate()))
          );
          const dashboardDailySnap = await getDocs(dashboardDailyQuery);
          let dashboardDaily: DashboardDaily | null = null;
          if (!dashboardDailySnap.empty) {
            dashboardDaily = {
              id: dashboardDailySnap.docs[0].id,
              ...dashboardDailySnap.docs[0].data(),
            } as DashboardDaily;
          } else {
            // Document doesn't exist, create a new one
            const newDashboardDailyRef = doc(
              collection(db, COLLECTIONS.DASHBOARD_DAILIES)
            );
            const now = Timestamp.now();

            const newDashboardDailyData = {
              id: newDashboardDailyRef.id,
              "Ads Account": doc(db, COLLECTIONS.ADS_ACCOUNTS, account.id),
              "Created Date": now,
              "Modified Date": now,
            };

            await setDoc(newDashboardDailyRef, newDashboardDailyData);
            dashboardDaily = newDashboardDailyData as DashboardDaily;
          }

          // Fetch spend MTD
          let spendMtd: number | null = null;
          let spendMtdIndicatorKey: string | null = null;
          if (dashboardDaily && dashboardDaily["Spend MTD"] !== undefined) {
            spendMtd = dashboardDaily["Spend MTD"] ?? null;
          } else {
            // Fetch spend MTD from the API and update dashboardDaily
            try {
              const path = getFirebaseFnPath("dashboard-spend-mtd-fb");

              const response = await fetch(path, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  adsAccountId: account.id,
                  customerId: account["Id"],
                  loginCustomerId: account["Manager Account Id"],
                }),
              });

              if (response.ok) {
                const result = await response.json();
                console.log("Spend MTD result:", result);

                spendMtd = result.spendMtd ?? null;

                // Update the dashboardDaily document with the spendMtd value
                if (dashboardDaily) {
                  const dashboardDailyRef = doc(
                    db,
                    COLLECTIONS.DASHBOARD_DAILIES,
                    dashboardDaily.id
                  );
                  await updateDoc(dashboardDailyRef, {
                    "Spend MTD": result.spendMtd,
                    "Modified Date": Timestamp.now(),
                  });

                  // Update the local dashboardDaily object
                  dashboardDaily = {
                    ...dashboardDaily,
                    "Spend MTD": result.spendMtd,
                  };
                }
              } else {
                console.error("Failed to fetch spend MTD data");
                spendMtd = null;
              }
            } catch (error) {
              console.error("Error fetching spend MTD:", error);
              spendMtd = null;
            }
          }

          console.log("dashboardDaily: ", dashboardDaily);

          if (dashboardDaily && dashboardDaily["Spend MTD Indicator Alert"]) {
            spendMtdIndicatorKey =
              dashboardDaily["Spend MTD Indicator Alert"]?.["Key"] || null;
          } else if (
            dashboardDaily &&
            !dashboardDaily["Spend MTD Indicator Alert"]
          ) {
            // No spend MTD indicator exists, fetch it
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
              const userTokenRef = account["User Token"] as DocumentReference;

              const response = await fetch(path, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  adsAccountId: account.Id,
                  adsAccountManagerAccountId: account["Manager Account Id"],
                  userTokenId: userTokenRef.id,
                  monthlyBudget: account["Monthly Budget"],
                  dailyBudget: account["Daily Budget"],
                }),
              });

              console.log("response: ", response);

              if (response.ok) {
                const result = await response.json();
                console.log("result: ", result);
                const indicatorAlert = freshAlertOptionSets.find(
                  (item) => item["Key"] === result.alert
                );

                // Update the dashboardDaily document
                const dashboardDailyRef = doc(
                  db,
                  COLLECTIONS.DASHBOARD_DAILIES,
                  dashboardDaily.id
                );
                await updateDoc(dashboardDailyRef, {
                  "Spend MTD Indicator Alert": indicatorAlert || null,
                  "Last Fetch Spend MTD": Timestamp.now(),
                  "Modified Date": Timestamp.now(),
                });

                spendMtdIndicatorKey = indicatorAlert?.["Key"] || null;
              }
            } catch (error) {
              console.error("Error fetching spend MTD indicator:", error);
              spendMtdIndicatorKey = null;
            }
          }

          // Fetch showing ads label
          let showingAds: boolean | null = null;
          const showingAdsRef = collection(
            db,
            COLLECTIONS.DASHBOARD_SHOWING_ADS
          );
          const startOfHour = moment().startOf("hour").toDate();
          const endOfHour = moment().endOf("hour").toDate();
          const showingAdsQuery = query(
            showingAdsRef,
            where(
              "Ads Account",
              "==",
              doc(db, COLLECTIONS.ADS_ACCOUNTS, account.id)
            ),
            where("Date", ">=", startOfHour),
            where("Date", "<=", endOfHour)
          );
          const showingAdsSnap = await getDocs(showingAdsQuery);

          if (showingAdsSnap.size === 0) {
            // No record exists for the current hour, trigger label check
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
                adsAccountId: account.id,
              }),
            });

            // After creating the record, fetch it
            const updatedShowingAdsSnap = await getDocs(showingAdsQuery);
            if (!updatedShowingAdsSnap.empty) {
              showingAds =
                updatedShowingAdsSnap.docs[0].data()["Is Showing Ads"] ?? null;
            }
          } else {
            // Record already exists, use it
            showingAds =
              showingAdsSnap.docs[0].data()["Is Showing Ads"] ?? null;
          }

          // Fetch alert counts by severity
          const alertsRef = collection(db, COLLECTIONS.ALERTS);
          const alertsQuery = query(
            alertsRef,
            where(
              "Ads Account",
              "==",
              doc(db, COLLECTIONS.ADS_ACCOUNTS, account.id)
            )
          );
          const alertsSnap = await getDocs(alertsQuery);
          let critical = 0,
            medium = 0,
            low = 0;
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
          const percent = monthlyBudget
            ? Math.min((spend / monthlyBudget) * 100, 100)
            : 0;
          const dayPercent = (day / daysInMonth) * 100;

          console.log("monthlyBudget: ", monthlyBudget);
          console.log("spend: ", spend);
          console.log("monthlyBudget: ", monthlyBudget);
          console.log("percent: ", percent);
          console.log("dayPercent: ", dayPercent);
          console.log("day: ", day);
          console.log("daysInMonth: ", daysInMonth);

          return {
            id: account.id,
            Id: account["Id"],
            isConnected: !!account["Is Connected"],
            accountName:
              account["Account Name Editable"] ||
              account["Account Name Original"] ||
              "-",
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
      set({
        accounts: fetchAll,
        allAdsAccounts: adsAccounts,
        loading: false,
        isRefreshing: false,
      });
    } catch (err: any) {
      set({ error: err.message, loading: false, isRefreshing: false });
    }
  },
}));
