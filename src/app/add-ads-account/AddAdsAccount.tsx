"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { useSearchParams } from "next/navigation";

import { AddAdsAccountFlow, type AddAdsAccountOAuthContext } from "./AddAdsAccountFlow";

export function AddAdsAccount() {
  const searchParams = useSearchParams();
  const from = searchParams?.get("from");
  const oauthContext: AddAdsAccountOAuthContext =
    from === "settings" ? "settings" : "default";

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="mb-12 mt-[100px] flex flex-1 items-center justify-center px-4 md:mb-24 md:mt-24">
        <Card className="w-full max-w-md rounded-[15px] border border-gray-200 bg-white p-0 shadow-none md:max-w-2xl">
          <CardContent className="flex flex-col items-center p-6 md:p-10">
            <AddAdsAccountFlow oauthContext={oauthContext} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
