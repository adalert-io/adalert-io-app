"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LockClosedIcon } from "@radix-ui/react-icons";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AdminGateInfoColumn } from "@/features/administrator/login/AdminGateInfoColumn";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function PreviewLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [digits, setDigits] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextPath = searchParams.get("next");
  const safeNext =
    nextPath?.startsWith("/administrator") && !nextPath.startsWith("/administrator/login")
      ? nextPath
      : "/administrator";

  function handleDigitsChange(raw: string) {
    const only = raw.replace(/\D/g, "").slice(0, 6);
    setDigits(only);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (digits.length !== 6) {
      toast.error("Enter the full six-digit access code.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin-preview-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: digits }),
      });

      if (!response.ok) {
        toast.error("Incorrect access code.");
        setIsSubmitting(false);
        return;
      }

      toast.success("Access granted.");
      router.replace(safeNext);
      router.refresh();
    } catch (error) {
      console.error("[administrator gate]", error);
      toast.error("Could not validate access.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = digits.length === 6 && !isSubmitting;

  return (
    <div className="mobile-uses grid h-screen max-h-screen grid-cols-1 bg-[#ffffff] md:grid-cols-2">
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-5">
        <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center">
          <Card className="w-full rounded-none border-none bg-transparent p-0 px-2 shadow-none">
            <CardContent className="px-0 text-center">
              <Link
                href="https://adalert.io/"
                className="flex min-w-0 items-center justify-center gap-2 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[#015AFD] rounded-xl"
              >
                <span className="mb-4 flex items-center gap-3 text-[25px] font-bold">
                  <Image
                    src="/images/adalert-logo.avif"
                    alt="adAlert.io"
                    width={40}
                    height={40}
                    priority
                  />
                  <span className="text-[#223b53]">adAlert.io</span>
                </span>
              </Link>

              <h3 className="mb-3 text-[24px] font-bold text-[#1a2030]">
                Administrator preview gate
              </h3>

              <p className="mb-10 text-[14px] leading-relaxed text-[#59657a]">
                Enter your six-digit temporary access PIN to unlock the sandbox
                console. This replaces email login while reviewers validate UX on
                a non-production host.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6 text-left">
                <div className="space-y-3">
                  <Label
                    htmlFor="admin-pin"
                    className="text-start text-[15px] font-semibold text-[#1a2030]"
                  >
                    Six-digit PIN
                  </Label>
                  <div className="relative">
                    <LockClosedIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-blue-600" />
                    <Input
                      id="admin-pin"
                      name="pin"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      aria-describedby="admin-pin-helper"
                      className="h-14 rounded-2xl pl-11 text-center text-2xl font-semibold tracking-[0.5em]"
                      placeholder="• • • • • •"
                      value={digits}
                      onChange={(event) =>
                        handleDigitsChange(event.target.value)
                      }
                    />
                  </div>
                  <p id="admin-pin-helper" className="text-[12px] text-[#7b8496]">
                    Codes rotate per review cycle — request the newest digits from an
                    adAlert engineer if yours fails.
                  </p>
                </div>

                <Button
                  type="submit"
                  className={`h-auto w-full rounded-2xl py-6 text-base font-semibold transition-colors duration-200 ${
                    canSubmit
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "cursor-not-allowed bg-gray-300 text-gray-600"
                  }`}
                  disabled={!canSubmit}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="size-5 animate-spin" aria-hidden />
                      Verifying…
                    </span>
                  ) : (
                    "Enter console"
                  )}
                </Button>
              </form>

              <p className="mt-8 text-[12px] text-[#7b8496]">
                Looking for the customer login? Visit{" "}
                <Link
                  href="/auth"
                  className="font-semibold text-[#015AFD] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#015AFD]/40 rounded"
                >
                  /auth
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <AdminGateInfoColumn />
    </div>
  );
}

export function AdministratorPreviewLogin() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <Loader2 className="size-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <PreviewLoginInner />
    </Suspense>
  );
}
