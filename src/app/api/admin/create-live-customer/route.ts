import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import admin from 'firebase-admin';

// Initialize Stripe with live mode key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

// Get or initialize Firebase Admin
function getAdminApp(): admin.app.App | null {
  try {
    if (admin.apps.length) {
      return admin.apps[0]!;
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      console.error('Missing Firebase Admin credentials');
      return null;
    }

    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  } catch (e) {
    console.error('Firebase Admin initialization error:', e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, dryRun = true, createSubscription = false } = body;

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'Either userId or email is required' },
        { status: 400 },
      );
    }

    const app = getAdminApp();
    if (!app) {
      return NextResponse.json(
        { error: 'Firebase Admin not configured' },
        { status: 500 },
      );
    }

    const db = admin.firestore(app);

    // Step 1: Find the user in Firestore
    let userDoc: admin.firestore.DocumentSnapshot;
    let userDocId: string;
    
    if (userId) {
      userDoc = await db.collection('users').doc(userId).get();
      userDocId = userId;
    } else {
      const usersQuery = await db.collection('users')
        .where('Email', '==', email)
        .limit(1)
        .get();
      
      if (usersQuery.empty) {
        const usersQuery2 = await db.collection('users')
          .where('email', '==', email)
          .limit(1)
          .get();
        
        if (usersQuery2.empty) {
          return NextResponse.json(
            { error: 'User not found in Firestore' },
            { status: 404 },
          );
        }
        userDoc = usersQuery2.docs[0];
        userDocId = usersQuery2.docs[0].id;
      } else {
        userDoc = usersQuery.docs[0];
        userDocId = usersQuery.docs[0].id;
      }
    }

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User document not found' },
        { status: 404 },
      );
    }

    const userData = userDoc.data();
    const userEmail = userData?.email || userData?.Email;
    const userName = userData?.Name || userData?.name || userEmail?.split('@')[0];
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found in document' },
        { status: 400 },
      );
    }

    // Step 2: Check if live customer already exists
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return NextResponse.json({
        error: 'Live mode customer already exists',
        customerId: existingCustomers.data[0].id,
        message: 'Use the migration endpoint instead',
      });
    }

    // Step 3: Get test mode subscription details (if any)
    const userRef = db.collection('users').doc(userDocId);
    const subscriptionsQuery = await db.collection('subscriptions')
      .where('User', '==', userRef)
      .limit(1)
      .get();

    let oldSubscriptionData: any = null;
    let oldCustomerId: string | null = null;
    let oldSubscriptionId: string | null = null;

    if (!subscriptionsQuery.empty) {
      oldSubscriptionData = subscriptionsQuery.docs[0].data();
      oldCustomerId = oldSubscriptionData?.['Stripe Customer Id'];
      oldSubscriptionId = oldSubscriptionData?.['Stripe Subscription Id'];
    }

    // Step 4: Prepare customer data
    const customerData: Stripe.CustomerCreateParams = {
      email: userEmail,
      name: userName,
      metadata: {
        firebase_user_id: userDocId,
        migrated_from_test: oldCustomerId || 'none',
        created_via: 'admin_live_customer_creation',
      },
    };

    if (dryRun) {
      const message = `[DRY RUN] Would create live mode Stripe customer:\n` +
        `- Email: ${userEmail}\n` +
        `- Name: ${userName}\n` +
        `- Firebase User ID: ${userDocId}\n` +
        `- Old Test Customer ID: ${oldCustomerId || 'none'}\n` +
        `- Old Test Subscription ID: ${oldSubscriptionId || 'none'}\n` +
        `\nSet dryRun=false to create customer.\n` +
        `\nNOTE: This creates a customer WITHOUT a payment method.\n` +
        `The user will need to add a payment method through the UI.`;
      
      return NextResponse.json({
        success: true,
        dryRun: true,
        message,
        customerData,
      });
    }

    // Step 5: Create the live mode customer
    console.log(`Creating live mode customer for ${userEmail}...`);
    const liveCustomer = await stripe.customers.create(customerData);
    console.log(`Created customer: ${liveCustomer.id}`);

    // Step 6: Update Firestore
    const batch = db.batch();

    if (!subscriptionsQuery.empty) {
      // Update existing subscription document
      const subscriptionDocId = subscriptionsQuery.docs[0].id;
      batch.update(db.collection('subscriptions').doc(subscriptionDocId), {
        'Stripe Customer Id': liveCustomer.id,
        'Stripe Subscription Id': admin.firestore.FieldValue.delete(), // Remove test subscription ID
        'Status': 'inactive', // No active subscription yet
        'Migration Date': admin.firestore.FieldValue.serverTimestamp(),
        'Old Customer Id': oldCustomerId,
        'Old Subscription Id': oldSubscriptionId,
        'Needs Payment Method': true,
      });
    } else {
      // Create new subscription document
      batch.set(db.collection('subscriptions').doc(), {
        'User': userRef,
        'Stripe Customer Id': liveCustomer.id,
        'Status': 'inactive',
        'Migration Date': admin.firestore.FieldValue.serverTimestamp(),
        'Needs Payment Method': true,
      });
    }

    // Update payment methods collection if exists
    const paymentMethodsQuery = await db.collection('paymentMethods')
      .where('User', '==', userRef)
      .limit(1)
      .get();

    if (!paymentMethodsQuery.empty) {
      const pmDoc = paymentMethodsQuery.docs[0];
      batch.update(db.collection('paymentMethods').doc(pmDoc.id), {
        'Stripe Customer Id': liveCustomer.id,
        'Stripe Payment Method Id': admin.firestore.FieldValue.delete(), // User needs to add new PM
        'Migration Date': admin.firestore.FieldValue.serverTimestamp(),
        'Needs Payment Method': true,
      });
    }

    // Update stripeCompanies if exists
    const stripeCompaniesQuery = await db.collection('stripeCompanies')
      .where('User', '==', userRef)
      .limit(1)
      .get();

    if (!stripeCompaniesQuery.empty) {
      const scDoc = stripeCompaniesQuery.docs[0];
      batch.update(db.collection('stripeCompanies').doc(scDoc.id), {
        'Stripe Customer Id': liveCustomer.id,
        'Migration Date': admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    console.log('Database updated successfully');

    const message = `✅ Successfully created live mode Stripe customer!\n\n` +
      `Customer Details:\n` +
      `- Customer ID: ${liveCustomer.id}\n` +
      `- Email: ${userEmail}\n` +
      `- Name: ${userName}\n\n` +
      `Database Updated:\n` +
      `- User ID: ${userDocId}\n` +
      `- Old Customer ID: ${oldCustomerId || 'none'}\n` +
      `- New Customer ID: ${liveCustomer.id}\n\n` +
      `⚠️ IMPORTANT: The user needs to:\n` +
      `1. Add a payment method through your UI\n` +
      `2. Subscribe to a plan\n` +
      `This endpoint only creates the customer shell.`;

    return NextResponse.json({
      success: true,
      customerId: liveCustomer.id,
      customer: liveCustomer,
      userId: userDocId,
      email: userEmail,
      message,
      oldCustomerId,
      oldSubscriptionId,
    });

  } catch (error: any) {
    console.error('Error creating live Stripe customer:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: error.toString(),
      },
      { status: 500 },
    );
  }
}

