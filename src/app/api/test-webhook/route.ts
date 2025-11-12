import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const APEX_DOMAIN = process.env.APEX_DOMAIN || 'example.com';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to get their email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { to } = body;

    // Send a test email to the webhook endpoint
    const webhookUrl = `${request.nextUrl.origin}/api/webhooks/incomingMail`;
    
    const testEmail = {
      from: 'test@example.com',
      to: to || profile.email, // Use authenticated user's email
      subject: 'Test Email from Webhook Tester',
      text: `This is a test email sent at ${new Date().toISOString()}\n\nIf you see this in your inbox, your webhook is working correctly!`,
      html: `<p>This is a test email sent at ${new Date().toISOString()}</p><p>If you see this in your inbox, your webhook is working correctly!</p>`,
      messageId: `test-${Date.now()}@test.mail.${APEX_DOMAIN}`,
    };

    console.log('🧪 Sending test email to webhook:', testEmail);

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEmail),
    });

    const webhookData = await webhookResponse.json();

    if (webhookResponse.ok) {
      return NextResponse.json(
        {
          success: true,
          message: 'Test email sent to webhook successfully!',
          email_id: webhookData.email_id,
          note: 'Check your inbox at /dashboard/inbox',
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Webhook returned an error',
          details: webhookData,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Test webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to send test email', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Webhook Test Endpoint',
      usage: 'Send a POST request to this endpoint to simulate an incoming email',
      example: {
        method: 'POST',
        body: {
          to: `alias@${APEX_DOMAIN} (optional)`,
        },
      },
      quick_test: 'Or just POST with an empty body {}',
    },
    { status: 200 }
  );
}
