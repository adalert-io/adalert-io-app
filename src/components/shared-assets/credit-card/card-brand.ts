export type CardBrandSlug =
  | "visa"
  | "mastercard"
  | "amex"
  | "discover"
  | "diners"
  | "jcb"
  | "unionpay"
  | "unknown";

export function normalizeCardBrand(brand?: string | null): CardBrandSlug {
  const value = (brand ?? "").toLowerCase().trim().replace(/\s+/g, "_");

  if (value === "visa") return "visa";
  if (value === "mastercard") return "mastercard";
  if (value === "amex" || value === "american_express" || value === "americanexpress") {
    return "amex";
  }
  if (value === "discover") return "discover";
  if (value === "diners" || value === "diners_club") return "diners";
  if (value === "jcb") return "jcb";
  if (value === "unionpay") return "unionpay";

  return "unknown";
}
