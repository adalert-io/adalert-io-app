import { NextRequest, NextResponse } from "next/server";
import { getFirebaseFnPath } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    // Get the webhook payload from Cronitor
    const webhookData = await request.json();

    console.log("Received Cronitor webhook:", webhookData);

    // Validate the webhook data
    if (!webhookData.id || !webhookData.type) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    // Forward the webhook data to your Firebase function
    const firebaseFunctionPath = getFirebaseFnPath("handle-cronitor-alert-fb");

    const response = await fetch(firebaseFunctionPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Firebase function error:", errorText);
      return NextResponse.json(
        { error: "Failed to process webhook" },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log("Firebase function result:", result);

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error: any) {
    console.error("Error processing Cronitor webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
