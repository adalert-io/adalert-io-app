import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { COLLECTIONS, SUBSCRIPTION_STATUS } from '@/lib/constants';
import sgMail from '@sendgrid/mail';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

// Helper function to find and update subscription in Firebase
async function findAndUpdateSubscription(
  stripeSubscriptionId: string,
  updates: Record<string, any>,
): Promise<void> {
  try {
    const subscriptionsRef = collection(db, COLLECTIONS.SUBSCRIPTIONS);
    const q = query(
      subscriptionsRef,
      where('Stripe Subscription Id', '==', stripeSubscriptionId),
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const subscriptionDoc = querySnapshot.docs[0];

      await updateDoc(
        doc(db, COLLECTIONS.SUBSCRIPTIONS, subscriptionDoc.id),
        updates,
      );
      console.log(`Updated subscription ${subscriptionDoc.id} with:`, updates);
    } else {
      console.warn(
        `No subscription found with Stripe Subscription Id: ${stripeSubscriptionId}`,
      );
    }
  } catch (error) {
    console.error('Error updating subscription status in Firebase:', error);
    throw error;
  }
}

// Helper function to get invoice data for a subscription
async function getInvoiceForSubscription(
  subscriptionId: string,
): Promise<Stripe.Invoice | null> {
  try {
    // Get the latest invoice for this subscription
    const invoices = await stripe.invoices.list({
      subscription: subscriptionId,
      limit: 1,
      // status: 'open', // Get the most recent open invoice
    });

    if (invoices.data.length === 0) {
      console.log(`No open invoice found for subscription ${subscriptionId}`);
      return null;
    }

    const invoice = invoices.data[0];
    console.log(
      `Found invoice ${invoice.id} for subscription ${subscriptionId}`,
    );

    // Try to get the invoice with PDF URL
    if (invoice.id) {
      try {
        const invoiceWithPdf = await stripe.invoices.retrieve(invoice.id, {
          expand: ['invoice_pdf'],
        });
        console.log(`Invoice PDF URL: ${(invoiceWithPdf as any).invoice_pdf}`);
        return invoiceWithPdf;
      } catch (pdfError) {
        console.warn('Could not retrieve invoice PDF:', pdfError);
        return invoice; // Return invoice without PDF if PDF retrieval fails
      }
    }
    return invoice;
  } catch (error) {
    console.error('Error fetching invoice for subscription:', error);
    return null;
  }
}

// Helper function to send SendGrid email for payment failures
async function sendPaymentFailureEmail(
  stripeSubscriptionId: string,
  invoice: Stripe.Invoice,
): Promise<void> {
  try {
    // Find the subscription document
    const subscriptionsRef = collection(db, COLLECTIONS.SUBSCRIPTIONS);
    const q = query(
      subscriptionsRef,
      where('Stripe Subscription Id', '==', stripeSubscriptionId),
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn(
        `No subscription found with Stripe Subscription Id: ${stripeSubscriptionId}`,
      );
      return;
    }

    const subscriptionDoc = querySnapshot.docs[0];
    const subscriptionData = subscriptionDoc.data();
    const userRef = subscriptionData['User'];

    if (!userRef) {
      console.warn('No User reference found in subscription document');
      return;
    }

    // Get the user document
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      console.warn('User document not found');
      return;
    }

    const userData = userDoc.data() as Record<string, any>;
    const userEmail = userData['Email'] || userData['email'];
    const userName = userData['Name'];

    if (!userEmail) {
      console.warn('No email found in user document');
      return;
    }

    // Set SendGrid API key
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

    // Prepare email data
    const email = {
      to: userEmail,
      from: process.env.SENDGRID_VERIFIED_SENDER!,
      templateId:
        process.env.NEXT_PUBLIC_SENDGRID_TEMPLATE_ID_STRIPE_PAYMENT_FAILED!,
      dynamic_template_data: {
        UserName: userName,
        WebsiteHomeUrl: process.env.NEXT_PUBLIC_APP_URL,
        InvoicePdfUrl: (invoice as any).invoice_pdf || null,
      },
    };

    // Send email via SendGrid
    const response = await sgMail.send(email);
    console.log(
      `Payment failure email sent successfully to ${userEmail}. Status: ${response[0].statusCode}`,
    );
  } catch (error) {
    console.error('Error sending payment failure email:', error);
    // Don't throw error to avoid breaking the webhook processing
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe signature' },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 },
    );
  }

  try {
    // console.log('event: ', event);
    switch (event.type) {
      case 'invoice.payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.status === 'past_due') {
          await handlePastDueSubscription(subscription);
        } else if (subscription.status === 'active') {
          await handleSubscriptionRecovered(subscription);
        }
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}

