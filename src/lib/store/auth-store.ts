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
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

// Reusable function to create user documents
export async function createUserDocuments(
  user: User,
  isGoogleSignUp: boolean = false
) {
  // Check if user document already exists
  const userRef = doc(db, "users", user.uid);
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
      "User Type": "Admin",
      "Email": user.email,
      "modified_at": serverTimestamp(),
      "Telephone": user.phoneNumber,
      "uid": user.uid,
    });

    // Create authenticationPageTrackers document
    const authTrackerRef = doc(db, "authenticationPageTrackers", user.uid);
    await setDoc(authTrackerRef, {
      "Is Ads Account Authenticating": false,
      "Nav To Settings - Ads Account": false,
      "User": userRef,
    });

    // Create alertSettings document
    const alertSettingsRef = doc(db, "alertSettings", user.uid);
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
    const stripeCompaniesRef = doc(db, "stripeCompanies", user.uid);
    await setDoc(stripeCompaniesRef, {
      "User": userRef,
    });

    // Create subscriptions document
    const subscriptionsRef = doc(db, "subscriptions", user.uid);
    await setDoc(subscriptionsRef, {
      "User": userRef,
      "Free Trial": serverTimestamp(),
      "User Status": "Trial New",
    });
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

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
        prompt: "select_account", // Force account selection
        login_hint: "", // Optional: pre-fill email
      });

      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Create user documents
      await createUserDocuments(user, true);

      set({ user });
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
      set({ user: null });
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
}));
