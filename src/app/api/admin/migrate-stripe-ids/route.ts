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

interface MigrationResult {
  success: boolean;
  userId: string;
  email: string;
  message: string;
  oldCustomerId?: string;
  newCustomerId?: string;
  oldSubscriptionId?: string;
  newSubscriptionId?: string;
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, dryRun = true } = body;

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
    const result: MigrationResult = {
      success: false,
      userId: userId || '',
      email: email || '',
      message: '',
    };

    // Step 1: Find the user in Firestore
    let userDoc: admin.firestore.DocumentSnapshot;
    let userDocId: string;
    
    if (userId) {
      userDoc = await db.collection('users').doc(userId).get();
      userDocId = userId;
    } else {
      // Find by email
      const usersQuery = await db.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (usersQuery.empty) {
        const usersQuery2 = await db.collection('users')
          .where('Email', '==', email)
          .limit(1)
          .get();
        
        if (usersQuery2.empty) {
          return NextResponse.json(
            { error: 'User not found in Firestore', result },
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
        { error: 'User document not found', result },
        { status: 404 },
      );
    }

    const userData = userDoc.data();
    const userEmail = userData?.email || userData?.Email;
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found in document', result },
        { status: 400 },
      );
    }

    result.userId = userDocId;
    result.email = userEmail;

    // Step 2: Find subscription document with test mode IDs
    const userRef = db.collection('users').doc(userDocId);
    const subscriptionsQuery = await db.collection('subscriptions')
      .where('User', '==', userRef)
      .limit(1)
      .get();

    let subscriptionDoc: admin.firestore.DocumentSnapshot | null = null;
    let subscriptionDocId: string | null = null;
    let oldCustomerId: string | null = null;
    let oldSubscriptionId: string | null = null;

    if (!subscriptionsQuery.empty) {
      subscriptionDoc = subscriptionsQuery.docs[0];
      subscriptionDocId = subscriptionsQuery.docs[0].id;
      const subscriptionData = subscriptionDoc.data();
      oldCustomerId = subscriptionData?.['Stripe Customer Id'];
      oldSubscriptionId = subscriptionData?.['Stripe Subscription Id'];
      
      if (oldCustomerId) {
        result.oldCustomerId = oldCustomerId;
      }
      if (oldSubscriptionId) {
        result.oldSubscriptionId = oldSubscriptionId;
      }
    }

    // Step 3: Search for live mode customer in Stripe by email
    console.log(`Searching for live mode customer with email: ${userEmail}`);
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (customers.data.length === 0) {
      result.message = `No live mode Stripe customer found for email: ${userEmail}. You may need to create one first.`;
      return NextResponse.json({ result, warning: result.message });
    }

    const liveCustomer = customers.data[0];
    result.newCustomerId = liveCustomer.id;

    console.log(`Found live mode customer: ${liveCustomer.id}`);

    // Step 4: Find active subscription for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: liveCustomer.id,
      status: 'active',
      limit: 1,
    });

    let liveSubscriptionId: string | null = null;
    if (subscriptions.data.length > 0) {
      liveSubscriptionId = subscriptions.data[0].id;
      result.newSubscriptionId = liveSubscriptionId;
      console.log(`Found active subscription: ${liveSubscriptionId}`);
    } else {
      console.log('No active subscription found for this customer');
    }

    // Step 5: Update Firestore (if not dry run)
    if (dryRun) {
      result.message = `[DRY RUN] Would update:\n` +
        `- User: ${userDocId} (${userEmail})\n` +
        `- Old Customer ID: ${oldCustomerId || 'none'}\n` +
        `- New Customer ID: ${liveCustomer.id}\n` +
        `- Old Subscription ID: ${oldSubscriptionId || 'none'}\n` +
        `- New Subscription ID: ${liveSubscriptionId || 'none'}\n` +
        `Set dryRun=false to apply changes.`;
      result.success = true;
      return NextResponse.json({ result });
    }

    // Actually update the database
    const batch = db.batch();

    if (subscriptionDoc && subscriptionDocId) {
      // Update existing subscription document
      const updateData: any = {
        'Stripe Customer Id': liveCustomer.id,
        'Migration Date': admin.firestore.FieldValue.serverTimestamp(),
      };
      
      // Only add fields if they have values (Firestore doesn't accept undefined)
      if (liveSubscriptionId) {
        updateData['Stripe Subscription Id'] = liveSubscriptionId;
      }
      if (oldCustomerId) {
        updateData['Old Customer Id'] = oldCustomerId;
      }
      if (oldSubscriptionId) {
        updateData['Old Subscription Id'] = oldSubscriptionId;
      }
      
      batch.update(db.collection('subscriptions').doc(subscriptionDocId), updateData);
    } else if (liveSubscriptionId) {
      // Create new subscription document
      batch.set(db.collection('subscriptions').doc(), {
        'User': userRef,
        'Stripe Customer Id': liveCustomer.id,
        'Stripe Subscription Id': liveSubscriptionId,
        'Migration Date': admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Check and update payment methods
    const paymentMethodsQuery = await db.collection('paymentMethods')
      .where('User', '==', userRef)
      .limit(1)
      .get();

    if (!paymentMethodsQuery.empty) {
      const pmDoc = paymentMethodsQuery.docs[0];
      const pmData = pmDoc.data();
      const oldPmCustomerId = pmData?.['Stripe Customer Id'];

      if (oldPmCustomerId && oldPmCustomerId.startsWith('cus_T')) {
        // Get live mode payment method
        const paymentMethods = await stripe.paymentMethods.list({
          customer: liveCustomer.id,
          limit: 1,
        });

        if (paymentMethods.data.length > 0) {
          const livePm = paymentMethods.data[0];
          const pmUpdateData: any = {
            'Stripe Customer Id': liveCustomer.id,
            'Stripe Payment Method Id': livePm.id,
            'Migration Date': admin.firestore.FieldValue.serverTimestamp(),
          };
          
          // Only add last4 if it exists (Firestore doesn't accept undefined)
          if (livePm.card?.last4) {
            pmUpdateData['Stripe Last 4 Digits'] = livePm.card.last4;
          }
          
          batch.update(db.collection('paymentMethods').doc(pmDoc.id), pmUpdateData);
        }
      }
    }

    // Check and update stripeCompanies
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

    result.success = true;
    result.message = `✅ Successfully migrated user ${userEmail} to live mode Stripe IDs:\n` +
      `- Customer: ${oldCustomerId || 'none'} → ${liveCustomer.id}\n` +
      `- Subscription: ${oldSubscriptionId || 'none'} → ${liveSubscriptionId || 'none'}`;

    return NextResponse.json({ result });

  } catch (error: any) {
    console.error('Error migrating Stripe IDs:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: error.toString(),
      },
      { status: 500 },
    );
  }
}

// GET endpoint to check migration status
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
    const subscriptionId = subscriptionData?.['Stripe Subscription Id'];
    const isTestMode = customerId?.startsWith('cus_T') || subscriptionId?.startsWith('sub_');

    // Search Stripe for live customer
    const userEmail = userData?.Email || userData?.email;
    let liveCustomer = null;
    let liveSubscription = null;

    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        liveCustomer = customers.data[0];
        
        const subs = await stripe.subscriptions.list({
          customer: liveCustomer.id,
          limit: 1,
        });
        if (subs.data.length > 0) {
          liveSubscription = subs.data[0];
        }
      }
    }

    return NextResponse.json({
      userId: userDocId,
      email: userEmail,
      currentDatabase: {
        customerId,
        subscriptionId,
        isTestMode,
        migrationDate: subscriptionData?.['Migration Date'] || null,
      },
      liveStripe: {
        customerId: liveCustomer?.id || null,
        subscriptionId: liveSubscription?.id || null,
        subscriptionStatus: liveSubscription?.status || null,
      },
      needsMigration: isTestMode && liveCustomer !== null,
    });

  } catch (error: any) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

