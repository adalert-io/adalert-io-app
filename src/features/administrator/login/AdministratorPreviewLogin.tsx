"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { EnvelopeClosedIcon, LockClosedIcon } from "@radix-ui/react-icons";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AdminGateInfoColumn } from "@/features/administrator/login/AdminGateInfoColumn";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Preview-only — must match `src/app/api/admin-preview-gate/route.ts` */
const PREVIEW_ADMIN_EMAIL = "admin@adalert.io";
const PREVIEW_ADMIN_PASSWORD = "eyJhbGciOiJIUzI1N12@";

function PreviewLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextPath = searchParams.get("next");
  const safeNext =
    nextPath?.startsWith("/administrator") && !nextPath.startsWith("/administrator/login")
      ? nextPath
      : "/administrator";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      toast.error("Enter email and password.");
      return;
    }

    if (
      trimmedEmail !== PREVIEW_ADMIN_EMAIL.toLowerCase() ||
      password !== PREVIEW_ADMIN_PASSWORD
    ) {
      toast.error("Incorrect email or password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin-preview-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: trimmedEmail,
          password,
        }),
      });

      if (!response.ok) {
        toast.error("Could not open the console. Try again.");
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

  const canSubmit =
    email.trim().length > 0 && password.length > 0 && !isSubmitting;

  return (
    <div className="mobile-uses grid h-screen max-h-screen grid-cols-1 bg-[#ffffff] md:grid-cols-2">
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-5">
        <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center">
          <Card className="w-full rounded-none border-none bg-transparent p-0 px-2 shadow-none">
            <CardContent className="px-0 text-center">
              <Link
                href="https://adalert.io/"
                className="flex min-w-0 items-center justify-center gap-2 rounded-xl py-2 outline-none focus-visible:ring-2 focus-visible:ring-[#015AFD]"
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
                Sign in with the preview administrator account to unlock the sandbox
                console. This is a temporary front-end gate while reviewers validate UX
                on a non-production host.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5 text-left">
                <div className="space-y-2">
                  <Label
                    htmlFor="admin-email"
                    className="text-start text-[15px] font-semibold text-[#1a2030]"
                  >
                    Email
                  </Label>
                  <div className="relative">
                    <EnvelopeClosedIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-blue-600" />
                    <Input
                      id="admin-email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      className="h-12 rounded-2xl pl-11 text-[15px]"
                      placeholder="admin@adalert.io"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="admin-password"
                    className="text-start text-[15px] font-semibold text-[#1a2030]"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <LockClosedIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-blue-600" />
                    <Input
                      id="admin-password"
                      name="password"
                      type={isPasswordVisible ? "text" : "password"}
                      autoComplete="current-password"
                      className="h-12 rounded-2xl pl-11 pr-12 text-[15px]"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setIsPasswordVisible((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#59657a] hover:bg-slate-100 hover:text-slate-900"
                      aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                    >
                      {isPasswordVisible ? (
                        <EyeOff className="size-5" aria-hidden />
                      ) : (
                        <Eye className="size-5" aria-hidden />
                      )}
                    </button>
                  </div>
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
                  className="rounded font-semibold text-[#015AFD] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#015AFD]/40"
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
