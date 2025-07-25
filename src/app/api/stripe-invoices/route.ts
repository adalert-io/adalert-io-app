import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

// GET /api/stripe-invoices?customerId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    if (!customerId) {
      return NextResponse.json({ error: 'Missing customerId' }, { status: 400 });
    }
    // Fetch invoices for the customer
    const invoices = await stripe.invoices.list({ customer: customerId, limit: 100 });
    return NextResponse.json({ invoices: invoices.data });
  } catch (error: any) {
    console.error('Error fetching Stripe invoices:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// Only allow GET
export const POST = undefined;
export const PUT = undefined;
export const DELETE = undefined; 