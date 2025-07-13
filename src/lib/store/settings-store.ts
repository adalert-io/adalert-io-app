import { create } from "zustand";
import { db, storage } from "@/lib/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { User } from "firebase/auth";
import { formatAccountNumber } from "../utils";

export interface AlertSettings {
  id: string;
  "Level Account": boolean;
  "Level Ads": boolean;
  "Level Keyword": boolean;
  "Send Email Alerts": boolean;
  "Send SMS Alerts": boolean;
  "Send Weekly Summaries": boolean;
  "Severity Critical": boolean;
  "Severity Low": boolean;
  "Severity Medium": boolean;
  "Type Ad Performance": boolean;
  "Type Brand Checker": boolean;
  "Type Budget": boolean;
  "Type KPI Trends": boolean;
  "Type Keyword Performance": boolean;
  "Type Landing Page": boolean;
  "Type Optimization Score": boolean;
  "Type Policy": boolean;
  "Type Serving Ads": boolean;
}

export interface UserRow {
  id: string;
  email: string;
  Name: string;
  "User Type": string;
  "User Access": string;
}

export interface AdsAccount {
  id: string;
  name: string;
  "Selected Users"?: any[]; // Array of user references
  // Add other fields as needed
}

interface AlertSettingsState {
  alertSettings: AlertSettings | null;
  loading: boolean;
  error: string | null;
  loadedUserId: string | null;
  users: UserRow[];
  usersLoaded: boolean;
  adsAccounts: AdsAccount[];
  adsAccountsLoaded: boolean;
  fetchAlertSettings: (userId: string) => Promise<void>;
  updateAlertSettings: (
    userId: string,
    updates: Partial<AlertSettings>
  ) => Promise<void>;
  fetchUsers: (companyAdminRef: any) => Promise<void>;
  refreshUsers: (companyAdminRef: any) => Promise<void>;
  fetchAdsAccounts: (companyAdminRef: any) => Promise<void>;
  updateUser: (
    userId: string,
    updates: {
      Name?: string;
      "User Type"?: string;
      avatarFile?: File | null;
      currentAvatarUrl?: string | null;
    },
    notifyUser?: boolean,
    currentUserDoc?: any
  ) => Promise<void>;
  sendUserUpdateNotification: (
    toEmail: string,
    toName: string,
    userName: string,
    updaterUserType: string,
    updaterUserName: string
  ) => Promise<void>;
}

