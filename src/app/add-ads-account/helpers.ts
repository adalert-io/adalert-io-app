import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export async function setAdsAccountAuthenticating(userId: string) {
  const trackerRef = doc(db, "authenticationPageTrackers", userId);
  const trackerSnap = await getDoc(trackerRef);
  if (trackerSnap.exists()) {
    await updateDoc(trackerRef, { "Is Ads Account Authenticating": true });
  }
}
