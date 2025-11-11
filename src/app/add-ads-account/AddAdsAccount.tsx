"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import {
  ShieldCheck,
  CheckCircle,
  Loader2,
  DollarSign,
  CheckCheck,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  setAdsAccountAuthenticating,
  getCurrentUserToken,
  getAuthTracker,
  getSubscription,
  fetchAdsAccounts,
} from "@/services/ads";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type {
  UserToken,
  AuthTracker,
  Subscription,
  AdsAccount,
} from "@/types/firebaseCollections";
import { toast } from "sonner";
import {
  updateDoc,
  doc,
  arrayUnion,
  setDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { COLLECTIONS, DEFAULT_ADS_ACCOUNT_VARIABLE } from "@/lib/constants";
import { useUserAdsAccountsStore } from "@/lib/store/user-ads-accounts-store";

function formatAccountId(id: string) {
  return id.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
}

export function AddAdsAccount() {
  const { user, isFullAccess, userDoc } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [userToken, setUserToken] = useState<UserToken | null>(null);
  const [authTracker, setAuthTracker] = useState<AuthTracker | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [adsAccounts, setAdsAccounts] = useState<AdsAccount[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  const fetchUserAdsAccounts = useUserAdsAccountsStore(
    (state) => state.fetchUserAdsAccounts,
  );
  const userAdsAccounts = useUserAdsAccountsStore(
    (state) => state.userAdsAccounts,
  );

  useEffect(() => {
    const initializeData = async () => {
      if (!user) {
        console.log("[AddAdsAccount] No user found, skipping initialization");
        return;
      }
      
      console.log("[AddAdsAccount] Starting initialization for user:", user.uid);
      setIsLoading(true);

      try {
        // Fetch userDoc if not available, and get the updated value from store
        let currentUserDoc = userDoc;
        if (!currentUserDoc) {
          console.log("[AddAdsAccount] userDoc not available, fetching...");
          await useAuthStore.getState().fetchUserDocument(user.uid);
          await useAuthStore.getState().checkSubscriptionStatus(user.uid);
          // Get the updated userDoc from store after fetching
          currentUserDoc = useAuthStore.getState().userDoc;
          console.log("[AddAdsAccount] userDoc fetched:", currentUserDoc ? "exists" : "null");
        } else {
          console.log("[AddAdsAccount] userDoc already available");
        }

        // Get fresh tracker to check authentication state
        const currentTracker = await getAuthTracker(user.uid);
        setAuthTracker(currentTracker);
        console.log("[AddAdsAccount] Tracker:", {
          exists: !!currentTracker,
          isAuthenticating: currentTracker?.["Is Ads Account Authenticating"],
        });

        // Reset ads accounts state when user changes or when starting fresh
        // Only reset if we're not in the middle of OAuth (to prevent clearing during redirect)
        if (!currentTracker || !currentTracker["Is Ads Account Authenticating"]) {
          console.log("[AddAdsAccount] Resetting adsAccounts (not in OAuth flow)");
          setAdsAccounts(null);
        }

        // If we're in authentication flow, add a delay and retry logic to ensure Firestore has updated the token after OAuth
        let token = null;
        if (currentTracker && currentTracker["Is Ads Account Authenticating"]) {
          console.log("[AddAdsAccount] In OAuth flow, waiting for Firestore to update token...");
          
          // Retry logic to get the correct token after OAuth
          // Sometimes Firestore takes time to update, so we retry a few times
          let retries = 0;
          const maxRetries = 5;
          const retryDelay = 500; // 500ms between retries
          
          while (retries < maxRetries && !token) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            token = await getCurrentUserToken(user.uid);
            
            if (token) {
              console.log(`[AddAdsAccount] Token found after ${retries + 1} attempt(s):`, {
                tokenId: token.id,
                googleEmail: token["Google Email"],
              });
              break;
            }
            
            retries++;
            console.log(`[AddAdsAccount] Token not found, retry ${retries}/${maxRetries}...`);
          }
          
          if (!token) {
            console.error("[AddAdsAccount] Could not find token after OAuth, even after retries");
          }
        } else {
          // Not in OAuth flow, just get the current token
          token = await getCurrentUserToken(user.uid);
        }
        
        setUserToken(token);
        console.log("[AddAdsAccount] Token:", {
          exists: !!token,
          tokenId: token?.id,
          googleEmail: token?.["Google Email"],
        });

        const sub = await getSubscription(user.uid);
        setSubscription(sub);

        // Use currentUserDoc instead of userDoc prop to ensure we have the latest value
        const shouldFetchAccounts = !!(
          token &&
          currentTracker &&
          currentTracker["Is Ads Account Authenticating"] &&
          currentUserDoc
        );

        console.log("[AddAdsAccount] Condition check:", {
          hasToken: !!token,
          hasTracker: !!currentTracker,
          isAuthenticating: currentTracker?.["Is Ads Account Authenticating"],
          hasUserDoc: !!currentUserDoc,
          companyAdminId: currentUserDoc?.["Company Admin"]?.id,
          shouldFetchAccounts,
        });

        if (shouldFetchAccounts && currentUserDoc && token) {
          console.log("[AddAdsAccount] Fetching ads accounts with:", {
            tokenId: token.id,
            googleEmail: token["Google Email"],
            companyAdminId: currentUserDoc["Company Admin"].id,
          });
          
          try {
            const data = await fetchAdsAccounts(
              token.id,
              currentUserDoc["Company Admin"].id,
            );
            console.log("[AddAdsAccount] Fetched ads accounts:", {
              count: Array.isArray(data) ? data.length : "not an array",
              data: data,
            });
            
            if (Array.isArray(data)) {
              if (data.length > 0) {
                setAdsAccounts(data.map((acc: any) => ({ ...acc })));
                console.log("[AddAdsAccount] Set adsAccounts:", data.length, "accounts");
              } else {
                console.warn("[AddAdsAccount] Empty array returned - no accounts found for this email");
                setAdsAccounts([]);
                toast.warning("No ads accounts found for this Google account. Please check if you have any Google Ads accounts associated with this email.");
              }
            } else {
              console.error("[AddAdsAccount] Invalid response format - expected array, got:", typeof data, data);
              setAdsAccounts([]);
              toast.error("Invalid response from server. Please try again.");
            }
            
            await setAdsAccountAuthenticating(user.uid, false);
            console.log("[AddAdsAccount] Set Is Ads Account Authenticating to false");
          } catch (fetchError: any) {
            console.error("[AddAdsAccount] Error fetching ads accounts:", {
              error: fetchError,
              message: fetchError?.message,
              stack: fetchError?.stack,
              status: fetchError?.status,
              statusText: fetchError?.statusText,
              details: fetchError?.details,
              tokenId: token.id,
              googleEmail: token["Google Email"],
              companyAdminId: currentUserDoc["Company Admin"].id,
            });
            
            // Provide user-friendly error messages based on error type
            if (fetchError?.status === 500) {
              toast.error(
                `Server error: Unable to fetch ads accounts for ${token["Google Email"]}. ` +
                `This might be a temporary issue. Please try again or contact support if the problem persists.`
              );
            } else if (fetchError?.status === 401 || fetchError?.status === 403) {
              toast.error(
                `Authentication error: Please reconnect your Google account. ` +
                `The access token may have expired or been revoked.`
              );
            } else {
              toast.error(
                `Failed to fetch ads accounts: ${fetchError?.message || "Unknown error"}. ` +
                `Please try again.`
              );
            }
            
            throw fetchError; // Re-throw to be caught by outer catch
          }
        } else {
          console.log("[AddAdsAccount] Skipping fetch - conditions not met:", {
            shouldFetchAccounts,
            hasUserDoc: !!currentUserDoc,
            hasToken: !!token,
          });
        }
      } catch (error: any) {
        console.error("[AddAdsAccount] Error initializing data:", {
          error,
          message: error?.message,
          stack: error?.stack,
          userId: user.uid,
        });
        toast.error(`Failed to load ads accounts: ${error?.message || "Unknown error"}`);
      } finally {
        setIsLoading(false);
        console.log("[AddAdsAccount] Initialization complete");
      }
    };

    initializeData();
  }, [user, userDoc]);

  const handleConnectGoogleAds = async () => {
    if (!user || isConnecting) {
      console.log("[AddAdsAccount] handleConnectGoogleAds skipped:", {
        hasUser: !!user,
        isConnecting,
      });
      return;
    }
    
    console.log("[AddAdsAccount] Starting Google OAuth flow for user:", user.uid);
    
    try {
      setIsConnecting(true);
      // Clear existing accounts when starting a new OAuth flow
      console.log("[AddAdsAccount] Clearing existing accounts and token");
      setAdsAccounts(null);
      setUserToken(null);
      
      console.log("[AddAdsAccount] Setting Is Ads Account Authenticating to true");
      await setAdsAccountAuthenticating(user.uid, true);

      const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const from = searchParams?.get("from") || "";
      const redirectUri =
        from === "settings"
          ? `${window.location.origin}/redirect?page=add-ads-account-from-settings`
          : `${window.location.origin}/redirect?page=add-ads-account`;

      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?scope=https://www.googleapis.com/auth/adwords%20openid%20https://www.googleapis.com/auth/userinfo.email%20https://www.googleapis.com/auth/userinfo.profile&access_type=offline&include_granted_scopes=true&response_type=code&state=state_parameter_passthrough_value&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&client_id=${GOOGLE_CLIENT_ID}&prompt=consent`;

      console.log("[AddAdsAccount] Redirecting to OAuth URL:", {
        redirectUri,
        from,
        hasClientId: !!GOOGLE_CLIENT_ID,
      });

      window.location.href = oauthUrl;
    } catch (error: any) {
      console.error("[AddAdsAccount] Error initiating Google OAuth:", {
        error,
        message: error?.message,
        stack: error?.stack,
      });
      setIsConnecting(false);
    }
  };

  const handleCardClick = (idx: number) => {
    if (!adsAccounts) return;
    setAdsAccounts(
      adsAccounts.map((acc, i) =>
        i === idx ? { ...acc, "Is Selected": !acc["Is Selected"] } : acc,
      ),
    );
  };

  const handleBudgetChange = (idx: number, value: string) => {
    if (!adsAccounts) return;
    const raw = value.replace(/[^0-9]/g, "");
    setEditingValue(raw);
    const dailyBudget = Number((Number(raw) / 30.4).toFixed(2));
    setAdsAccounts(
      adsAccounts.map((acc, i) =>
        i === idx
          ? {
            ...acc,
            ["Monthly Budget"]: raw,
            ["Daily Budget"]: dailyBudget,
            ["Is Selected"]: Number(raw) >= 0,
          }
          : acc,
      ),
    );
  };

  const handleBudgetFocus = (idx: number, value: string) => {
    setEditingIdx(idx);
    setEditingValue(value);
  };

  const handleBudgetBlur = () => {
    setEditingIdx(null);
    setEditingValue("");
  };

  const isConnectContinueDisabled =
    adsAccounts?.some(
      (acc) =>
        acc["Is Selected"] &&
        (!acc["Monthly Budget"] || Number(acc["Monthly Budget"]) <= 0),
    ) ?? false;

  const handleConnectAndContinue = async () => {
    if (!isFullAccess) {
      toast.warning(
        "You're unable to connect an ads account(s), either your free trial has ended or you haven't subscribed.",
      );
      return;
    }

    if (!adsAccounts || !user || !userDoc) return;

    try {
      setIsLoading(true);

      const updatedAccounts = adsAccounts.map((acc) => {
        if (
          acc["Is Selected"] &&
          Number(acc["Monthly Budget"]) > 0 &&
          !acc["Is Connected"] &&
          userToken
        ) {
          const { ["Created Date"]: _createdDate, ...updatePayload } = acc;
          return {
            ...updatePayload,
            "Is Connected": true,
            User: doc(db, "users", userDoc["Company Admin"].id),
            "User Token": doc(db, "userTokens", userToken.id),
            "Monthly Budget": Number(acc["Monthly Budget"]),
          };
        }
        return acc;
      });

      const accountsToUpdate = updatedAccounts.filter(
        (acc) =>
          acc["Is Selected"] &&
          Number(acc["Monthly Budget"]) > 0 &&
          acc["Is Connected"],
      );

      for (const acc of accountsToUpdate) {
        if (acc._id && userToken) {
          const { ["Created Date"]: _createdDate, ...updatePayload } = acc;
          await updateDoc(doc(db, "adsAccounts", acc._id), {
            ...updatePayload,
            "Selected Users": arrayUnion(doc(db, COLLECTIONS.USERS, user.uid)),
            User: doc(db, "users", userDoc["Company Admin"].id),
            "User Token": doc(db, "userTokens", userToken.id),
            "Monthly Budget": Number(acc["Monthly Budget"]),
          });
        }
      }

      for (const acc of accountsToUpdate) {
        if (acc._id) {
          const adsAccountVarRef = doc(db, "adsAccountVariables", acc._id);
          const adsAccountVarSnap = await getDoc(adsAccountVarRef);

          if (adsAccountVarSnap.exists()) {
            await updateDoc(adsAccountVarRef, {
              DailyBudget: acc["Daily Budget"] || 0,
              MonthlyBudget: acc["Monthly Budget"] || 0,
            });
          } else {
            await setDoc(adsAccountVarRef, {
              "Ads Account": doc(db, "adsAccounts", acc._id),
              User: doc(db, "users", userDoc["Company Admin"].id),
              DailyBudget: acc["Daily Budget"] || 0,
              MonthlyBudget: acc["Monthly Budget"] || 0,
              "Created Date": new Date(),
              ...DEFAULT_ADS_ACCOUNT_VARIABLE,
            });
          }
        }
      }

      const accountsToDelete = updatedAccounts.filter(
        (acc) => !(acc["Is Selected"] && acc["Is Connected"]),
      );

      for (const acc of accountsToDelete) {
        if (acc._id) {
          await deleteDoc(doc(db, "adsAccounts", acc._id));
        }
      }

      if (userDoc) {
        await fetchUserAdsAccounts(userDoc);
      }

      const updatedAdsAccounts =
        useUserAdsAccountsStore.getState().userAdsAccounts;
      const connectedAccountsCount = updatedAdsAccounts.filter(
        (acc) => acc["Is Connected"],
      ).length;

      if (userDoc) {
        const previousCount =
          adsAccounts?.filter((acc) => acc["Is Connected"]).length || 0;

        if (connectedAccountsCount !== previousCount) {
          await useUserAdsAccountsStore
            .getState()
            .updateStripeSubscriptionQuantity(userDoc);
        }
      }

      toast.success("Ads accounts updated successfully");

      if (connectedAccountsCount > 1) {
        router.push("/summary");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error updating ads accounts:", error);
      toast.error("Failed to update ads accounts");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex flex-1 mt-[100px] items-center justify-center mt-12 md:mt-24 px-4 md:mb-24 mb-12">
        <Card className="w-full max-w-md md:max-w-2xl p-0 border border-gray-200 rounded-[15px] shadow-none bg-white">
          <CardContent className="p-6 md:p-10 flex flex-col items-center">
            <h1 className="text-xl md:text-3xl font-bold text-center mb-4 md:mb-6">
              {userAdsAccounts && userAdsAccounts.length > 0
                ? "Add new ads account(s)"
                : "Let's add your first ads account(s)"}
            </h1>
            {adsAccounts && adsAccounts.length > 0 && !isLoading && (
              <div className="flex items-center text-gray-500 text-sm mb-6 md:mb-8 w-full justify-center flex-wrap gap-1">
                <InfoCircledIcon className="w-[14px] mr-2 w-4 h-4 text-blue-500" />
                Not the right ads account? <button
                  className="text-blue-600 font-normal hover:text-blue-800 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  onClick={handleConnectGoogleAds}
                  disabled={isConnecting}
                  type="button"
                >
                  {isConnecting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Click here
                </button>to switch to a different one.
              </div>

            )}
            {isLoading && (
              <div className="w-full flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-gray-500 text-sm">Loading ads accounts...</p>
                </div>
              </div>
            )}

            {adsAccounts && adsAccounts.length > 0 && !isLoading && (
              <div className="w-full max-h-112 overflow-y-auto flex flex-col gap-4 mb-6 md:mb-8 border border-gray-200 rounded-[15px] p-2 overflow-x-hidden thin-scrollbar">
                {adsAccounts.map((acc, idx) => {
                  const isSelected = acc["Is Selected"];
                  const isConnected = acc["Is Connected"];
                  const isInvalid =
                    isSelected &&
                    (!acc["Monthly Budget"] ||
                      Number(acc["Monthly Budget"]) <= 0);
                  const showRaw = editingIdx === idx;
                  const inputValue = showRaw
                    ? editingValue
                    : acc["Monthly Budget"]
                      ? Number(acc["Monthly Budget"]).toLocaleString()
                      : "";
                  return (
                    <div
                      key={acc.id || idx}
                      className={`flex flex-col border rounded-xl p-4 bg-white border-[#5e5e5e] cursor-pointer transition-all md:flex-row ${isSelected || isConnected
                          ? "border-blue-600"
                          : "border-gray-200"
                        }`}
                      onClick={() => handleCardClick(idx)}
                    >
                      <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 md:w-1/2">
                        <div>
                          {acc["Is Connected"] && (
                            <span className="mt-2 sm:mt-0 flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium w-fit mb-2">
                              <CheckCheck className="w-4 h-4 text-green-600" />{" "}
                              Connected
                            </span>
                          )}
                          <div className="text-sm font-semibold text-gray-800">
                            Google Ads Account ID: {formatAccountId(acc.Id)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {acc["Account Name Editable"]}
                          </div>
                        </div>
                      </div>

                      <div className=" w-full items-center gap-2 mt-2 md:w-1/2">
                        <div className="text-sm font-semibold text-gray-800 text-left mb-2 md:text-right">
                          Monthly Budget
                        </div>
                        <div className="flex items-center mt-2 sm:mt-0 gap-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                            <DollarSign className="w-5 h-5 text-blue-600" />
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            min={0}
                            className={`flex-1 border rounded-lg px-2 py-2 text-base md:text-lg font-semibold outline-none transition-all text-right truncate ${isInvalid
                                ? "border-red-500 focus:border-red-500"
                                : "border-gray-200"
                              }`}
                            value={inputValue}
                            onFocus={() =>
                              handleBudgetFocus(
                                idx,
                                acc["Monthly Budget"] || "",
                              )
                            }
                            onBlur={handleBudgetBlur}
                            onChange={(e) =>
                              handleBudgetChange(idx, e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {(!adsAccounts || adsAccounts.length === 0) && !isLoading && (
              <Button
                size="lg"
                className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white text-base md:text-lg font-semibold py-4 md:py-6 mb-4"
                onClick={handleConnectGoogleAds}
                disabled={!user || isConnecting}
              >
                {isConnecting && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
                {isConnecting ? "Connecting..." : "Connect"}
              </Button>
            )}

            {adsAccounts && adsAccounts.length > 0 && !isLoading && (
              <Button
                size="lg"
                className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white text-base md:text-lg font-semibold py-4 md:py-6 mb-4"
                onClick={handleConnectAndContinue}
                disabled={isConnectContinueDisabled || isLoading}
              >
                {isLoading && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
                Connect and continue
              </Button>
            )}

            <div className="flex items-center justify-center text-gray-500 text-sm mb-2 w-full">
              <InfoCircledIcon className="w-[14px] mr-2 w-4 h-4 text-blue-500" />
              You can unlink any ad account from settings at any time.
            </div>

            {(!adsAccounts || adsAccounts.length === 0) && (
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mt-2">
                <div className="flex flex-col items-center bg-gray-50 rounded-xl p-4 w-full sm:w-48">
                  <ShieldCheck className="w-7 h-7 text-blue-500 mb-2" />
                  <span className="font-medium text-gray-800">
                    Secure Connection
                  </span>
                </div>
                <div className="flex flex-col items-center bg-gray-50 rounded-xl p-4 w-full sm:w-48">
                  <CheckCircle className="w-7 h-7 text-green-500 mb-2" />
                  <span className="font-medium text-gray-800">
                    MCC Compatible
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
