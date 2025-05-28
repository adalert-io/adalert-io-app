"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import LoginForm from "@/app/components/auth/LoginForm";
import SignupForm from "@/app/components/auth/SignupForm";
import { Header } from "@/components/layout/header";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex flex-col bg-[#ffffff]">
      <Header />
      <main className="flex flex-1 items-center justify-center">
        {isLogin ? (
          <LoginForm onSwitchToSignup={() => setIsLogin(false)} />
        ) : (
          <SignupForm onSwitchToLogin={() => setIsLogin(true)} />
        )}
      </main>
    </div>
  );
}
