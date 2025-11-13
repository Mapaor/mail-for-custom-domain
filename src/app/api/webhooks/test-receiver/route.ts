import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple webhook receiver for testing with webhook.cool or similar services
 * This endpoint accepts ANY payload and logs it completely
 */
export async function POST(request: NextRequest) {
  try {
    // console.log('TEST WEBHOOK RECEIVER - Request received');
    // console.log('Timestamp:', new Date().toISOString());
    // console.log('URL:', request.url);
    // console.log('Method:', request.method);
    
    // Log all headers
    const headers = Object.fromEntries(request.headers.entries());
    // console.log('Headers:', JSON.stringify(headers, null, 2));
    
    // Get raw body
    const rawBody = await request.text();
    // console.log('Raw Body Length:', rawBody.length);
    // console.log('Raw Body:', rawBody);
    
    // Try to parse as JSON
    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
      // console.log('Body parsed as JSON:', JSON.stringify(parsedBody, null, 2));
    } catch {
      // console.log('Body is not JSON, treating as plain text');
      parsedBody = { raw: rawBody };
    }
    
    // Try to parse as form data
    if (headers['content-type']?.includes('application/x-www-form-urlencoded')) {
      const formData = new URLSearchParams(rawBody);
      const formObject = Object.fromEntries(formData.entries());
      console.log('Form Data:', JSON.stringify(formObject, null, 2));
    }
    
    // console.log('TEST WEBHOOK RECEIVER - Processing complete');
    
    return NextResponse.json(
      { 
        success: true,
        message: 'Webhook received and logged',
        timestamp: new Date().toISOString(),
        receivedHeaders: headers,
        receivedBody: parsedBody,
        bodyLength: rawBody.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('TEST WEBHOOK RECEIVER - Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process webhook',
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Test webhook receiver is active',
      instructions: 'Send a POST request to this endpoint to test webhook delivery',
      url: '/api/webhooks/test-receiver',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
