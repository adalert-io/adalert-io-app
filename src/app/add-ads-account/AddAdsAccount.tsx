"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { ShieldCheck, CheckCircle } from "lucide-react";
import { Header } from "@/components/layout/header";
import { useAuthStore } from "@/lib/store/auth-store";
import { setAdsAccountAuthenticating } from "./helpers";
import { useSearchParams } from "next/navigation";

export function AddAdsAccount() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();

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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center mt-24">
        <Card className="w-full max-w-2xl p-0 border border-gray-200 rounded-2xl shadow-md bg-white">
          <CardContent className="p-10 flex flex-col items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-6">
              Let&apos;s add your first ads account
            </h1>
            <Button
              size="lg"
              className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold py-6 mb-4"
              onClick={handleConnectGoogleAds}
              disabled={!user}
            >
              Connect Google Ads account(s)
            </Button>
            <div className="flex items-center text-gray-500 text-sm mb-8">
              <InfoCircledIcon className="mr-2 w-5 h-5 text-blue-500" />
              You can unlink any ad accounts anytime you want from settings.
            </div>
            <div className="flex gap-4 w-full justify-center">
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
