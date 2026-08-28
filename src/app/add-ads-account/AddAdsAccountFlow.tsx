"use client";

import { Button } from "@/components/ui/button";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import {
  CheckCircle,
  CheckCheck,
  DollarSign,
  Loader2,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  arrayUnion,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { toast } from "sonner";

import { db } from "@/lib/firebase/config";
import { COLLECTIONS, DEFAULT_ADS_ACCOUNT_VARIABLE } from "@/lib/constants";
import {
  ADD_ADS_ACCOUNT_OAUTH_STATE,
  markConsumerAddAdsAccountReturn,
} from "@/lib/add-ads-account-oauth";
import { consumerPathForClassicRoute } from "@/lib/consumer-shell-preference";
import { useAuthStore } from "@/lib/store/auth-store";
import { useUserAdsAccountsStore } from "@/lib/store/user-ads-accounts-store";
import {
  fetchAdsAccounts,
  getAuthTracker,
  getCurrentUserToken,
  getSubscription,
  setAdsAccountAuthenticating,
} from "@/services/ads";
import type {
  AdsAccount,
  AuthTracker,
  Subscription,
  UserToken,
} from "@/types/firebaseCollections";

export type AddAdsAccountOAuthContext = "default" | "settings" | "consumer";

export interface AddAdsAccountFlowProps {
  oauthContext?: AddAdsAccountOAuthContext;
  onSuccess?: (connectedCount: number) => void;
}

function formatAccountId(id: string) {
  return id.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
}

function accountMatchesSearch(account: AdsAccount, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const name = (account["Account Name Editable"] || "").toLowerCase();
  const originalName = (account["Account Name Original"] || "").toLowerCase();
  const id = (account.Id || "").toLowerCase();
  const formattedId = formatAccountId(account.Id || "").toLowerCase();
  const digitsOnlyQuery = normalizedQuery.replace(/[-\s]/g, "");

  return (
    name.includes(normalizedQuery) ||
    originalName.includes(normalizedQuery) ||
    id.includes(normalizedQuery) ||
    id.includes(digitsOnlyQuery) ||
    formattedId.includes(normalizedQuery)
  );
}

/**
 * Google OAuth redirect_uri must match an entry in Google Cloud Console exactly.
 * Consumer uses the same `page` as classic; return routing uses sessionStorage
 * (`consumerAddAdsAccountDialog`) set before the OAuth redirect.
 */
function oauthRedirectPage(context: AddAdsAccountOAuthContext): string {
  switch (context) {
    case "settings":
      return "add-ads-account-from-settings";
    case "consumer":
    default:
      return "add-ads-account";
  }
}

function oauthStateParam(context: AddAdsAccountOAuthContext): string {
  switch (context) {
    case "consumer":
      return ADD_ADS_ACCOUNT_OAUTH_STATE.consumer;
    case "settings":
      return ADD_ADS_ACCOUNT_OAUTH_STATE.settings;
    default:
      return ADD_ADS_ACCOUNT_OAUTH_STATE.classic;
  }
}

export function AddAdsAccountFlow({
  oauthContext = "default",
  onSuccess,
}: AddAdsAccountFlowProps) {
  const { user, isFullAccess, userDoc } = useAuthStore();
  const router = useRouter();
  const [userToken, setUserToken] = useState<UserToken | null>(null);
  const [authTracker, setAuthTracker] = useState<AuthTracker | null>(null);
  const [_subscription, setSubscription] = useState<Subscription | null>(null);
  const [adsAccounts, setAdsAccounts] = useState<AdsAccount[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  const filteredAdsAccounts = useMemo(() => {
    if (!adsAccounts) return [];

    return adsAccounts
      .map((account, originalIndex) => ({ account, originalIndex }))
      .filter(({ account }) => accountMatchesSearch(account, searchQuery));
  }, [adsAccounts, searchQuery]);

  const fetchUserAdsAccounts = useUserAdsAccountsStore(
    (state) => state.fetchUserAdsAccounts,
  );
  const userAdsAccounts = useUserAdsAccountsStore(
    (state) => state.userAdsAccounts,
  );

  useEffect(() => {
    const initializeData = async () => {
      if (!user) return;
      setIsLoading(true);
      setAdsAccounts(null);
      setSearchQuery("");

      try {
        if (!userDoc) {
          await useAuthStore.getState().fetchUserDocument(user.uid);
          await useAuthStore.getState().checkSubscriptionStatus(user.uid);
        }

        const token = await getCurrentUserToken(user.uid);
        setUserToken(token);

        const tracker = await getAuthTracker(user.uid);
        setAuthTracker(tracker);

        const sub = await getSubscription(user.uid);
        setSubscription(sub);

        if (
          token &&
          tracker &&
          tracker["Is Ads Account Authenticating"] &&
          userDoc
        ) {
          const data = await fetchAdsAccounts(
            token.id,
            userDoc["Company Admin"].id,
          );
          setAdsAccounts(data.map((acc: AdsAccount) => ({ ...acc })));
          await setAdsAccountAuthenticating(user.uid, false);
        }
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void initializeData();
  }, [user, userDoc]);

  const handleConnectGoogleAds = async () => {
    if (!user || isConnecting) return;

    try {
      setIsConnecting(true);
      await setAdsAccountAuthenticating(user.uid, true);

      if (oauthContext === "consumer") {
        markConsumerAddAdsAccountReturn();
      }

      const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const page = oauthRedirectPage(oauthContext);
      const oauthState = oauthStateParam(oauthContext);
      const redirectUri = `${window.location.origin}/redirect?page=${page}`;

      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?scope=https://www.googleapis.com/auth/adwords%20openid%20https://www.googleapis.com/auth/userinfo.email%20https://www.googleapis.com/auth/userinfo.profile&access_type=offline&include_granted_scopes=true&response_type=code&state=${encodeURIComponent(
        oauthState,
      )}&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}&client_id=${GOOGLE_CLIENT_ID}&prompt=consent`;

      window.location.href = oauthUrl;
    } catch (error) {
      console.error("Error initiating Google OAuth:", error);
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

      if (onSuccess) {
        onSuccess(connectedAccountsCount);
        return;
      }

      if (connectedAccountsCount > 1) {
        router.push(consumerPathForClassicRoute("/summary"));
      } else {
        router.push(consumerPathForClassicRoute("/dashboard"));
      }
    } catch (error) {
      console.error("Error updating ads accounts:", error);
      toast.error("Failed to update ads accounts");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="mb-4 text-center text-xl font-bold text-slate-900 md:mb-6 md:text-2xl">
        {userAdsAccounts && userAdsAccounts.length > 0
          ? "Add new ads account(s)"
          : "Let's add your first ads account(s)"}
      </h2>

      {adsAccounts && adsAccounts.length > 0 && !isLoading ? (
        <div className="mb-6 flex w-full flex-wrap items-center justify-center gap-1 text-sm text-slate-500 md:mb-8">
          <InfoCircledIcon className="mr-2 size-4 text-[#015AFD]" />
          Not the right ads account?{" "}
          <button
            type="button"
            className="inline-flex items-center gap-1 font-medium text-[#015AFD] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleConnectGoogleAds}
            disabled={isConnecting}
          >
            {isConnecting ? <Loader2 className="size-3 animate-spin" /> : null}
            Click here
          </button>{" "}
          to switch to a different one.
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex w-full flex-col items-center gap-3 py-8">
          <Loader2 className="size-8 animate-spin text-[#015AFD]" />
          <p className="text-sm text-slate-500">Loading ads accounts…</p>
        </div>
      ) : null}

      {adsAccounts && adsAccounts.length > 0 && !isLoading ? (
        <div className="mb-6 flex w-full flex-col gap-3 md:mb-8">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-[#015AFD]/20">
            <Search className="size-5 shrink-0 text-[#015AFD]" aria-hidden />
            <input
              className="min-w-0 flex-1 border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              placeholder="Search by account name or ID…"
              value={searchQuery}
              aria-label="Search ad accounts"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <button
                type="button"
                aria-label="Clear search"
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setSearchQuery("")}
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          {filteredAdsAccounts.length > 0 ? (
            <div className="thin-scrollbar flex max-h-96 w-full flex-col gap-4 overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 p-2">
              {filteredAdsAccounts.map(({ account: acc, originalIndex: idx }) => {
                const isSelected = acc["Is Selected"];
                const isConnected = acc["Is Connected"];
                const isInvalid =
                  isSelected &&
                  (!acc["Monthly Budget"] || Number(acc["Monthly Budget"]) <= 0);
                const showRaw = editingIdx === idx;
                const inputValue = showRaw
                  ? editingValue
                  : acc["Monthly Budget"]
                    ? Number(acc["Monthly Budget"]).toLocaleString()
                    : "";

                return (
                  <div
                    key={acc.id || acc._id || acc.Id || String(idx)}
                    role="button"
                    tabIndex={0}
                    className={`flex cursor-pointer flex-col rounded-xl border bg-white p-4 transition-all md:flex-row ${
                      isSelected || isConnected
                        ? "border-[#015AFD]"
                        : "border-slate-200"
                    }`}
                    onClick={() => handleCardClick(idx)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleCardClick(idx);
                      }
                    }}
                  >
                    <div className="mb-2 flex w-full flex-col md:mb-0 md:w-1/2">
                      {acc["Is Connected"] ? (
                        <span className="mb-2 flex w-fit items-center gap-1 rounded-lg bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                          <CheckCheck className="size-4 text-green-600" />
                          Connected
                        </span>
                      ) : null}
                      <div className="text-sm font-semibold text-slate-800">
                        Google Ads Account ID: {formatAccountId(acc.Id)}
                      </div>
                      <div className="text-sm text-slate-500">
                        {acc["Account Name Editable"]}
                      </div>
                    </div>

                    <div className="mt-2 w-full md:mt-0 md:w-1/2">
                      <div className="mb-2 text-left text-sm font-semibold text-slate-800 md:text-right">
                        Monthly Budget
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#015AFD]/10">
                          <DollarSign className="size-5 text-[#015AFD]" />
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          min={0}
                          className={`flex-1 truncate rounded-lg border px-2 py-2 text-right text-base font-semibold outline-none transition-all md:text-lg ${
                            isInvalid
                              ? "border-red-500 focus:border-red-500"
                              : "border-slate-200"
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
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No ad accounts match your search.
            </div>
          )}
        </div>
      ) : null}

      {(!adsAccounts || adsAccounts.length === 0) && !isLoading ? (
        <Button
          size="lg"
          className="mb-4 w-full max-w-xs bg-[#015AFD] py-4 text-base font-semibold text-white hover:bg-[#0146ca] md:py-6 md:text-lg"
          onClick={handleConnectGoogleAds}
          disabled={!user || isConnecting}
        >
          {isConnecting ? (
            <Loader2 className="mr-2 size-5 animate-spin" />
          ) : null}
          {isConnecting ? "Connecting…" : "Connect Google Ads"}
        </Button>
      ) : null}

      {adsAccounts && adsAccounts.length > 0 && !isLoading ? (
        <Button
          size="lg"
          className="mb-4 w-full max-w-xs bg-[#015AFD] py-4 text-base font-semibold text-white hover:bg-[#0146ca] md:py-6 md:text-lg"
          onClick={handleConnectAndContinue}
          disabled={isConnectContinueDisabled || isLoading}
        >
          {isLoading ? <Loader2 className="mr-2 size-5 animate-spin" /> : null}
          Connect and continue
        </Button>
      ) : null}

      <p className="mb-2 flex w-full items-center justify-center text-sm text-slate-500">
        <InfoCircledIcon className="mr-2 size-4 text-[#015AFD]" />
        You can unlink any ad account from settings at any time.
      </p>

      {(!adsAccounts || adsAccounts.length === 0) && !isLoading ? (
        <div className="mt-2 flex w-full flex-col justify-center gap-4 sm:flex-row">
          <div className="flex w-full flex-col items-center rounded-xl bg-slate-50 p-4 sm:w-48">
            <ShieldCheck className="mb-2 size-7 text-[#015AFD]" />
            <span className="font-medium text-slate-800">Secure Connection</span>
          </div>
          <div className="flex w-full flex-col items-center rounded-xl bg-slate-50 p-4 sm:w-48">
            <CheckCircle className="mb-2 size-7 text-green-500" />
            <span className="font-medium text-slate-800">MCC Compatible</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
