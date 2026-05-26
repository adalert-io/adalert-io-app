"use client";

import { CreditCard } from "lucide-react";

import { cn } from "@/lib/utils";

function ContactlessIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M8 16C8 11.5817 11.5817 8 16 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4 16C4 9.37258 9.37258 4 16 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 16C16 13.7909 17.7909 12 20 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M0 16C0 7.16344 7.16344 0 16 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CardChip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative h-9 w-12 overflow-hidden rounded-md border border-amber-200/40 bg-gradient-to-br from-amber-200 via-amber-100 to-amber-300 shadow-sm",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-0 grid grid-cols-2 gap-px p-1 opacity-60">
        <div className="rounded-sm bg-amber-400/30" />
        <div className="rounded-sm bg-amber-400/30" />
        <div className="rounded-sm bg-amber-400/30" />
        <div className="rounded-sm bg-amber-400/30" />
      </div>
    </div>
  );
}

function formatBrandLabel(brand: string | null | undefined): string {
  const value = (brand ?? "card").toLowerCase();
  if (value === "visa") return "VISA";
  if (value === "mastercard") return "Mastercard";
  if (value === "amex" || value === "american express") return "AMEX";
  if (value === "discover") return "Discover";
  return value.toUpperCase();
}

export interface ConsumerPaymentMethodCardProps {
  brand?: string | null;
  last4?: string | null;
  expMonth?: string | number | null;
  expYear?: string | number | null;
  cardholderName?: string | null;
  isEmpty?: boolean;
  className?: string;
}

export function ConsumerPaymentMethodCard({
  brand,
  last4,
  expMonth,
  expYear,
  cardholderName,
  isEmpty = false,
  className,
}: ConsumerPaymentMethodCardProps) {
  const expMonthLabel = String(expMonth ?? "").padStart(2, "0").slice(-2);
  const expYearLabel = String(expYear ?? "").slice(-2);
  const brandLabel = formatBrandLabel(brand);

  return (
    <div
      className={cn(
        "relative aspect-[1.586/1] w-full max-w-[340px] min-w-[300px] overflow-hidden rounded-2xl p-6 text-white shadow-lg",
        "bg-gradient-to-br from-[#0146ca] via-[#015AFD] to-[#3b82f6]",
        "ring-1 ring-white/20",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-8 size-36 rounded-full bg-[#60a5fa]/25 blur-2xl"
        aria-hidden
      />

      <div className="relative flex h-full min-h-[168px] flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <CardChip />
          <div className="flex flex-col items-end gap-2">
            <ContactlessIcon className="size-8 text-white/90" />
            {!isEmpty ? (
              <span className="text-sm font-bold tracking-wide text-white/95">
                {brandLabel}
              </span>
            ) : null}
          </div>
        </div>

        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-2 text-center">
            <CreditCard className="size-9 text-white/70" strokeWidth={1.5} aria-hidden />
            <p className="text-sm font-medium text-white/90">No payment method</p>
            <p className="text-xs text-white/65">Add a card to activate billing</p>
          </div>
        ) : (
          <>
            <p className="mt-4 font-mono text-[19px] font-semibold tracking-[0.2em] text-white sm:text-[21px]">
              •••• &nbsp; •••• &nbsp; •••• &nbsp; {last4 ?? "••••"}
            </p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/60">
                  Cardholder
                </p>
                <p className="truncate text-sm font-semibold uppercase text-white/95">
                  {cardholderName?.trim() || "—"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/60">
                  Expires
                </p>
                <p className="font-mono text-sm font-semibold text-white/95">
                  {expMonthLabel || "••"} / {expYearLabel || "••"}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
