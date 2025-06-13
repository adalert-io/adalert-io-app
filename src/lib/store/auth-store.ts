import { create } from "zustand";
import { User } from "firebase/auth";
import { auth } from "../firebase/config";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  ActionCodeSettings,
} from "firebase/auth";
import { authConfig } from "../config/auth-config";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import moment from "moment";
import {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_PERIODS,
  USER_TYPES,
  COLLECTIONS,
} from "@/lib/constants";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

interface UserDocument {
  "Company Admin": any;
  "Is Google Sign Up": boolean;
  "Name": string;
  "User Access": string;
  "Avatar": string | null;
  "User Type": string;
  "Email": string;
  "modified_at": any;
  "Telephone": string | null;
  "uid": string;
  "Inviter"?: any; // Optional field for inviter reference
}

interface AuthState {
  user: User | null;
  userDoc: UserDocument | null;
  loading: boolean;
  error: string | null;
  isFullAccess: boolean;
  router: AppRouterInstance | null;
  setUser: (user: User | null) => void;
  setUserDoc: (userDoc: UserDocument | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setRouter: (router: AppRouterInstance) => void;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  checkSubscriptionStatus: (userId: string) => Promise<void>;
  fetchUserDocument: (userId: string) => Promise<void>;
  handlePostAuthNavigation: () => Promise<void>;
}

// Helper function to fetch user document
async function fetchUserDocument(userId: string): Promise<UserDocument | null> {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    return null;
  }

  return userDoc.data() as UserDocument;
}

// Helper function to check subscription status
async function checkSubscriptionStatus(userId: string): Promise<boolean> {
  // First fetch the user document
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    return false;
  }

  const userData = userDoc.data();
  const companyAdminRef = userData["Company Admin"];

  // Query subscriptions collection to find document where User field matches Company Admin
  const subscriptionsRef = collection(db, COLLECTIONS.SUBSCRIPTIONS);
  const q = query(subscriptionsRef, where("User", "==", companyAdminRef));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return false;
  }

  // Get the first matching subscription document
  const subscriptionDoc = querySnapshot.docs[0];
  const subscriptionData = subscriptionDoc.data();
  const now = moment();
  const userStatus = subscriptionData["User Status"];

  console.log("subscriptionData", subscriptionData);

  // Check Trial New status
  if (userStatus === SUBSCRIPTION_STATUS.TRIAL_NEW) {
    const trialStartDate = subscriptionData["Free Trial Start Date"]?.toDate();
    if (trialStartDate) {
      const trialEndDate = moment(trialStartDate).add(
        SUBSCRIPTION_PERIODS.TRIAL_DAYS,
        "days"
      );

      if (now.isAfter(trialEndDate)) {
        // Update status to Trial Ended
        await updateDoc(
          doc(db, COLLECTIONS.SUBSCRIPTIONS, subscriptionDoc.id),
          {
            "User Status": SUBSCRIPTION_STATUS.TRIAL_ENDED,
          }
        );
        return false;
      }
    }
  }

  // Check Trial Ended or Cancelled status
  if (
    userStatus === SUBSCRIPTION_STATUS.TRIAL_ENDED ||
    userStatus === SUBSCRIPTION_STATUS.CANCELLED
  ) {
    return false;
  }

  // Check Payment Failed status
  if (userStatus === SUBSCRIPTION_STATUS.PAYMENT_FAILED) {
    const failedStartDate =
      subscriptionData["Stripe Invoice Failed Start Date"]?.toDate();
    if (failedStartDate) {
      const gracePeriodEnd = moment(failedStartDate).add(
        SUBSCRIPTION_PERIODS.PAYMENT_FAILED_GRACE_DAYS,
        "days"
      );

      if (now.isAfter(gracePeriodEnd)) {
        return false;
      }
    }
  }

  // If none of the conditions match, user has full access
  return true;
}

