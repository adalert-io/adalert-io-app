import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseFnPath } from '@/lib/utils';

export async function POST(request: NextRequest) {
  console.log('=== Cronitor Webhook Received ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Headers:', Object.fromEntries(request.headers.entries()));

  try {
    const webhookData = await request.json();
    console.log('Webhook payload:', JSON.stringify(webhookData, null, 2));

    if (!webhookData.id || !webhookData.type) {
      console.error(
        'Invalid webhook payload - missing id or type:',
        webhookData,
      );
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 },
      );
    }

    // Forward the webhook data to your Firebase function
    const firebaseFunctionPath = getFirebaseFnPath('handle-cronitor-alert-fb');
    console.log('firebaseFunctionPath: ', firebaseFunctionPath);

    const response = await fetch(firebaseFunctionPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firebase function error:', errorText);
      return NextResponse.json(
        { error: 'Failed to process webhook' },
        { status: 500 },
      );
    }

    const result = await response.json();
    // console.log("Firebase function result:", result);

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error: any) {
    console.error('=== Webhook Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
