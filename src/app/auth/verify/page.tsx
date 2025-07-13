"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase/config";
import { applyActionCode } from "firebase/auth";
import { toast } from "sonner";
import { authConfig } from "@/lib/config/auth-config";
import { createUserDocuments } from "@/lib/store/auth-store";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
