import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { FIREBASE_FN_DOMAINS } from "@/lib/constants";
import type {
  UserToken,
  AuthTracker,
  Subscription,
} from "@/types/firebaseCollections";

export async function setAdsAccountAuthenticating(userId: string) {
  const trackerRef = doc(db, "authenticationPageTrackers", userId);
  const trackerSnap = await getDoc(trackerRef);
  if (trackerSnap.exists()) {
    await updateDoc(trackerRef, { "Is Ads Account Authenticating": true });
  }
}

export async function getCurrentUserToken(
  userId: string
): Promise<UserToken | null> {
  const userTokensRef = collection(db, "userTokens");
  const userTokenQuery = query(
    userTokensRef,
    where("User", "==", doc(db, "users", userId)),
    where("Is Current Token To Fetch Ads Account", "==", true)
  );
  const userTokenSnap = await getDocs(userTokenQuery);
  const userTokenDoc = userTokenSnap.docs[0];

  if (!userTokenDoc) return null;

  return {
    id: userTokenDoc.id,
    ...userTokenDoc.data(),
  } as UserToken;
}

export async function getAuthTracker(
  userId: string
): Promise<AuthTracker | null> {
  const authTrackerRef = doc(db, "authenticationPageTrackers", userId);
  const authTrackerSnap = await getDoc(authTrackerRef);

  if (!authTrackerSnap.exists()) return null;

  return {
    id: authTrackerSnap.id,
    ...authTrackerSnap.data(),
  } as AuthTracker;
}

export async function getSubscription(
  userId: string
): Promise<Subscription | null> {
  const userDocRef = doc(db, "users", userId);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists() || !userDocSnap.data()["Company Admin"])
    return null;

  const subscriptionRef = doc(
    db,
    "subscriptions",
    userDocSnap.data()["Company Admin"].id
  );
  const subscriptionSnap = await getDoc(subscriptionRef);

  if (!subscriptionSnap.exists()) return null;

  return {
    id: subscriptionSnap.id,
    ...subscriptionSnap.data(),
  } as Subscription;
}

export async function fetchAdsAccounts(userTokenId: string, userId: string) {
  const domain =
    process.env.NODE_ENV === "development"
      ? FIREBASE_FN_DOMAINS.DEV
      : FIREBASE_FN_DOMAINS.PROD;

  const path =
    process.env.NODE_ENV === "development"
      ? `http://${domain}/ads-accounts-fb`
      : `https://${domain}/ads-accounts-fb`;

  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userTokenId,
      userId,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch ads accounts");
  }

  return response.json();
}
