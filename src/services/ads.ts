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
import { getFirebaseFnPath } from "@/lib/utils";

export async function setAdsAccountAuthenticating(
  userId: string,
  value: boolean
) {
  const trackersRef = collection(db, "authenticationPageTrackers");
  const trackerQuery = query(
    trackersRef,
    where("User", "==", doc(db, "users", userId))
  );
  const trackerSnap = await getDocs(trackerQuery);

  if (!trackerSnap.empty) {
    const trackerDoc = trackerSnap.docs[0];
    await updateDoc(trackerDoc.ref, { "Is Ads Account Authenticating": value });
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
  const trackersRef = collection(db, "authenticationPageTrackers");
  const trackerQuery = query(
    trackersRef,
    where("User", "==", doc(db, "users", userId))
  );
  const trackerSnap = await getDocs(trackerQuery);

  if (trackerSnap.empty) return null;

  const trackerDoc = trackerSnap.docs[0];
  return {
    id: trackerDoc.id,
    ...trackerDoc.data(),
  } as AuthTracker;
}

export async function getSubscription(
  userId: string
): Promise<Subscription | null> {
  const userDocRef = doc(db, "users", userId);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists() || !userDocSnap.data()["Company Admin"])
    return null;

  const subscriptionsRef = collection(db, "subscriptions");
  const subscriptionQuery = query(
    subscriptionsRef,
    where("User", "==", userDocSnap.data()["Company Admin"])
  );
  const subscriptionSnap = await getDocs(subscriptionQuery);

  if (subscriptionSnap.empty) return null;

  const subscriptionDoc = subscriptionSnap.docs[0];
  return {
    id: subscriptionDoc.id,
    ...subscriptionDoc.data(),
  } as Subscription;
}

export async function fetchAdsAccounts(userTokenId: string, userId: string) {
  const path = getFirebaseFnPath("ads-accounts-fb");

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
