"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import LoginForm from "@/app/components/auth/LoginForm";
import SignupForm from "@/app/components/auth/SignupForm";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

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
