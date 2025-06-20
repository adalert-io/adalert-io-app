import { create } from "zustand";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { COLLECTIONS } from "@/lib/constants";

export interface AlertOptionSet {
  id: string;
  [key: string]: any;
}

interface AlertOptionSetsState {
  alertOptionSets: AlertOptionSet[];
  loading: boolean;
  error: string | null;
  fetchAlertOptionSets: () => Promise<void>;
}

export const useAlertOptionSetsStore = create<AlertOptionSetsState>((set) => ({
  alertOptionSets: [],
  loading: false,
  error: null,
  fetchAlertOptionSets: async () => {
    set({ loading: true, error: null });
    try {
      const optionSetsRef = collection(db, COLLECTIONS.ALERT_OPTION_SETS);
      const optionSetsSnap = await getDocs(optionSetsRef);
      const alertOptionSets: AlertOptionSet[] = optionSetsSnap.docs.map(
        (doc) => ({
          id: doc.id,
          ...doc.data(),
        })
      );
      set({ alertOptionSets, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
}));
