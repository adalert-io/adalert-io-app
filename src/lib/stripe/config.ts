import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with your publishable key
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Stripe functionality will be disabled.');
}

export const stripePromise = stripePublishableKey 
  ? loadStripe(stripePublishableKey)
  : Promise.resolve(null);

// Stripe configuration options
export const stripeConfig = {
  // Card element styling
  cardElementOptions: {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
        ':-webkit-autofill': {
          color: '#fce883',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  },
}; 