// Reusable function to create user documents
export async function createUserDocuments(
  user: User,
  isGoogleSignUp: boolean = false
) {
  // Check if user document already exists
  const userRef = doc(db, COLLECTIONS.USERS, user.uid);
  const userDoc = await getDoc(userRef);

  // Only create documents if they don't exist
  if (!userDoc.exists()) {
    // Create user document
    await setDoc(userRef, {
      "Company Admin": userRef,
      "Is Google Sign Up": isGoogleSignUp,
      "Name": isGoogleSignUp
        ? user.displayName
        : user.displayName || user.email?.split("@")[0],
      "User Access": "All ad accounts",
      "Avatar": user.photoURL,
      "User Type": USER_TYPES.ADMIN,
      "Email": user.email,
      "modified_at": serverTimestamp(),
      "Telephone": user.phoneNumber,
      "uid": user.uid,
    });

    // Create authenticationPageTrackers document
    const authTrackerRef = doc(db, COLLECTIONS.AUTH_TRACKERS, user.uid);
    await setDoc(authTrackerRef, {
      "Is Ads Account Authenticating": false,
      "Nav To Settings - Ads Account": false,
      "User": userRef,
    });

    // Create alertSettings document
    const alertSettingsRef = doc(db, COLLECTIONS.ALERT_SETTINGS, user.uid);
    await setDoc(alertSettingsRef, {
      "Level Account": true,
      "Level Ads": true,
      "Level Keyword": true,
      "Send Email Alerts": true,
      "Send SMS Alerts": true,
      "Send Weekly Summaries": true,
      "Severity Critical": true,
      "Severity Low": true,
      "Severity Medium": true,
      "Type Ad Performance": true,
      "Type Brand Checker": true,
      "Type Budget": true,
      "Type Keyword Performance": true,
      "Type KPI Trends": true,
      "Type Landing Page": true,
      "Type Optimization Score": true,
      "Type Policy": true,
      "Type Serving Ads": true,
      "User": userRef,
    });

    // Create stripeCompanies document
    const stripeCompaniesRef = doc(db, COLLECTIONS.STRIPE_COMPANIES, user.uid);
    await setDoc(stripeCompaniesRef, {
      "User": userRef,
    });

    // Create subscriptions document
    const subscriptionsRef = doc(db, COLLECTIONS.SUBSCRIPTIONS, user.uid);
    await setDoc(subscriptionsRef, {
      "User": userRef,
      "Free Trial Start Date": serverTimestamp(),
      "User Status": SUBSCRIPTION_STATUS.TRIAL_NEW,
    });
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userDoc: null,
  loading: false,
  error: null,
  isFullAccess: false,
  router: null,
  setUser: (user) => set({ user }),
  setUserDoc: (userDoc) => set({ userDoc }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setRouter: (router) => set({ router }),

  fetchUserDocument: async (userId: string) => {
    try {
      const userDoc = await fetchUserDocument(userId);
      set({ userDoc });
    } catch (err: any) {
      console.error("Error fetching user document:", err);
      set({ error: err.message });
    }
  },

  checkSubscriptionStatus: async (userId: string) => {
    try {
      // First fetch the user document
      await useAuthStore.getState().fetchUserDocument(userId);

      // Then check subscription status
      const hasFullAccess = await checkSubscriptionStatus(userId);
      console.log("hasFullAccess", hasFullAccess);
      set({ isFullAccess: hasFullAccess });
    } catch (err: any) {
      console.error("Error checking subscription status:", err);
      set({ isFullAccess: false });
    }
  },

  signUp: async (email: string, password: string, fullName: string) => {
    try {
      set({ loading: true, error: null });
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(userCredential.user, { displayName: fullName });

      // Send verification email with dynamic action URL
      const actionCodeSettings: ActionCodeSettings = {
        url: authConfig.getActionUrl(),
        handleCodeInApp: true,
      };
      await sendEmailVerification(userCredential.user, actionCodeSettings);

      set({ user: userCredential.user });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      set({ user: userCredential.user });

      // Fetch user document and check subscription status after successful sign in
      await useAuthStore
        .getState()
        .checkSubscriptionStatus(userCredential.user.uid);

      // Handle post-auth navigation
      await useAuthStore.getState().handlePostAuthNavigation();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  signInWithGoogle: async () => {
    try {
      set({ loading: true, error: null });
      const provider = new GoogleAuthProvider();

      // Add scopes
      provider.addScope("https://www.googleapis.com/auth/userinfo.email");
      provider.addScope("https://www.googleapis.com/auth/userinfo.profile");

      // Set custom parameters
      provider.setCustomParameters({
        prompt: "select_account",
        login_hint: "",
      });

      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Create user documents
      await createUserDocuments(user, true);

      set({ user });

      // Fetch user document and check subscription status after successful sign in
      await useAuthStore.getState().checkSubscriptionStatus(user.uid);

      // Handle post-auth navigation
      await useAuthStore.getState().handlePostAuthNavigation();
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      set({ loading: true, error: null });
      await signOut(auth);
      set({ user: null, userDoc: null });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  sendVerificationEmail: async () => {
    try {
      set({ loading: true, error: null });
      const user = auth.currentUser;
      if (!user) {
        throw new Error("No user is currently signed in");
      }

      // Send verification email with dynamic action URL
      const actionCodeSettings: ActionCodeSettings = {
        url: authConfig.getActionUrl(),
        handleCodeInApp: true,
      };
      await sendEmailVerification(user, actionCodeSettings);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  sendPasswordReset: async (email: string) => {
    try {
      set({ loading: true, error: null });
      const actionCodeSettings: ActionCodeSettings = {
        url: authConfig.getActionUrl(),
        handleCodeInApp: true,
      };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  handlePostAuthNavigation: async () => {
    try {
      console.log("handlePostAuthNavigation......");
      const { userDoc, isFullAccess, router } = get();
      console.log("userDoc", userDoc);
      console.log("isFullAccess", isFullAccess);
      if (!userDoc || !router) return;

      // Build Firestore query for Ads Account collection
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
      const adsAccountCount = adsAccountSnap.size;

      console.log("adsAccountCount", adsAccountCount);

      // Check inviter
      const inviter = userDoc["Inviter"];

      // Navigation logic
      if (!isFullAccess) {
        console.log("to /settings/account/billing");
        router.push("/settings/account/billing");
        return;
      }

      if (adsAccountCount === 0) {
        if (!inviter) {
          console.log("to /add-ads-account");
          router.push("/add-ads-account");
        } else {
          console.log("to /dashboard");
          router.push("/dashboard");
        }
        return;
      }

      if (adsAccountCount === 1) {
        console.log("to /dashboard");
        router.push("/dashboard");
        return;
      }

      if (adsAccountCount > 1) {
        console.log("to /summary");
        router.push("/summary");
        return;
      }
    } catch (err: any) {
      console.error("Error in post-auth navigation:", err);
      set({ error: err.message });
    }
  },
}));
