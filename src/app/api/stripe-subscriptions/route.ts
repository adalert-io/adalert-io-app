import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

// POST /api/stripe-subscriptions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, priceId, quantity, paymentMethodId } = body;
    if (!customerId || !priceId || !quantity || !paymentMethodId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId, quantity }],
      default_payment_method: paymentMethodId,
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      collection_method: 'charge_automatically',
      automatic_tax: { enabled: false },
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      subscription,
      error: null,
    });
  } catch (error: any) {
    console.error('Error creating Stripe subscription:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// Only allow POST
export const GET = undefined;
export const PUT = undefined;
export const DELETE = undefined; 