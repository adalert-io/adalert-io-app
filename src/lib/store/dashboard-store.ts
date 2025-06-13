import { create } from "zustand";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  DocumentReference,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { COLLECTIONS } from "@/lib/constants";

export interface Alert {
  id: string;
  "Ads Account": DocumentReference;
  Alert: string;
  "Alert Key": string;
  "Date Found": Timestamp;
  "Long Description": string;
  "Long Description Plain Text": string;
  Severity: string;
  // [key: string]: any;
}

interface DashboardState {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  fetchAlerts: (adsAccountId: string) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  alerts: [],
  loading: false,
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
        )
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
}));
