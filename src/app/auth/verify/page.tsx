"use client";

import { Suspense } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/firebase/config";
import {
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { toast } from "sonner";
import { authConfig } from "@/lib/config/auth-config";
import { createUserDocuments } from "@/lib/store/auth-store";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import {
  EyeClosedIcon,
  EyeOpenIcon,
  LockClosedIcon,
  EnvelopeClosedIcon,
} from "@radix-ui/react-icons";
import Image from "next/image";
import Link from "next/link";
import Reviews from "@/components/reviews/Reviews";

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");
  const [initializing, setInitializing] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const isMatch = useMemo(
    () => password.length > 0 && password === confirmPassword,
    [password, confirmPassword],
  );

  useEffect(() => {
    const checkCode = async () => {
      try {
        if (!oobCode) {
          throw new Error("Invalid reset link");
        }
        const emailFromCode = await verifyPasswordResetCode(auth, oobCode);
        setEmail(emailFromCode);
      } catch (err: any) {
        toast.error(err?.message || "Invalid or expired reset link");
      } finally {
        setInitializing(false);
      }
    };
    checkCode();
  }, [oobCode]);

  const handleSubmit = async () => {
    try {
      if (!oobCode) {
        toast.error("Invalid reset link");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters");
        return;
      }
      setIsSubmitting(true);
      await confirmPasswordReset(auth, oobCode, password);
      toast.success("Password has been reset. Please sign in.");
      router.push("/auth?mode=login");
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ffffff] p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Set New Password
            </CardTitle>
            <CardDescription className="text-center">
              Preparing reset...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-screen grid grid-cols-1 md:grid-cols-2 mobile-uses">
      {/* Left Panel - Reset Password Form */}
      <div className="flex items-center justify-center p-5">
        <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center flex-1">
          <Card className="w-full bg-white shadow-none border-none rounded-none p-0">
            <CardHeader>
              <Link
                href="https://adalert.io/"
                className="flex items-center justify-center gap-2 min-w-0 py-2"
              >
                <h1 className="flex items-center justify-center gap-2 text-[25px] font-bold mb-4">
                  <Image
                    src="/images/adalert-logo.avif"
                    alt="logo"
                    width={40}
                    height={40}
                  />
                  <span className="text-[#223b53]">adAlert.io</span>
                </h1>
              </Link>
              <CardTitle className="font-bold text-center text-[24px]">
                Reset Password
              </CardTitle>
              <CardDescription className="text-center">
                Reset your password
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 flex-1 flex flex-col justify-center">
              <form
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                {/* Email Field (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <EnvelopeClosedIcon className="absolute left-3 top-2.5 h-5 w-5 text-blue-600" />
                    <Input
                      type="email"
                      value={email || ""}
                      className="pl-10 bg-gray-50 cursor-not-allowed"
                      readOnly
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This email is associated with your account
                  </p>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-3 top-2.5 h-5 w-5 text-blue-600" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter New Password"
                      className="pl-10 pr-10"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-3 top-2.5 text-blue-600"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                    </button>
                  </div>

                  {/* Password requirements and strength bar */}
                  {password.length > 0 && (
                    <>
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          {password.length >= 8 ? (
                            <CheckCircle className="text-blue-600 w-4 h-4" />
                          ) : (
                            <XCircle className="text-gray-400 w-4 h-4" />
                          )}
                          8 characters minimum
                        </div>
                        <div className="flex items-center gap-2">
                          {/[A-Z]/.test(password) ? (
                            <CheckCircle className="text-blue-600 w-4 h-4" />
                          ) : (
                            <XCircle className="text-gray-400 w-4 h-4" />
                          )}
                          One uppercase letter
                        </div>
                        <div className="flex items-center gap-2">
                          {/[0-9]/.test(password) ? (
                            <CheckCircle className="text-blue-600 w-4 h-4" />
                          ) : (
                            <XCircle className="text-gray-400 w-4 h-4" />
                          )}
                          One number
                        </div>
                        <div className="flex items-center gap-2">
                          {/[^A-Za-z0-9]/.test(password) ? (
                            <CheckCircle className="text-blue-600 w-4 h-4" />
                          ) : (
                            <XCircle className="text-gray-400 w-4 h-4" />
                          )}
                          One Special Character{" "}
                          <span className="ml-1 text-xs text-gray-500">
                            @ $ ! % * ? &
                          </span>
                        </div>
                      </div>
                      {/* Password strength bar */}
                      <div className="mt-3">
                        <span className="text-xs font-semibold text-gray-600">
                          Strength
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={`h-2 w-8 rounded-full ${
                                getPasswordStrength(password) >= i
                                  ? "bg-blue-600"
                                  : "bg-gray-200"
                              }`}
                            />
                          ))}
                          <span className="ml-2 text-xs text-gray-500">
                            {
                              ["", "Weak", "Fair", "Good", "Strong"][
                                getPasswordStrength(password)
                              ]
                            }
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-3 top-2.5 h-5 w-5 text-blue-600" />
                    <Input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm Password"
                      className="pl-10 pr-10"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={
                        showConfirm ? "Hide password" : "Show password"
                      }
                      className="absolute right-3 top-2.5 text-blue-600"
                      onClick={() => setShowConfirm((v) => !v)}
                    >
                      {showConfirm ? <EyeClosedIcon /> : <EyeOpenIcon />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!isMatch || isSubmitting || password.length < 8}
                  className={`w-full mt-2 py-6 text-base font-semibold transition-colors duration-200 ${
                    isMatch && password.length >= 8
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-400 text-white cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Panel - Reviews */}
      <Reviews />
    </div>
  );
}

function VerifyEmailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (mode === "resetPassword") {
    return <ResetPasswordContent />;
  }

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get the oobCode from the URL
        const oobCode = searchParams.get("oobCode");

        if (!oobCode) {
          throw new Error("Invalid verification link");
        }

        // Apply the verification code
        await applyActionCode(auth, oobCode);

        // Get the current user
        const user = auth.currentUser;
        if (!user) {
          throw new Error("No user found");
        }

        // Create user documents after successful verification
        await createUserDocuments(user, false, true);

        // Create contacts in external platforms using the new API
        const userName =
          user.displayName || user.email?.split("@")[0] || "User";

        try {
          const response = await fetch("/api/contacts/create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ user, userName }),
          });

          if (response.ok) {
            const contactResult = await response.json();

            // Update user document with contact IDs if they were created
            if (contactResult.result.success) {
              const { doc, updateDoc } = await import("firebase/firestore");
              const { db } = await import("@/lib/firebase/config");
              await updateDoc(
                doc(db, "users", user.uid),
                contactResult.result.contactIds as any,
              );
            }

            // Log any contact creation errors
            if (contactResult.result.errors.length > 0) {
              console.warn(
                "Contact creation errors:",
                contactResult.result.errors,
              );
            }
          }
        } catch (error) {
          console.warn("Failed to create contacts:", error);
        }

        toast.success("Email verified successfully!");
        // Use dynamic redirect URL
        setTimeout(() => {
          router.push(authConfig.getRedirectUrl());
        }, 2000);
      } catch (err: any) {
        console.error("Verification error:", err);
        setError(err.message || "Failed to verify email");
        toast.error(err.message || "Failed to verify email");
      } finally {
        setVerifying(false);
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#ffffff] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Email Verification
          </CardTitle>
          <CardDescription className="text-center">
            {verifying
              ? "Verifying your email..."
              : error
              ? "Verification failed"
              : "Email verified successfully!"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
          {!verifying && (
            <div className="flex justify-center">
              <Button
                onClick={() => router.push("/auth?mode=login")}
                className="w-full"
              >
                {error ? "Try Again" : "Go to Login"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#ffffff] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Email Verification
          </CardTitle>
          <CardDescription className="text-center">Loading...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}
