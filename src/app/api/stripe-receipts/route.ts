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

    // Retrieve all invoices for the subscription with manual pagination
    const receipts: Array<{
      created: number | null;
      chargeId: string | null;
      status: string | null;
      receiptUrl: string | null;
    }> = [];

    let startingAfter: string | undefined = undefined;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page: Stripe.ApiList<Stripe.Invoice> = await stripe.invoices.list({
        subscription: subscriptionId,
        limit: 100,
        starting_after: startingAfter,
      });

      for (const invoice of page.data) {
        let receiptUrl: string | null = null;

        // If the invoice has a direct charge id, use that to fetch the receipt
        const invoiceAny = invoice as Stripe.Invoice & {
          charge?: string | Stripe.Charge | null;
          payment_intent?: string | Stripe.PaymentIntent | null;
        };

        if (invoiceAny.charge && typeof invoiceAny.charge === 'string') {
          try {
            const charge = await stripe.charges.retrieve(invoiceAny.charge);
            receiptUrl = charge.receipt_url || null;
          } catch {
            // ignore and fall back below
          }
        }

        // If no charge yet, try via payment_intent -> latest_charge
        if (!receiptUrl && invoiceAny.payment_intent) {
          if (typeof invoiceAny.payment_intent === 'string') {
            try {
              const pi = await stripe.paymentIntents.retrieve(
                invoiceAny.payment_intent,
              );
              const latestChargeId =
                typeof pi.latest_charge === 'string' ? pi.latest_charge : null;
              if (latestChargeId) {
                const latestCharge = await stripe.charges.retrieve(
                  latestChargeId,
                );
                receiptUrl = latestCharge.receipt_url || null;
              } else {
                // As a fallback, list charges for this payment intent
                const chargesList = await stripe.charges.list({
                  payment_intent: pi.id,
                  limit: 1,
                });
                const first = chargesList.data[0];
                receiptUrl = first?.receipt_url || null;
              }
            } catch {
              // ignore and fall back below
            }
          }
        }

        // Final fallback to hosted invoice URL or PDF
        if (!receiptUrl) {
          receiptUrl =
            invoice.hosted_invoice_url || invoice.invoice_pdf || null;
        }

        receipts.push({
          created: invoice.created ?? null,
          chargeId: invoice.number || invoice.receipt_number || null,
          status: invoice.status || null,
          receiptUrl,
        });
      }

      if (!page.has_more) break;
      startingAfter = page.data[page.data.length - 1]?.id;
    }

    // Sort by created desc for convenience
    receipts.sort((a, b) => (b.created || 0) - (a.created || 0));

    // Backward compatibility: also include latest invoice-like fields
    const latest = receipts[0] || null;

    console.log('receipts now: ', receipts);

    return NextResponse.json({
      receipts,
      ...(latest
        ? {
            receiptUrl: latest.receiptUrl,
            chargeId: latest.chargeId,
            created: latest.created,
            status: latest.status,
          }
        : {}),
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
