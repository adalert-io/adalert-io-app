"use client";

import { CreditCard as CreditCardIcon } from "lucide-react";

import CreditCard from "@/components/shared-assets/credit-card/credit-card";
import { cn } from "@/lib/utils";

function formatCardCompanyLabel(brand?: string | null): string {
  const value = (brand ?? "").toLowerCase().trim();
  if (value === "mastercard") return "MASTERCARD";
  if (value === "visa") return "VISA";
  if (value === "amex" || value === "american express" || value === "american_express") {
    return "AMERICAN EXPRESS";
  }
  if (value === "discover") return "DISCOVER";
  if (value === "jcb") return "JCB";
  if (value === "diners" || value === "diners_club") return "DINERS CLUB";
  if (value === "unionpay") return "UNIONPAY";
  return "CARD";
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
  const companyLabel = formatCardCompanyLabel(brand);

  if (isEmpty) {
    return (
      <div
        className={cn(
          "flex max-w-[340px] min-w-[300px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center",
          className,
        )}
      >
        <CreditCardIcon className="size-9 text-slate-400" strokeWidth={1.5} aria-hidden />
        <p className="text-sm font-medium text-slate-700">No payment method</p>
        <p className="text-xs text-slate-500">Add a card to activate billing</p>
      </div>
    );
  }

  return (
    <CreditCard
      type="adalert-blue"
      company={companyLabel}
      cardBrand={brand}
      cardNumber={`•••• •••• •••• ${last4 ?? "••••"}`}
      cardHolder={(cardholderName?.trim() || "—").toUpperCase()}
      cardExpiration={`${expMonthLabel || "••"}/${expYearLabel || "••"}`}
      width={340}
      className={cn("shadow-lg", className)}
    />
  );
}
