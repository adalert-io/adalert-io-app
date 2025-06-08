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
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type {
  UserToken,
  AuthTracker,
  Subscription,
  AdsAccount,
} from "@/types/firebaseCollections";

function formatAccountId(id: string) {
  // Format as xxx-xxx-xxxx
  return id.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
}

export function AddAdsAccount() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const [userToken, setUserToken] = useState<UserToken | null>(null);
  const [authTracker, setAuthTracker] = useState<AuthTracker | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [adsAccounts, setAdsAccounts] = useState<AdsAccount[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  useEffect(() => {
    const initializeData = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
        // 1. Get userToken document
        const token = await getCurrentUserToken(user.uid);
        setUserToken(token);

        // 2. Get authenticationPageTracker document
        const tracker = await getAuthTracker(user.uid);
        setAuthTracker(tracker);

        // 3. Get subscription document
        const sub = await getSubscription(user.uid);
        setSubscription(sub);

        // 4. Check conditions and make API call
        if (token && tracker && tracker["Is Ads Account Authenticating"]) {
          const data = await fetchAdsAccounts(token.id, user.uid);
          // Add IsSelected property to each account for UI state
          setAdsAccounts(
            data.map((acc: any) => ({
              ...acc,
            }))
          );
        }
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [user]);

  const handleConnectGoogleAds = async () => {
    if (!user) return;
    await setAdsAccountAuthenticating(user.uid);

    const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const from = searchParams.get("from");
    const redirectUri =
      from === "settings"
        ? `${window.location.origin}/redirect?page=add-ads-account-from-settings`
        : `${window.location.origin}/redirect?page=add-ads-account`;

    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?scope=https://www.googleapis.com/auth/adwords%20openid%20https://www.googleapis.com/auth/userinfo.email%20https://www.googleapis.com/auth/userinfo.profile&access_type=offline&include_granted_scopes=true&response_type=code&state=state_parameter_passthrough_value&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&client_id=${GOOGLE_CLIENT_ID}&prompt=consent`;

    window.location.href = oauthUrl;
  };

  // Handle card selection
  const handleCardClick = (idx: number) => {
    if (!adsAccounts) return;
    setAdsAccounts(
      adsAccounts.map((acc, i) =>
        i === idx ? { ...acc, "Is Selected": !acc["Is Selected"] } : acc
      )
    );
  };

  // Handle budget input
  const handleBudgetChange = (idx: number, value: string) => {
    if (!adsAccounts) return;
    // Only allow numbers
    const raw = value.replace(/[^0-9]/g, "");
    setEditingValue(raw);
    setAdsAccounts(
      adsAccounts.map((acc, i) =>
        i === idx ? { ...acc, ["Monthly Budget"]: raw } : acc
      )
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

  // Button disabled logic
  const isConnectContinueDisabled =
    adsAccounts?.some(
      (acc) =>
        acc["Is Selected"] &&
        (!acc["Monthly Budget"] || Number(acc["Monthly Budget"]) <= 0)
    ) ?? false;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center mt-24">
        <Card className="w-full max-w-2xl p-0 border border-gray-200 rounded-2xl shadow-md bg-white">
          <CardContent className="p-10 flex flex-col items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-6">
              {adsAccounts && adsAccounts.length > 0
                ? "Add new ads account"
                : "Let's add your first ads account"}
            </h1>

            {/* Ads Accounts List */}
            {adsAccounts && adsAccounts.length > 0 && (
              <div className="w-full max-h-72 overflow-y-auto flex flex-col gap-4 mb-8">
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
                      className={`border rounded-xl p-4 bg-white shadow-sm cursor-pointer transition-all ${
                        isSelected || isConnected
                          ? "border-blue-600"
                          : "border-gray-200"
                      }`}
                      onClick={() => handleCardClick(idx)}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <div className="text-sm font-semibold text-gray-800">
                            Google Ads Account ID: {formatAccountId(acc.Id)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Account Name: {acc["Account Name Editable"]}
                          </div>
                        </div>
                        {acc["Is Connected"] && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium">
                            <CheckCheck className="w-4 h-4 text-green-600" />{" "}
                            Connected
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                          <DollarSign className="w-5 h-5 text-blue-600" />
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          min={0}
                          className={`flex-1 border rounded-lg px-4 py-2 text-lg font-semibold outline-none transition-all text-right ${
                            isInvalid
                              ? "border-red-500 focus:border-red-500"
                              : "border-gray-200"
                          }`}
                          value={inputValue}
                          onFocus={() =>
                            handleBudgetFocus(idx, acc["Monthly Budget"] || "")
                          }
                          onBlur={handleBudgetBlur}
                          onChange={(e) =>
                            handleBudgetChange(idx, e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Connect Google Ads account(s) Button */}
            {(!adsAccounts || adsAccounts.length === 0) && (
              <Button
                size="lg"
                className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold py-6 mb-4"
                onClick={handleConnectGoogleAds}
                disabled={!user || isLoading}
              >
                {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                Connect Google Ads account(s)
              </Button>
            )}

            {/* Connect and continue Button */}
            {adsAccounts && adsAccounts.length > 0 && (
              <Button
                size="lg"
                className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold py-6 mb-4"
                onClick={() => {}}
                disabled={isConnectContinueDisabled}
              >
                Connect and continue
              </Button>
            )}

            {/* Info and Switch Account Link */}
            <div className="flex items-center text-gray-500 text-sm mb-2 w-full">
              <InfoCircledIcon className="mr-2 w-5 h-5 text-blue-500" />
              You can unlink any ad accounts anytime you want from settings.
            </div>
            {adsAccounts && adsAccounts.length > 0 && (
              <div className="flex items-center text-gray-500 text-sm mb-8 w-full">
                <InfoCircledIcon className="mr-2 w-5 h-5 text-blue-500" />
                Not the right ads account?{" "}
                <button
                  className="ml-1 text-blue-600 underline font-medium hover:text-blue-800 hover:cursor-pointer"
                  onClick={handleConnectGoogleAds}
                  type="button"
                >
                  Click here
                </button>
                &nbsp;to switch to a different one.
              </div>
            )}

            <div className="flex gap-4 w-full justify-center mt-2">
              <div className="flex flex-col items-center bg-gray-50 rounded-xl p-4 w-48">
                <ShieldCheck className="w-7 h-7 text-blue-500 mb-2" />
                <span className="font-medium text-gray-800">
                  Secure Connection
                </span>
              </div>
              <div className="flex flex-col items-center bg-gray-50 rounded-xl p-4 w-48">
                <CheckCircle className="w-7 h-7 text-green-500 mb-2" />
                <span className="font-medium text-gray-800">
                  MCC Compatible
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
