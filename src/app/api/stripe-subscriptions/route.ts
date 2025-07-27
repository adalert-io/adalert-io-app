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

// DELETE /api/stripe-subscriptions
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId, customerId } = body;
    
    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    // Cancel the subscription
    const cancelledSubscription = await stripe.subscriptions.cancel(subscriptionId, {
      prorate: true, // Prorate any remaining time
    });

    return NextResponse.json({
      success: true,
      subscription: cancelledSubscription,
      message: 'Subscription cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error cancelling Stripe subscription:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      success: false 
    }, { status: 500 });
  }
}

// Only allow POST and DELETE
export const GET = undefined;
export const PUT = undefined; 