async function handlePaymentFailure(invoice: Stripe.Invoice) {
  console.log('handlePaymentFailure: ', invoice);
  const customerId = invoice.customer as string;
  const subscriptionId = (invoice as any).subscription as string;

  if (!subscriptionId) return;

  // Get failure details
  const failureReason =
    (invoice as any).last_payment_error?.message || 'Payment failed';
  const attemptCount = invoice.attempt_count || 1;

  console.log(
    `Payment failed for subscription ${subscriptionId}: ${failureReason}`,
  );

  // Update subscription status in Firebase
  await findAndUpdateSubscription(subscriptionId, {
    'User Status': SUBSCRIPTION_STATUS.PAYMENT_FAILED,
    'Stripe Invoice Failed Start Date': new Date(),
    'Stripe Invoice Failed Subscription Id': subscriptionId,
    'Stripe Invoice Failed Subscription Item Id':
      (invoice as any).subscription_item || null,
  });

  // Send payment failure email via SendGrid
  // Note: invoice.payment_failed events already contain invoice data
  await sendPaymentFailureEmail(subscriptionId, invoice);

  // Schedule retry if within limits
  //   if (attemptCount < 3 && invoice.id) {
  //     await scheduleRetryPayment(invoice.id, attemptCount);
  //   }
}

async function handlePastDueSubscription(subscription: Stripe.Subscription) {
  console.log('Past due subscription: ', subscription);
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;

  console.log(`Subscription ${subscriptionId} is past due`);

  // Update subscription status in Firebase
  await findAndUpdateSubscription(subscriptionId, {
    'User Status': SUBSCRIPTION_STATUS.PAYMENT_FAILED,
    'Stripe Invoice Failed Start Date': new Date(),
    'Stripe Invoice Failed Subscription Id': subscriptionId,
    'Stripe Invoice Failed Subscription Item Id':
      subscription.items?.data[0]?.id || null,
  });

  // Get invoice data for this subscription
  const invoice = await getInvoiceForSubscription(subscriptionId);

  // Send past due notification email via SendGrid with invoice data
  await sendPaymentFailureEmail(
    subscriptionId,
    invoice || ({} as Stripe.Invoice),
  );
}

async function handleSubscriptionRecovered(subscription: Stripe.Subscription) {
  console.log('Subscription recovered: ', subscription);
  const subscriptionId = subscription.id;

  console.log(`Subscription ${subscriptionId} recovered from payment failure`);

  // Update subscription status in Firebase
  await findAndUpdateSubscription(subscriptionId, {
    'User Status': SUBSCRIPTION_STATUS.PAYING,
    'Stripe Invoice Failed Start Date': null,
    'Stripe Invoice Failed Subscription Id': null,
    'Stripe Invoice Failed Subscription Item Id': null,
  });

  console.log('Subscription recovered - recovery email not yet implemented');
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted: ', subscription);
  const subscriptionId = subscription.id;

  console.log(`Subscription ${subscriptionId} was deleted`);

  // Update subscription status in Firebase
  await findAndUpdateSubscription(subscriptionId, {
    'User Status': SUBSCRIPTION_STATUS.CANCELED,
  });

  // Handle cleanup logic
  // await cleanupSubscriptionData(subscriptionId);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Payment succeeded: ', invoice);
  // Fix: Access subscription from the expanded invoice
  const subscriptionId = (invoice as any).subscription as string;

  if (subscriptionId) {
    console.log(`Payment succeeded for subscription ${subscriptionId}`);

    // Update subscription status in Firebase
    await findAndUpdateSubscription(subscriptionId, {
      'User Status': SUBSCRIPTION_STATUS.PAYING,
      'Stripe Invoice Failed Start Date': null,
      'Stripe Invoice Failed Subscription Id': null,
      'Stripe Invoice Failed Subscription Item Id': null,
    });
  }
}

// Email notifications are now handled directly via SendGrid

// async function scheduleRetryPayment(invoiceId: string, attemptCount: number) {
//   // Calculate retry delay with exponential backoff
//   const retryDelays = [1, 3, 7]; // days
//   const delayDays = retryDelays[attemptCount - 1] || 7;
//   const retryDate = new Date();
//   retryDate.setDate(retryDate.getDate() + delayDays);

//   console.log(
//     `Scheduling retry payment for invoice ${invoiceId} on ${retryDate}`,
//   );

//   // Schedule the retry in your database
//   // You'll need to implement a cron job or task queue to process these
//   // For now, we'll just log it
//   // await scheduleTask('retry-payment', { invoiceId, attemptCount }, retryDate);
// }

// Only allow POST
export const GET = undefined;
export const PUT = undefined;
export const DELETE = undefined;
