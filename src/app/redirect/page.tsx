"use client";

import { db } from "@/lib/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  setDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { jwtDecode } from "jwt-decode";
import { useAuthStore } from "@/lib/store/auth-store";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Parse query params
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");
    const page = searchParams.get("page"); // e.g., add-ads-account

    if (errorParam) {
      setError(errorParam);
      toast.error(errorParam);
      return;
    }

    if (code) {
      (async () => {
        try {
          const client_id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
          const client_secret = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET!;
          const redirect_uri = !page
            ? `${window.location.origin}/redirect`
            : `${window.location.origin}/redirect?page=${page}`;

          const params = new URLSearchParams({
            code,
            client_id,
            client_secret,
            redirect_uri,
            grant_type: "authorization_code",
          });

          const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          });

          if (!response.ok) {
            setError("Failed to get Google token");
            return;
          }

          const tokenData = await response.json();
          const decoded: any = jwtDecode(tokenData.id_token);

          // Get authenticated user id (assume from Zustand store)
          console.log("useAuthStore.getState(): ");
          console.log(useAuthStore.getState());
          const { user } = useAuthStore.getState();
          if (!user) {
            setError("No authenticated user found.");
            return;
          }
          const userId = user.uid;
          const userRef = doc(db, "users", userId);

          // Step 1: Set 'Is Current Token To Fetch Ads Account' to false for all userTokens of this user
          const userTokensRef = collection(db, "userTokens");
          const allTokensQuery = query(
            userTokensRef,
            where("User", "==", userRef)
          );
          const allTokensSnap = await getDocs(allTokensQuery);
          await Promise.all(
            allTokensSnap.docs.map((d) =>
              updateDoc(d.ref, {
                "Is Current Token To Fetch Ads Account": false,
              })
            )
          );

          // Step 2: Get userTokens where Google Email matches decoded.email
          const tokensWithEmailQuery = query(
            userTokensRef,
            where("User", "==", userRef),
            where("Google Email", "==", decoded.email)
          );
          const tokensWithEmailSnap = await getDocs(tokensWithEmailQuery);

          // Step 3: Update or create userToken
          const now = Timestamp.now();
          if (!tokensWithEmailSnap.empty) {
            // Update all matching tokens
            await Promise.all(
              tokensWithEmailSnap.docs.map((d) =>
                updateDoc(d.ref, {
                  "Access Token": tokenData.access_token,
                  "Refresh Token": tokenData.refresh_token,
                  "Access Token Creation Date": now,
                  "Access Token Expires In Second": tokenData.expires_in,
                  "Is Current Token To Fetch Ads Account": true,
                  "Google Email": decoded.email,
                  "modified_at": new Date(),
                })
              )
            );
          } else {
            // Create a new userToken document
            const newTokenRef = doc(collection(db, "userTokens"));
            await setDoc(newTokenRef, {
              "User": userRef,
              "Access Token": tokenData.access_token,
              "Refresh Token": tokenData.refresh_token,
              "Access Token Creation Date": now,
              "Access Token Expires In Second": tokenData.expires_in,
              "Is Current Token To Fetch Ads Account": true,
              "Google Email": decoded.email,
              "Created Date": new Date(),
              "modified_at": new Date(),
            });
          }

          // Step 4: Set 'Is Ads Account Authenticating' to true in authenticationPageTrackers
          const trackerRef = doc(db, "authenticationPageTrackers", userId);
          await updateDoc(trackerRef, {
            "Is Ads Account Authenticating": true,
          });

          // Step 5: Navigate to the page
          if (page) {
            router.replace(`/${page}`);
          } else {
            router.replace("/dashboard");
          }
        } catch (err) {
          setError("An error occurred during Google authentication.");
        }
      })();
    }
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          Google OAuth Error
        </h1>
        <p className="text-gray-700">{error}</p>
        <button
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          onClick={() => {
            const page = searchParams.get("page");
            if (page) {
              router.replace(`/${page}`);
            }
          }}
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafbfe]">
      <div className="bg-white rounded-2xl shadow-lg px-12 py-10 flex flex-col items-center w-full max-w-md">
        <div className="flex items-center mb-8">
          <Image
            src="/images/adalert-logo.avif"
            alt="adAlert.io logo"
            width={48}
            height={48}
            className="mr-3"
            priority
          />
          <span className="text-2xl font-semibold text-[#1a2e49] tracking-tight">
            adAlert.io
          </span>
        </div>
        <Loader2 className="animate-spin w-10 h-10 text-blue-600 mb-6" />
        <p className="text-lg text-gray-500 text-center">
          You're being redirected to adAlert.io
        </p>
      </div>
    </div>
  );
}
