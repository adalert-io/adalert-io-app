import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, paymentMethodId, billingDetails } = body;

    // console.log('Received billing details:', billingDetails);

    if (!userId || !paymentMethodId || !billingDetails) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Fetch user document from Firestore
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();

    // Create customer in Stripe
    const customerData = {
      name: userData['Name'] || billingDetails.nameOnCard,
      email: userData['Email'],
      address: {
        line1: billingDetails.streetAddress,
        city: billingDetails.city,
        state: billingDetails.state,
        postal_code: billingDetails.zip,
        country: billingDetails.country,
      },
      payment_method: paymentMethodId,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    };

    // console.log('Creating Stripe customer with data:', customerData);

    const customer = await stripe.customers.create(customerData);

    // console.log('Created Stripe customer:', customer.id);

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    return NextResponse.json({
      success: true,
      customerId: customer.id,
      customer: customer,
    });
  } catch (error: any) {
    console.error('Error creating Stripe customer:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
      },
      { status: 500 },
    );
  }
}
