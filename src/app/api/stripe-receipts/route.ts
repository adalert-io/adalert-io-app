import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

// GET /api/stripe-receipts?subscriptionId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId');

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing subscriptionId' },
        { status: 400 },
      );
    }

    // Retrieve the subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Retrieve the latest invoice associated with the subscription
    const invoice = await stripe.invoices.retrieve(
      subscription.latest_invoice as string,
    );

    // Get the charge from the invoice
    let charge;
    let receiptUrl: string | null = null;
    let chargeId: string | null = null;
    let amount = invoice.amount_paid;
    let currency = invoice.currency;
    let created = invoice.created;
    let status: string | null = invoice.status;

    // Check if invoice has a charge (older API) or payment_intent (newer API)
    if ((invoice as any).charge) {
      console.log('invoice.charge: ', (invoice as any).charge);
      // Direct charge reference
      charge = await stripe.charges.retrieve((invoice as any).charge as string);
      receiptUrl = charge.receipt_url;
      chargeId = invoice.number || invoice.receipt_number; // charge.id;
      amount = charge.amount;
      currency = charge.currency;
      created = charge.created;
      status = charge.status;
    } else if ((invoice as any).payment_intent) {
      console.log('invoice.payment_intent: ', (invoice as any).payment_intent);
      // Payment intent reference - get the charge from payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(
        (invoice as any).payment_intent as string,
      );
      if (paymentIntent.latest_charge) {
        charge = await stripe.charges.retrieve(
          paymentIntent.latest_charge as string,
        );
        receiptUrl = charge.receipt_url;
        chargeId = invoice.number || invoice.receipt_number; // charge.id;
        amount = charge.amount;
        currency = charge.currency;
        created = charge.created;
        status = charge.status;
      }
    }

    // If no receipt URL found, return invoice information as fallback
    if (!receiptUrl) {
      console.warn(
        'No receipt URL found, using invoice information as fallback',
      );
      console.log('invoice.receipt_number: ', invoice.receipt_number);
      console.log('invoice.number: ', invoice.number);
      return NextResponse.json({
        receiptUrl: invoice.hosted_invoice_url || invoice.invoice_pdf,
        chargeId: invoice.number || invoice.receipt_number, // invoice.id,
        amount,
        currency,
        created,
        status,
        isInvoiceFallback: true,
      });
    }

    // Return the receipt URL and related information
    return NextResponse.json({
      receiptUrl,
      chargeId,
      amount,
      currency,
      created,
      status,
    });
  } catch (error: any) {
    console.error('Error fetching Stripe receipt:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

// Only allow GET
export const POST = undefined;
export const PUT = undefined;
export const DELETE = undefined;
