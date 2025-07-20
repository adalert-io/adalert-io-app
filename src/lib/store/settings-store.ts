import { create } from "zustand";
import { db, storage } from "@/lib/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  setDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { User } from "firebase/auth";
import { formatAccountNumber } from "../utils";
import { APPLICATION_NAME } from "../constants";

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
  "Account Name Editable"?: string;
  "Account Name Original"?: string;
  "Id"?: string;
  "Is Connected"?: boolean;
  "Is Selected"?: boolean;
  "Created Date"?: any;
  "Platform"?: string;
  "Monthly Budget"?: number;
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
  adsAccountsForTab: AdsAccount[];
  adsAccountsForTabLoaded: boolean;
  fetchAlertSettings: (userId: string) => Promise<void>;
  updateAlertSettings: (
    userId: string,
    updates: Partial<AlertSettings>
  ) => Promise<void>;
  fetchUsers: (companyAdminRef: any) => Promise<void>;
  fetchAdsAccounts: (companyAdminRef: any) => Promise<void>;
  fetchAdsAccountsForAdsAccountsTab: (
    companyAdminRef: any,
    currentUserId: string
  ) => Promise<void>;
  refreshAdsAccountsForTab: (
    companyAdminRef: any,
    currentUserId: string
  ) => Promise<void>;
  refreshUsers: (companyAdminRef: any) => Promise<void>;
  refreshAdsAccounts: (companyAdminRef: any) => Promise<void>;
  updateUser: (
    userId: string,
    updates: {
      Name?: string;
      "User Type"?: string;
      avatarFile?: File | null;
      currentAvatarUrl?: string | null;
    },
    notifyUser?: boolean,
    currentUserDoc?: any,
    selectedAds?: string[]
  ) => Promise<void>;
  updateAdsAccountsSelectedUsers: (
    userId: string,
    userType: string,
    selectedAds: string[]
  ) => Promise<void>;
  sendUserUpdateNotification: (
    toEmail: string,
    toName: string,
    userName: string,
    updaterUserType: string,
    updaterUserName: string
  ) => Promise<void>;
  inviteUser: (
    email: string,
    userType: string,
    name: string,
    selectedAds: string[]
  ) => Promise<string>;
  sendInvitationEmail: (email: string, invitationId: string) => Promise<void>;
  updateAdsAccount: (accountId: string, updates: any) => Promise<void>;
  toggleAdsAccountAlert: (
    accountId: string,
    sendAlert: boolean
  ) => Promise<void>;
  deleteAdsAccount: (accountId: string) => Promise<void>;
  updateAdsAccountVariablesBudgets: (
    accountId: string,
    monthly: number,
    daily: number
  ) => Promise<void>;
  updateMyProfile: (
    userId: string,
    {
      Name,
      Email,
      optInForTextMessage,
      Telephone,
      TelephoneDialCode,
      avatarFile,
      currentAvatarUrl,
    }: {
      Name: string;
      Email: string;
      optInForTextMessage: boolean;
      Telephone: string;
      TelephoneDialCode: string;
      avatarFile?: File | null;
      currentAvatarUrl?: string | null;
    }
  ) => Promise<void>;
  deleteCompanyAccount: (companyAdminRef: any, userLogout: () => Promise<void>) => Promise<void>;
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
  adsAccountsForTab: [],
  adsAccountsForTabLoaded: false,
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
  refreshAdsAccounts: async (companyAdminRef: any) => {
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
  fetchAdsAccountsForAdsAccountsTab: async (
    companyAdminRef: any,
    currentUserId: string
  ) => {
    if (get().adsAccountsForTabLoaded) return;
    set({ loading: true, error: null });
    try {
      const adsAccountsRef = collection(db, "adsAccounts");
      // const currentUserRef = doc(db, "users", currentUserId);

      const q = query(
        adsAccountsRef,
        where("User", "==", companyAdminRef),
        where("Is Selected", "==", true)
      );
      const snap = await getDocs(q);

      const adsAccounts: AdsAccount[] = snap.docs
        .map((docSnap) => {
          const data = docSnap.data();
          const selectedUsers = data["Selected Users"] || [];
          const hasUserAccess = selectedUsers.some(
            (userRef: any) =>
              userRef.id === currentUserId ||
              userRef.path?.includes(currentUserId)
          );

          if (!hasUserAccess) return null;

          return {
            id: docSnap.id,
            name:
              data["Account Name Editable"] ||
              data["Account Name Original"] ||
              formatAccountNumber(data["Id"]),
            "Account Name Editable": data["Account Name Editable"],
            "Account Name Original": data["Account Name Original"],
            "Id": data["Id"],
            "Is Connected": data["Is Connected"],
            "Is Selected": data["Is Selected"],
            "Created Date": data["Created Date"],
            "Platform": data["Platform"] || "Google",
            "Monthly Budget": data["Monthly Budget"] || 0,
            "Selected Users": selectedUsers,
            "Send Me Alert": data["Send Me Alert"] || false,
          };
        })
        .filter(Boolean) as AdsAccount[];

      set({
        adsAccountsForTab: adsAccounts,
        adsAccountsForTabLoaded: true,
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  updateAdsAccountsSelectedUsers: async (
    userId: string,
    userType: string,
    selectedAds: string[]
  ) => {
    try {
      const userRef = doc(db, "users", userId);
      const { useAuthStore } = await import("./auth-store");
      const userDoc = useAuthStore.getState().userDoc;

      if (userType === "Admin") {
        // For Admin: Add user to all ads accounts
        const adsAccountsRef = collection(db, "adsAccounts");
        const q = query(
          adsAccountsRef,
          where("User", "==", userDoc?.["Company Admin"]),
          where("Is Connected", "==", true)
        );
        const snap = await getDocs(q);

        const updatePromises = snap.docs.map(async (docSnap) => {
          const currentSelectedUsers = docSnap.data()["Selected Users"] || [];
          const userAlreadySelected = currentSelectedUsers.some(
            (user: any) => user.id === userId || user.path?.includes(userId)
          );

          if (!userAlreadySelected) {
            return updateDoc(docSnap.ref, {
              "Selected Users": [...currentSelectedUsers, userRef],
            });
          }
        });

        await Promise.all(updatePromises.filter(Boolean));
      } else if (userType === "Manager") {
        // For Manager: Add user to selected ads accounts and remove from others
        const adsAccountsRef = collection(db, "adsAccounts");
        const q = query(
          adsAccountsRef,
          where("User", "==", userDoc?.["Company Admin"]),
          where("Is Connected", "==", true)
        );
        const snap = await getDocs(q);

        const updatePromises = snap.docs.map(async (docSnap) => {
          const accountId = docSnap.id;
          const currentSelectedUsers = docSnap.data()["Selected Users"] || [];
          const userAlreadySelected = currentSelectedUsers.some(
            (user: any) => user.id === userId || user.path?.includes(userId)
          );

          if (selectedAds.includes(accountId)) {
            // Add user to selected ads accounts
            if (!userAlreadySelected) {
              return updateDoc(docSnap.ref, {
                "Selected Users": [...currentSelectedUsers, userRef],
              });
            }
          } else {
            // Remove user from non-selected ads accounts
            if (userAlreadySelected) {
              const updatedSelectedUsers = currentSelectedUsers.filter(
                (user: any) =>
                  user.id !== userId && !user.path?.includes(userId)
              );
              return updateDoc(docSnap.ref, {
                "Selected Users": updatedSelectedUsers,
              });
            }
          }
        });

        await Promise.all(updatePromises.filter(Boolean));
      }

      // Refresh ads accounts to update the state with latest data
      if (userDoc && userDoc["Company Admin"]) {
        await get().refreshAdsAccounts(userDoc["Company Admin"]);
      }
    } catch (error) {
      console.error("Error updating ads accounts selected users:", error);
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
    currentUserDoc?: any,
    selectedAds?: string[]
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

      // Update ads accounts selected users based on role
      if (updates["User Type"] && selectedAds) {
        await get().updateAdsAccountsSelectedUsers(
          userId,
          updates["User Type"],
          selectedAds
        );
      }

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
          templateId:
            process.env.NEXT_PUBLIC_SENDGRID_TEMPLATE_ID_UPDATE_PROFILE,
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
  inviteUser: async (
    email: string,
    userType: string,
    name: string,
    selectedAds: string[]
  ) => {
    try {
      console.log("inviteUser.....");
      const { useAuthStore } = await import("./auth-store");
      const userDoc = useAuthStore.getState().userDoc;
      const invitationRef = doc(collection(db, "invitations"));
      const invitationData = {
        email,
        userType,
        name,
        selectedAds,
        invitedBy: userDoc?.uid,
        invitedAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: "pending",
        companyAdmin: userDoc?.["Company Admin"],
      };
      await setDoc(invitationRef, invitationData);
      await get().sendInvitationEmail(email, invitationRef.id);
      return invitationRef.id;
    } catch (error) {
      console.error("Error inviting user:", error);
      throw error;
    }
  },

  sendInvitationEmail: async (email: string, invitationId: string) => {
    try {
      const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/invite/${invitationId}`;
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: email,
          templateId: process.env.NEXT_PUBLIC_SENDGRID_TEMPLATE_ID_INVITE_USER,
          tags: {
            ApplicationName: APPLICATION_NAME,
            Link: invitationLink,
            ExpiresIn: "7 days",
          },
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send invitation email");
      }
    } catch (error) {
      console.error("Error sending invitation email:", error);
      throw error;
    }
  },
  updateAdsAccount: async (accountId: string, updates: any) => {
    set({ loading: true, error: null });
    try {
      const accountRef = doc(db, "adsAccounts", accountId);
      await updateDoc(accountRef, updates);

      // Refresh the ads accounts for tab data
      const { useAuthStore } = await import("./auth-store");
      const userDoc = useAuthStore.getState().userDoc;
      if (userDoc && userDoc["Company Admin"] && userDoc.uid) {
        await get().refreshAdsAccountsForTab(
          userDoc["Company Admin"],
          userDoc.uid
        );
      }

      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  toggleAdsAccountAlert: async (accountId: string, sendAlert: boolean) => {
    set({ loading: true, error: null });
    try {
      const accountRef = doc(db, "adsAccounts", accountId);
      await updateDoc(accountRef, { "Send Me Alert": sendAlert });

      // Refresh the ads accounts for tab data
      const { useAuthStore } = await import("./auth-store");
      const userDoc = useAuthStore.getState().userDoc;
      if (userDoc && userDoc["Company Admin"] && userDoc.uid) {
        await get().refreshAdsAccountsForTab(
          userDoc["Company Admin"],
          userDoc.uid
        );
      }

      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  refreshAdsAccountsForTab: async (
    companyAdminRef: any,
    currentUserId: string
  ) => {
    set({ adsAccountsForTabLoaded: false });
    await get().fetchAdsAccountsForAdsAccountsTab(
      companyAdminRef,
      currentUserId
    );
  },
  deleteAdsAccount: async (accountId: string) => {
    set({ loading: true, error: null });
    try {
      // 1. Delete 'adsAccountVariables' where the 'Ads Account(reference)' = accountId
      const adsAccountVariablesRef = collection(db, "adsAccountVariables");
      const adsAccountRef = doc(db, "adsAccounts", accountId);
      const q = query(
        adsAccountVariablesRef,
        where("Ads Account", "==", adsAccountRef)
      );
      const snap = await getDocs(q);
      const deleteVariablePromises = snap.docs.map((docSnap) =>
        updateDoc(docSnap.ref, { deleted: true })
      );
      await Promise.all(deleteVariablePromises);

      // todo: remove cronitor monitors for ads account
      // el-tab-settings-ad-accounts-tab -> popup delete button -> every time condition

      // 2. Delete 'adsAccounts' document where id = accountId
      // (Soft delete: set a deleted flag, or hard delete: remove the document)
      // Here, we will hard delete:
      await import("firebase/firestore").then(async (firestore) => {
        await firestore.deleteDoc(adsAccountRef);
      });

      // 3. Refresh the ads accounts for tab data
      const { useAuthStore } = await import("./auth-store");
      const userDoc = useAuthStore.getState().userDoc;
      if (userDoc && userDoc["Company Admin"] && userDoc.uid) {
        await get().refreshAdsAccountsForTab(
          userDoc["Company Admin"],
          userDoc.uid
        );
      }

      // 4. Refresh ads accounts where User == Company Admin and Is Connected == true
      if (userDoc && userDoc["Company Admin"]) {
        await get().refreshAdsAccounts(userDoc["Company Admin"]);
      }

      // todo: update subscription item

      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  updateAdsAccountVariablesBudgets: async (
    accountId: string,
    monthly: number,
    daily: number
  ) => {
    try {
      const adsAccountVariablesRef = collection(db, "adsAccountVariables");
      const adsAccountRef = doc(db, "adsAccounts", accountId);
      const q = query(
        adsAccountVariablesRef,
        where("Ads Account", "==", adsAccountRef)
      );
      const snap = await getDocs(q);
      const updatePromises = snap.docs.map((docSnap) =>
        updateDoc(docSnap.ref, {
          "Monthly Budget": monthly,
          "Daily Budget": daily,
        })
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error("Error updating adsAccountVariables budgets:", error);
      throw error;
    }
  },
  updateMyProfile: async (
    userId: string,
    {
      Name,
      Email,
      optInForTextMessage,
      Telephone,
      TelephoneDialCode,
      avatarFile,
      currentAvatarUrl,
    }: {
      Name: string;
      Email: string;
      optInForTextMessage: boolean;
      Telephone: string;
      TelephoneDialCode: string;
      avatarFile?: File | null;
      currentAvatarUrl?: string | null;
    }
  ) => {
    set({ loading: true, error: null });
    try {
      let avatarUrl = currentAvatarUrl;
      // Handle avatar upload if a new file is provided
      if (avatarFile) {
        const avatarRef = ref(storage, `avatars/${userId}/${avatarFile.name}`);
        await uploadBytes(avatarRef, avatarFile);
        avatarUrl = await getDownloadURL(avatarRef);
        // Delete old avatar if it exists and is different from the new one
        if (currentAvatarUrl && currentAvatarUrl !== avatarUrl) {
          try {
            const url = new URL(currentAvatarUrl);
            const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);
            if (pathMatch) {
              const filePath = decodeURIComponent(pathMatch[1]);
              const oldAvatarRef = ref(storage, filePath);
              await deleteObject(oldAvatarRef);
            }
          } catch (error) {
            // Ignore errors when deleting old avatar
            console.warn("Could not delete old avatar:", error);
          }
        }
      }
      // Update user document
      const userRef = doc(db, "users", userId);
      const updateData: any = {
        Name,
        Email,
        "Opt In For Text Message": optInForTextMessage,
        Telephone,
        "Telephone Dial Code": TelephoneDialCode,
      };
      if (avatarUrl !== undefined) {
        updateData.Avatar = avatarUrl;
      }
      await updateDoc(userRef, updateData);
      // If the updated user is the current user, update userDoc in auth-store
      try {
        const { useAuthStore } = await import("./auth-store");
        const currentUser = useAuthStore.getState().user;
        if (currentUser && currentUser.uid === userId) {
          const userSnap = await getDocs(
            query(collection(db, "users"), where("uid", "==", userId))
          );
          if (!userSnap.empty) {
            useAuthStore
              .getState()
              .setUserDoc(
                userSnap.docs[0].data() as import("./auth-store").UserDocument
              );
          }
        }
      } catch (e) {
        /* ignore */
      }
      // If telephone is empty or optInForTextMessage is false, update alertSettings
      if (!Telephone || !optInForTextMessage) {
        const alertSettingsRef = collection(db, "alertSettings");
        const userDocRef = doc(db, "users", userId);
        const q = query(alertSettingsRef, where("User", "==", userDocRef));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const alertDoc = snap.docs[0];
          await updateDoc(alertDoc.ref, { "Send SMS Alerts": false });
        }
      }
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  deleteCompanyAccount: async (companyAdminRef: any, userLogout: () => Promise<void>) => {
    try {
      // 1. Delete 'adsAccountVariables' where 'User' == companyAdminRef
      const adsAccountVariablesRef = collection(db, "adsAccountVariables");
      let q = query(adsAccountVariablesRef, where("User", "==", companyAdminRef));
      let snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        await deleteDoc(docSnap.ref);
      }

      // 2. Get all adsAccounts ids for this company admin
      const adsAccountsRef = collection(db, "adsAccounts");
      q = query(adsAccountsRef, where("User", "==", companyAdminRef));
      snap = await getDocs(q);
      const adsAccountIds = snap.docs.map((doc) => doc.id);
      // Remove all adsAccountVariables where 'Ads Account' in adsAccountIds
      for (const adsAccountId of adsAccountIds) {
        const adsAccountDocRef = doc(db, "adsAccounts", adsAccountId);
        const q2 = query(adsAccountVariablesRef, where("Ads Account", "==", adsAccountDocRef));
        const snap2 = await getDocs(q2);
        for (const docSnap2 of snap2.docs) {
          await deleteDoc(docSnap2.ref);
        }
      }

      // 3. Delete all 'alerts' where 'User' == companyAdminRef
      const alertsRef = collection(db, "alerts");
      q = query(alertsRef, where("User", "==", companyAdminRef));
      snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        await deleteDoc(docSnap.ref);
      }

      // 4. Delete all 'adsAccounts' where 'User' == companyAdminRef
      snap = await getDocs(q = query(adsAccountsRef, where("User", "==", companyAdminRef)));
      for (const docSnap of snap.docs) {
        await deleteDoc(docSnap.ref);
      }

      // 5. Get all user ids for this company admin
      const usersRef = collection(db, "users");
      q = query(usersRef, where("Company Admin", "==", companyAdminRef));
      snap = await getDocs(q);
      const userIds = snap.docs.map((doc) => doc.id);
      // Remove all alertSettings where 'User' in userIds
      const alertSettingsRef = collection(db, "alertSettings");
      for (const userId of userIds) {
        const userDocRef = doc(db, "users", userId);
        const q2 = query(alertSettingsRef, where("User", "==", userDocRef));
        const snap2 = await getDocs(q2);
        for (const docSnap2 of snap2.docs) {
          await deleteDoc(docSnap2.ref);
        }
      }

      // 6. Remove all authenticationPageTrackers where 'User' in userIds
      const authenticationPageTrackersRef = collection(db, "authenticationPageTrackers");
      for (const userId of userIds) {
        const userDocRef = doc(db, "users", userId);
        const q2 = query(authenticationPageTrackersRef, where("User", "==", userDocRef));
        const snap2 = await getDocs(q2);
        for (const docSnap2 of snap2.docs) {
          await deleteDoc(docSnap2.ref);
        }
      }

      // 7. Delete all dashboardDailies where 'User' == companyAdminRef
      const dashboardDailiesRef = collection(db, "dashboardDailies");
      q = query(dashboardDailiesRef, where("User", "==", companyAdminRef));
      snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        await deleteDoc(docSnap.ref);
      }

      // 8. Delete all stripeCompanies where 'User' == companyAdminRef
      const stripeCompaniesRef = collection(db, "stripeCompanies");
      q = query(stripeCompaniesRef, where("User", "==", companyAdminRef));
      snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        await deleteDoc(docSnap.ref);
      }

      // 9. Delete all subscriptions where 'User' == companyAdminRef
      const subscriptionsRef = collection(db, "subscriptions");
      q = query(subscriptionsRef, where("User", "==", companyAdminRef));
      snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        await deleteDoc(docSnap.ref);
      }

      // 10. Remove all userTokens where 'User' in userIds
      const userTokensRef = collection(db, "userTokens");
      for (const userId of userIds) {
        const userDocRef = doc(db, "users", userId);
        const q2 = query(userTokensRef, where("User", "==", userDocRef));
        const snap2 = await getDocs(q2);
        for (const docSnap2 of snap2.docs) {
          await deleteDoc(docSnap2.ref);
        }
      }

      // 11. Store all userIds in an array (already done above)
      // 12. Remove all users where id in userIds
      for (const userId of userIds) {
        await deleteDoc(doc(db, "users", userId));
      }

      // 13. Log the user out
      await userLogout();
    } catch (error) {
      console.error("Error deleting company account:", error);
      throw error;
    }
  },
}));
