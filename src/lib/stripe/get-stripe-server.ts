import Stripe from "stripe";

const stripeApiVersion = "2025-06-30.basil" as const;

let stripeCache: Stripe | null | undefined;

/**
 * Lazy Stripe client — avoids initializing at module load (would break Next.js build without env vars).
 */
export function getStripeServer(): Stripe | null {
  if (stripeCache !== undefined) {
    return stripeCache;
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    stripeCache = null;
    return null;
  }
  stripeCache = new Stripe(key, { apiVersion: stripeApiVersion });
  return stripeCache;
}
