"use client";

import { Suspense } from "react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import LoginForm from "@/app/components/auth/LoginForm";
import SignupForm from "@/app/components/auth/SignupForm";
import { Loader2 } from "lucide-react";

function AuthPageContent() {
  const [isLogin, setIsLogin] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for mode parameter in URL
    if (searchParams) {
      const mode = searchParams.get("mode");
      if (mode === "login") {
        setIsLogin(true);
      } else if (mode === "signup") {
        setIsLogin(false);
      }
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col bg-[#ffffff]">
      <main className="flex flex-1">
        {isLogin ? (
          <div className="w-full h-full flex-1">
            <LoginForm onSwitchToSignup={() => setIsLogin(false)} />
          </div>
        ) : (
          <div className="w-full flex-1">
            <SignupForm onSwitchToLogin={() => setIsLogin(true)} />
          </div>
        )}
      </main>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col bg-[#ffffff]">
      <main className="flex flex-1">
        <div className="w-full h-full flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="animate-spin w-8 h-8 text-blue-600 mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthPageContent />
    </Suspense>
  );
}
