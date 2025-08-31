import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, customerId, paymentMethodId, oldPaymentMethodId } = body;

    // console.log('Payment method operation:', { action, customerId, paymentMethodId, oldPaymentMethodId });

    if (!action || !customerId || !paymentMethodId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    switch (action) {
      case 'attach':
        // Attach payment method to customer
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });

        // Set as default payment method
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Payment method attached successfully',
        });

      case 'detach':
        // Detach old payment method from customer
        if (oldPaymentMethodId) {
          await stripe.paymentMethods.detach(oldPaymentMethodId);
        }

        return NextResponse.json({
          success: true,
          message: 'Payment method detached successfully',
        });

      case 'replace':
        // Detach old payment method if provided
        if (oldPaymentMethodId) {
          try {
            await stripe.paymentMethods.detach(oldPaymentMethodId);
          } catch (detachError) {
            console.warn('Failed to detach old payment method:', detachError);
            // Continue anyway as the new payment method will be attached
          }
        }

        // Attach new payment method to customer
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });

        // Set as default payment method
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Payment method replaced successfully',
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error handling payment method operation:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
      },
      { status: 500 },
    );
  }
}
