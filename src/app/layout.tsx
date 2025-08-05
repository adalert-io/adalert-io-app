import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthSync } from "@/components/auth/auth-sync";
import { IntercomProvider, IntercomUserSync } from "@/components/intercom";
import { AuthStateHandler } from "@/components/auth/auth-state-handler";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AdAlert.io - Ad Monitoring Platform",
  description: "Monitor your ads and get real-time alerts",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthSync>
          <IntercomProvider autoInitialize={true}>
            <IntercomUserSync />
            <AuthStateHandler />
            {children}
            <Toaster richColors position="top-center" />
          </IntercomProvider>
        </AuthSync>
      </body>
    </html>
  );
}
