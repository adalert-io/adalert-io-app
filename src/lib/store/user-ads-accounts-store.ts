import { create } from "zustand";
import { collection, doc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { COLLECTIONS } from "@/lib/constants";
import { UserDocument } from "./auth-store";

export interface AdsAccount {
  id: string;
  [key: string]: any;
}

interface UserAdsAccountsState {
  userAdsAccounts: AdsAccount[];
  selectedAdsAccount: AdsAccount | null;
  loading: boolean;
  error: string | null;
  fetchUserAdsAccounts: (userDoc: UserDocument) => Promise<void>;
  setSelectedAdsAccount: (account: AdsAccount | null) => void;
}

export const useUserAdsAccountsStore = create<UserAdsAccountsState>((set) => ({
  userAdsAccounts: [],
  selectedAdsAccount: null,
  loading: false,
  error: null,

  setSelectedAdsAccount: (account) => set({ selectedAdsAccount: account }),

  fetchUserAdsAccounts: async (userDoc) => {
    set({ loading: true, error: null });
    try {
      const adsAccountRef = collection(db, COLLECTIONS.ADS_ACCOUNTS);
      const companyAdminRef = userDoc["Company Admin"];
      const userRef = doc(db, COLLECTIONS.USERS, userDoc.uid);

      const adsAccountQuery = query(
        adsAccountRef,
        where("User", "==", companyAdminRef),
        where("Is Connected", "==", true),
        where("Selected Users", "array-contains", userRef)
      );

      const adsAccountSnap = await getDocs(adsAccountQuery);
      const accounts: AdsAccount[] = adsAccountSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (accounts.length === 1) {
        set({
          userAdsAccounts: accounts,
          selectedAdsAccount: accounts[0],
          loading: false,
        });
      } else {
        set({
          userAdsAccounts: accounts,
          selectedAdsAccount: null,
          loading: false,
        });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
}));
