import { NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toEmail, toName, tags, templateId } = body;

    // Validate required fields
    if (!toEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get environment variables
    const fromEmail = process.env.SENDGRID_VERIFIED_SENDER;
    const fromName = process.env.SENDGRID_FROM_NAME;

    // Validate environment variables
    if (!fromEmail || !templateId) {
      console.error("Missing required environment variables:", {
        fromEmail: !!fromEmail,
        templateId: !!templateId,
      });
      return NextResponse.json(
        { error: "Email configuration error" },
        { status: 500 },
      );
    }

    // Set SendGrid API key
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

    // Prepare the email data following SendGrid template format
    const email = {
      to: toEmail,
      from: fromEmail,
      templateId: templateId,
      dynamic_template_data: tags,
      trackingSettings: {
        clickTracking: {
          enable: false,
          enableText: false,
        },
      },
    };

    // Send email via SendGrid
    const response = await sgMail.send(email);

    return NextResponse.json({
      success: true,
      statusCode: response[0].statusCode,
    });
  } catch (error: any) {
    console.error("Error sending email:", error);

    // Handle SendGrid specific errors
    if (error.response) {
      const { message, code, response } = error;
      console.error("SendGrid API error:", { message, code, response });
      return NextResponse.json(
        { error: "Failed to send email", details: message },
        { status: response.statusCode || 500 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