// GET endpoint to check if user needs live customer creation
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');

    if (!email && !userId) {
      return NextResponse.json(
        { error: 'Either email or userId parameter is required' },
        { status: 400 },
      );
    }

    const app = getAdminApp();
    if (!app) {
      return NextResponse.json(
        { error: 'Firebase Admin not configured' },
        { status: 500 },
      );
    }

    const db = admin.firestore(app);

    // Find user
    let userDocId: string;
    let userData: any;

    if (userId) {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      userDocId = userId;
      userData = userDoc.data();
    } else {
      const usersQuery = await db.collection('users')
        .where('Email', '==', email)
        .limit(1)
        .get();

      if (usersQuery.empty) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      userDocId = usersQuery.docs[0].id;
      userData = usersQuery.docs[0].data();
    }

    const userRef = db.collection('users').doc(userDocId);
    const userEmail = userData?.Email || userData?.email;

    // Get subscription data
    const subsQuery = await db.collection('subscriptions')
      .where('User', '==', userRef)
      .limit(1)
      .get();

    let subscriptionData = null;
    if (!subsQuery.empty) {
      subscriptionData = subsQuery.docs[0].data();
    }

    // Check if IDs are test mode
    const customerId = subscriptionData?.['Stripe Customer Id'];
    const isTestMode = customerId?.startsWith('cus_T');

    // Check Stripe for live customer
    let hasLiveCustomer = false;
    let liveCustomerId = null;

    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        hasLiveCustomer = true;
        liveCustomerId = customers.data[0].id;
      }
    }

    return NextResponse.json({
      userId: userDocId,
      email: userEmail,
      hasTestCustomer: isTestMode,
      testCustomerId: isTestMode ? customerId : null,
      hasLiveCustomer,
      liveCustomerId,
      needsLiveCustomerCreation: !hasLiveCustomer && isTestMode,
      canProceed: !hasLiveCustomer,
    });

  } catch (error: any) {
    console.error('Error checking customer status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

