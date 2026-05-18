"use client";

import Link from "next/link";
import { useState } from "react";
import { Globe2, Settings2, UserCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function AdminSettingsView() {
  const [siteTitle, setSiteTitle] = useState("adAlert.io");
  const [tagline, setTagline] = useState(
    "AI-powered ad monitoring for Google Ads teams.",
  );
  const [adminName, setAdminName] = useState("Preview Administrator");
  const [adminEmail, setAdminEmail] = useState("admin@adalert.io");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 pb-16">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#015AFD] to-[#3b82f6] text-white shadow-md",
            )}
          >
            <Settings2 className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-gray-900 sm:text-[30px]">
              General settings
            </h1>
            <p className="text-[15px] text-[#7A7D9C]">
              Site branding and your administrator profile for this preview console.
            </p>
          </div>
        </div>
      </header>

      <Card className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md">
        <div className="h-1 w-full bg-gradient-to-r from-[#015AFD] via-[#38bdf8] to-[#22c55e]" aria-hidden />
        <CardHeader className="gap-1 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-2">
            <Globe2 className="size-5 text-[#015AFD]" aria-hidden />
            <p className="text-lg font-bold text-slate-900">Site &amp; branding</p>
          </div>
          <p className="text-[14px] text-slate-500">
            Shown in the console header and outbound communications in a full rollout.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-8">
          <div className="space-y-2">
            <Label htmlFor="site-title" className="text-slate-800">
              Site title
            </Label>
            <Input
              id="site-title"
              value={siteTitle}
              onChange={(event) => setSiteTitle(event.target.value)}
              className="rounded-xl border-slate-200 text-[15px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-tagline" className="text-slate-800">
              Tagline
            </Label>
            <Textarea
              id="site-tagline"
              value={tagline}
              onChange={(event) => setTagline(event.target.value)}
              rows={3}
              className="resize-y rounded-xl border-slate-200 text-[15px] leading-relaxed"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-slate-200/90 bg-slate-50/40 shadow-md">
        <CardHeader className="gap-1 border-b border-slate-100 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <UserCircle2 className="size-5 text-[#015AFD]" aria-hidden />
              <p className="text-lg font-bold text-slate-900">Administrator profile</p>
            </div>
            <Badge variant="secondary" className="rounded-lg font-semibold">
              Super admin
            </Badge>
          </div>
          <p className="text-[14px] text-slate-500">
            How you appear to other operators in this workspace (preview data only).
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-8">
          <div className="space-y-2">
            <Label htmlFor="admin-display-name" className="text-slate-800">
              Display name
            </Label>
            <Input
              id="admin-display-name"
              value={adminName}
              onChange={(event) => setAdminName(event.target.value)}
              className="rounded-xl border-slate-200 bg-white text-[15px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-email" className="text-slate-800">
              Email
            </Label>
            <Input
              id="admin-email"
              type="email"
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
              className="rounded-xl border-slate-200 bg-white text-[15px]"
            />
          </div>
          <div className="rounded-xl border border-dashed border-slate-200 bg-white/80 px-4 py-3 text-[13px] text-slate-600">
            <span className="font-semibold text-slate-800">Role:</span>{" "}
            Super administrator — full access to customers, billing views, and system
            configuration when connected to production services.
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3 border-t border-slate-100 pt-8">
          <Button
            type="button"
            className="rounded-xl bg-[#015AFD] px-8 font-semibold hover:bg-[#014bcc]"
          >
            Save changes
          </Button>
          <Button type="button" variant="outline" className="rounded-xl">
            Discard
          </Button>
        </CardFooter>
      </Card>

      <footer className="flex flex-col gap-3 border-t border-gray-100 pt-6 text-[13px] text-[#94a3b8] md:flex-row md:items-center md:justify-between">
        <span>© {new Date().getFullYear()} adAlert.io. All rights reserved.</span>
        <div className="flex flex-wrap gap-4 font-semibold text-[#015AFD]">
          <Link className="hover:underline" href="#">
            Privacy Policy
          </Link>
          <Link className="hover:underline" href="#">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}