export const useAlertSettingsStore = create<AlertSettingsState>((set, get) => ({
  alertSettings: null,
  loading: false,
  error: null,
  loadedUserId: null,
  users: [],
  usersLoaded: false,
  adsAccounts: [],
  adsAccountsLoaded: false,
  fetchAlertSettings: async (userId: string) => {
    if (get().loadedUserId === userId && get().alertSettings) return;
    set({ loading: true, error: null });
    try {
      const alertSettingsRef = collection(db, "alertSettings");
      const userRef = doc(db, "users", userId);
      const q = query(alertSettingsRef, where("User", "==", userRef));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        set({
          alertSettings: { id: docSnap.id, ...docSnap.data() } as AlertSettings,
          loading: false,
          loadedUserId: userId,
        });
      } else {
        set({ alertSettings: null, loading: false, loadedUserId: userId });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  updateAlertSettings: async (
    userId: string,
    updates: Partial<AlertSettings>
  ) => {
    set({ loading: true, error: null });
    try {
      const alertSettingsRef = collection(db, "alertSettings");
      const userRef = doc(db, "users", userId);
      const q = query(alertSettingsRef, where("User", "==", userRef));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        await updateDoc(docSnap.ref, updates);
        // Re-fetch after update
        await get().fetchAlertSettings(userId);
        set({ loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  fetchUsers: async (companyAdminRef: any) => {
    if (get().usersLoaded) return;
    set({ loading: true, error: null });
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("Company Admin", "==", companyAdminRef));
      const snap = await getDocs(q);
      const users: UserRow[] = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        email: docSnap.data().email,
        Name: docSnap.data().Name,
        "User Type": docSnap.data()["User Type"],
        "User Access": docSnap.data()["User Access"],
        "Avatar": docSnap.data()["Avatar"],
        "Is Google Sign Up": docSnap.data()["Is Google Sign Up"],
      }));
      set({ users, usersLoaded: true, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  refreshUsers: async (companyAdminRef: any) => {
    set({ loading: true, error: null });
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("Company Admin", "==", companyAdminRef));
      const snap = await getDocs(q);
      const users: UserRow[] = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        email: docSnap.data().email,
        Name: docSnap.data().Name,
        "User Type": docSnap.data()["User Type"],
        "User Access": docSnap.data()["User Access"],
        "Avatar": docSnap.data()["Avatar"],
        "Is Google Sign Up": docSnap.data()["Is Google Sign Up"],
      }));
      set({ users, usersLoaded: true, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  fetchAdsAccounts: async (companyAdminRef: any) => {
    if (get().adsAccountsLoaded) return;
    set({ loading: true, error: null });
    try {
      const adsAccountsRef = collection(db, "adsAccounts");
      const q = query(
        adsAccountsRef,
        where("User", "==", companyAdminRef),
        where("Is Connected", "==", true)
      );
      const snap = await getDocs(q);
      const adsAccounts: AdsAccount[] = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        name:
          docSnap.data()["Account Name Editable"] ||
          docSnap.data()["Account Name Original"] ||
          formatAccountNumber(docSnap.data()["Id"]),
        "Selected Users": docSnap.data()["Selected Users"],
      }));
      set({ adsAccounts, adsAccountsLoaded: true, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  sendUserUpdateNotification: async (
    toEmail: string,
    toName: string,
    userName: string,
    updaterUserType: string,
    updaterUserName: string
  ) => {
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toEmail,
          toName,
          tags: {
            UserName: userName,
            UpdaterUserType: updaterUserType,
            UpdaterUserName: updaterUserName,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send email notification");
      }

      const result = await response.json();
      console.log("Email notification sent successfully:", result);
    } catch (error) {
      console.error("Error sending email notification:", error);
      throw error;
    }
  },
  updateUser: async (
    userId: string,
    updates: {
      Name?: string;
      "User Type"?: string;
      avatarFile?: File | null;
      currentAvatarUrl?: string | null;
    },
    notifyUser?: boolean,
    currentUserDoc?: any
  ) => {
    set({ loading: true, error: null });
    try {
      let avatarUrl = updates.currentAvatarUrl;

      // Handle avatar upload if a new file is provided
      if (updates.avatarFile) {
        // Upload new avatar
        const avatarRef = ref(
          storage,
          `avatars/${userId}/${updates.avatarFile.name}`
        );
        await uploadBytes(avatarRef, updates.avatarFile);
        avatarUrl = await getDownloadURL(avatarRef);

        // Delete old avatar if it exists and is different from the new one
        if (
          updates.currentAvatarUrl &&
          updates.currentAvatarUrl !== avatarUrl
        ) {
          try {
            // Extract the file path from the Firebase Storage URL
            const url = new URL(updates.currentAvatarUrl);
            const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);
            if (pathMatch) {
              const filePath = decodeURIComponent(pathMatch[1]);
              const oldAvatarRef = ref(storage, filePath);
              await deleteObject(oldAvatarRef);
            }
          } catch (error) {
            // Ignore errors when deleting old avatar (file might not exist)
            console.warn("Could not delete old avatar:", error);
          }
        }
      }

      // Update user document
      const userRef = doc(db, "users", userId);
      const updateData: any = {};

      if (updates.Name !== undefined) {
        updateData.Name = updates.Name;
      }
      if (updates["User Type"] !== undefined) {
        updateData["User Type"] = updates["User Type"];
      }
      if (avatarUrl !== undefined) {
        updateData.Avatar = avatarUrl;
      }

      await updateDoc(userRef, updateData);

      // Send email notification if requested
      if (notifyUser && currentUserDoc) {
        const { useAuthStore } = await import("./auth-store");
        const userDoc = useAuthStore.getState().userDoc;
        if (userDoc) {
          await get().sendUserUpdateNotification(
            currentUserDoc.email,
            currentUserDoc.Name,
            updates.Name || currentUserDoc.Name,
            userDoc["User Type"],
            userDoc.Name
          );
        }
      }

      // Refresh users list by calling fetchUsers
      // We need to get the company admin ref from the current user
      const currentUser = get().users.find((user) => user.id === userId);
      if (currentUser) {
        // Get the company admin ref from the auth store
        const { useAuthStore } = await import("./auth-store");
        const userDoc = useAuthStore.getState().userDoc;
        if (userDoc && userDoc["Company Admin"]) {
          await get().refreshUsers(userDoc["Company Admin"]);
        }
      }

      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
}));
