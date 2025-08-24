import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

// POST /api/stripe-subscriptions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, priceId, quantity, paymentMethodId } = body;
    if (!customerId || !priceId || !quantity || !paymentMethodId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId, quantity }],
      default_payment_method: paymentMethodId,
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
      collection_method: "charge_automatically",
      automatic_tax: { enabled: false },
    });

    // Extract subscription item IDs from the subscription
    const subscriptionItemIds = subscription.items.data.map((item) => item.id);

    return NextResponse.json({
      subscriptionId: subscription.id,
      subscriptionItemIds: subscriptionItemIds,
      subscription,
      error: null,
    });
  } catch (error: any) {
    console.error("Error creating Stripe subscription:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/stripe-subscriptions - Update subscription item quantity
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId, subscriptionItemId, quantity } = body;

    if (!subscriptionId || !subscriptionItemId || quantity === undefined) {
      return NextResponse.json(
        {
          error:
            "Subscription ID, Subscription Item ID, and quantity are required",
        },
        { status: 400 }
      );
    }

    // Update the subscription item quantity
    const updatedSubscriptionItem = await stripe.subscriptionItems.update(
      subscriptionItemId,
      {
        quantity: quantity,
        proration_behavior: "create_prorations", // or 'none', 'always_invoice'
      }
    );

    return NextResponse.json({
      success: true,
      subscriptionItem: updatedSubscriptionItem,
      message: "Subscription item updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating Stripe subscription item:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        success: false,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/stripe-subscriptions
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId, customerId } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    // Cancel the subscription
    const canceledSubscription = await stripe.subscriptions.cancel(
      subscriptionId,
      {
        prorate: true, // Prorate any remaining time
      }
    );

    return NextResponse.json({
      success: true,
      subscription: canceledSubscription,
      message: "Subscription canceled successfully",
    });
  } catch (error: any) {
    console.error("Error cancelling Stripe subscription:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        success: false,
      },
      { status: 500 }
    );
  }
}

// Only allow POST, PUT and DELETE
export const GET = undefined;
