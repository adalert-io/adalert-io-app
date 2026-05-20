"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ConsumerPreviewGateInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextPath = searchParams.get("next");
  const safeNext =
    nextPath?.startsWith("/consumer") &&
    !nextPath.startsWith("/consumer/preview-gate")
      ? nextPath
      : "/consumer/summary";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!pin.trim()) {
      toast.error("Enter the preview PIN.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/consumer-preview-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pin: pin.trim() }),
      });

      if (!response.ok) {
        toast.error("Incorrect PIN.");
        setIsSubmitting(false);
        return;
      }

      toast.success("Preview access granted.");
      router.replace(safeNext);
      router.refresh();
    } catch (error) {
      console.error("[consumer preview gate]", error);
      toast.error("Could not validate PIN.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] px-4 py-10">
      <Card className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-md">
        <CardContent className="space-y-6 p-8 text-center">
          <Link
            href="https://adalert.io/"
            className="inline-flex items-center justify-center gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#015AFD]"
          >
            <Image
              src="/images/adalert-logo.avif"
              alt="adAlert.io"
              width={36}
              height={36}
              priority
            />
            <span className="text-xl font-bold text-slate-800">adAlert.io</span>
          </Link>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Consumer preview
            </h1>
            <p className="text-sm leading-relaxed text-slate-500">
              This console is not released to customers yet. Enter the preview PIN to
              continue, or use the standard app from your account menu.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div className="space-y-2">
              <Label htmlFor="consumer-preview-pin" className="text-slate-700">
                Preview PIN
              </Label>
              <Input
                id="consumer-preview-pin"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Enter PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="h-11 rounded-xl border-slate-200 text-center text-lg tracking-[0.3em]"
                disabled={isSubmitting}
              />
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-xl bg-[#015AFD] font-semibold hover:bg-[#0146ca]"
              disabled={isSubmitting || !pin.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Verifying…
                </>
              ) : (
                "Continue to preview"
              )}
            </Button>
          </form>

          <Link
            href="/summary"
            className="inline-block text-sm font-medium text-[#015AFD] hover:underline"
          >
            Back to standard Summary
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export function ConsumerPreviewGate() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-8 animate-spin text-[#015AFD]" aria-hidden />
        </div>
      }
    >
      <ConsumerPreviewGateInner />
    </Suspense>
  );
}
