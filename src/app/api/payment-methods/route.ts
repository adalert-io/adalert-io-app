import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, collection } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userRef, // Firestore user reference string (e.g., /users/abc123)
      paymentMethodType, // e.g., 'Credit Card'
      stripeCardBrand,
      stripeCity,
      stripeCountry,
      stripeExpiredMonth,
      stripeExpiredYear,
      stripeLast4Digits,
      stripeName,
      stripePaymentMethod,
      stripeState,
      stripeAddress,
      zip,
    } = body;

    if (!userRef || !stripePaymentMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Parse userRef to get userId
    let userId = '';
    if (typeof userRef === 'string') {
      const match = userRef.match(/\/users\/(.+)/);
      if (match && match[1]) {
        userId = match[1];
      }
    } else if (typeof userRef === 'object' && userRef.id) {
      userId = userRef.id;
    }
    if (!userId) {
      return NextResponse.json({ error: 'Invalid userRef' }, { status: 400 });
    }
    const userReference = doc(db, 'users', userId);

    // Prepare Firestore document
    const paymentMethodDoc = {
      'User': userReference,
      'Payment Method': paymentMethodType,
      'Stripe Card Brand': stripeCardBrand,
      'Stripe City': stripeCity,
      'Stripe Country': stripeCountry,
      'Stripe Expired Month': stripeExpiredMonth,
      'Stripe Expired Year': stripeExpiredYear,
      'Stripe Last 4 Digits': stripeLast4Digits,
      'Stripe Name': stripeName,
      'Stripe Payment Method': stripePaymentMethod,
      'Stripe State': stripeState,
      'Stripe Address': stripeAddress,
      'Zip': zip,
    };

    // Save to Firestore (auto-generated ID)
    const paymentMethodsRef = collection(db, 'paymentMethods');
    await setDoc(doc(paymentMethodsRef), paymentMethodDoc);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving payment method:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 