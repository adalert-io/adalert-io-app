import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, customerId } = await request.json();

    if (!subscriptionId || !customerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing subscriptionId or customerId',
        },
        { status: 400 },
      );
    }

    // console.log(
    //   `Attempting to retry payment for subscription: ${subscriptionId}`,
    // );

    // Get the subscription to check its status
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    // console.log(`Subscription status: ${subscription.status}`);

    // Get the latest invoice for this subscription
    const invoices = await stripe.invoices.list({
      subscription: subscriptionId,
      limit: 1,
      status: 'open',
    });

    if (invoices.data.length === 0) {
      // console.log(`No open invoice found for subscription: ${subscriptionId}`);
      return NextResponse.json(
        {
          success: false,
          error: 'No open invoice found',
        },
        { status: 404 },
      );
    }

    const invoice = invoices.data[0];
    // console.log(
    //   `Found invoice: ${invoice.id}, amount: ${invoice.amount_due}, status: ${invoice.status}`,
    // );

    // Check if the invoice is actually payable (open status)
    if (invoice.status !== 'open') {
      // console.log(
      //   `Invoice ${invoice.id} is not in a payable state. Status: ${invoice.status}`,
      // );
      return NextResponse.json(
        {
          success: false,
          error: `Invoice is not payable. Status: ${invoice.status}`,
        },
        { status: 400 },
      );
    }

    // Get the default payment method from the subscription
    const defaultPaymentMethod = subscription.default_payment_method;
    if (!defaultPaymentMethod) {
      // console.log(
      //   `No default payment method found for subscription: ${subscriptionId}`,
      // );
      return NextResponse.json(
        {
          success: false,
          error: 'No default payment method found',
        },
        { status: 400 },
      );
    }

    // Attempt to pay the invoice
    if (!invoice.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invoice ID is undefined',
        },
        { status: 400 },
      );
    }

    // console.log(
    //   `Attempting to pay invoice ${invoice.id} with payment method: ${defaultPaymentMethod}`,
    // );

    const paidInvoice = await stripe.invoices.pay(invoice.id, {
      payment_method: defaultPaymentMethod as string,
    });

    // console.log(
    //   `Successfully paid invoice: ${paidInvoice.id}, new status: ${paidInvoice.status}`,
    // );

    return NextResponse.json({
      success: true,
      invoiceId: paidInvoice.id,
      status: paidInvoice.status,
      amountPaid: paidInvoice.amount_paid,
      message: 'Payment processed successfully',
    });
  } catch (error: any) {
    console.error('Error retrying payment:', error);

    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        {
          success: false,
          error: `Card error: ${error.message}`,
        },
        { status: 400 },
      );
    } else if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid request: ${error.message}`,
        },
        { status: 400 },
      );
    } else if (error.type === 'StripeAPIError') {
      return NextResponse.json(
        {
          success: false,
          error: `Stripe API error: ${error.message}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to retry payment',
      },
      { status: 500 },
    );
  }
}

// Only allow POST
export const GET = undefined;
export const PUT = undefined;
export const DELETE = undefined;
