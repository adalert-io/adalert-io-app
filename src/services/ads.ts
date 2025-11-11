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

  console.log("[fetchAdsAccounts] Calling API with:", {
    path,
    userTokenId,
    userId,
  });

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

  console.log("[fetchAdsAccounts] Response status:", response.status, response.statusText);

  if (!response.ok) {
    let errorMessage = "Failed to fetch ads accounts";
    let errorDetails: any = null;
    
    // Clone the response so we can read it multiple times if needed
    const clonedResponse = response.clone();
    
    try {
      // Try to parse as JSON first
      errorDetails = await clonedResponse.json();
      errorMessage = errorDetails?.error || errorDetails?.message || errorMessage;
      console.error("[fetchAdsAccounts] Error response data:", errorDetails);
    } catch (e) {
      // If JSON parsing fails, try to read as text
      try {
        const errorText = await response.text();
        console.error("[fetchAdsAccounts] Error response text:", errorText);
        errorMessage = errorText || errorMessage;
      } catch (textError) {
        console.error("[fetchAdsAccounts] Could not read error response:", textError);
        // Use status text as fallback
        errorMessage = `${response.status} ${response.statusText}`;
      }
    }
    
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).statusText = response.statusText;
    (error as any).details = errorDetails;
    console.error("[fetchAdsAccounts] Throwing error:", {
      message: errorMessage,
      status: response.status,
      statusText: response.statusText,
      details: errorDetails,
    });
    throw error;
  }

  const data = await response.json();
  console.log("[fetchAdsAccounts] Success, received data:", {
    isArray: Array.isArray(data),
    count: Array.isArray(data) ? data.length : "N/A",
    data,
  });

  return data;
}
