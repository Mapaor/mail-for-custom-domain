import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const APEX_DOMAIN = process.env.APEX_DOMAIN || 'example.com';

// Ensure this route can handle POST requests
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Use service role for webhooks (no user auth required)
const getSupabaseServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// GET endpoint to monitor recent webhook deliveries
export async function GET(request: NextRequest) {
  console.log('📊 GET request to webhook endpoint');
  try {
    const supabase = getSupabaseServiceClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch recent incoming emails as webhook logs
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .eq('type', 'incoming')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch webhook logs', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Recent webhook deliveries (incoming emails)',
        count: data.length,
        webhooks: data.map(email => ({
          id: email.id,
          from: email.from_email,
          to: email.to_email,
          subject: email.subject,
          received_at: email.received_at || email.created_at,
          body_preview: email.body?.substring(0, 100) + '...',
        }))
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Webhook logs error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('='.repeat(80));
  console.log(`🎯 WEBHOOK POST RECEIVED - ${timestamp}`);
  console.log(`📋 Request ID: ${requestId}`);
  console.log('='.repeat(80));
  
  try {
    // Log EVERYTHING about the request first
    const url = request.url;
    const method = request.method;
    const headers = Object.fromEntries(request.headers.entries());
    
    console.log('📍 URL:', url);
    console.log('📍 Method:', method);
    console.log('📍 Headers:', JSON.stringify(headers, null, 2));
    
    // Read the body
    const rawBody = await request.text();
    console.log('📍 Body Length:', rawBody.length);
    console.log('📍 Raw Body:', rawBody.substring(0, 1000)); // First 1000 chars
    
    // Try to parse body
    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
      console.log('✅ Body is valid JSON');
      console.log('📍 Parsed Body:', JSON.stringify(parsedBody, null, 2));
    } catch {
      console.log('⚠️  Body is not JSON');
      parsedBody = { raw: rawBody };
    }
    
    console.log('='.repeat(80));
    console.log('🔑 Environment Check:');
    console.log('- Service Role Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('- Supabase URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('='.repeat(80));
    
    const supabase = getSupabaseServiceClient();
    console.log('✅ Supabase client created');
    
    // Now process the parsed body
    const body = parsedBody;

    // Extract email fields from ForwardEmail's format
    // ForwardEmail sends: { from: { value: [{ address, name }], text }, recipients: [...], text, html, ... }
    let fromEmail = 'unknown@example.com';
    
    if (body.from?.value && Array.isArray(body.from.value) && body.from.value.length > 0) {
      fromEmail = body.from.value[0].address || fromEmail;
    } else if (body.from?.text) {
      fromEmail = body.from.text;
    } else if (typeof body.from === 'string') {
      fromEmail = body.from;
    } else if (body.session?.sender) {
      fromEmail = body.session.sender;
    }

    // Get recipient from recipients array or session
    let toEmail = `alias@${APEX_DOMAIN}`;
    if (body.recipients && Array.isArray(body.recipients) && body.recipients.length > 0) {
      toEmail = body.recipients[0];
    } else if (body.session?.recipient) {
      toEmail = body.session.recipient;
    } else if (body.to) {
      toEmail = typeof body.to === 'string' ? body.to : body.to.text || body.to.value?.[0]?.address;
    }

    const subject = body.subject || '(No Subject)';
    const text = body.text || body.textAsHtml || '';
    const html = body.html || body.textAsHtml || '';
    const attachments = body.attachments || [];

    // Log extracted fields for debugging
    console.log('📋 Extracted fields:', { fromEmail, toEmail, subject, hasText: !!text, hasHtml: !!html });

    // Validate required fields
    if (!fromEmail || !toEmail) {
      console.error('Missing required fields:', { fromEmail, toEmail });
      return NextResponse.json(
        { 
          error: 'Missing required fields: from or to',
          received: { fromEmail, toEmail, subject },
          hint: 'Check ForwardEmail webhook documentation for correct field names'
        },
        { status: 400 }
      );
    }

    // Build normalized recipients list (handle multiple formats)
    let recipients: string[] = [];
    if (body.recipients && Array.isArray(body.recipients) && body.recipients.length > 0) {
      recipients = body.recipients.slice();
    } else if (body.to?.value && Array.isArray(body.to.value)) {
      recipients = body.to.value.map((v: { address?: string }) => v.address).filter(Boolean) as string[];
    } else if (body.session?.recipient) {
      recipients = [body.session.recipient];
    } else if (typeof body.to === 'string') {
      recipients = body.to.split(',').map((s: string) => s.trim()).filter(Boolean);
    } else {
      recipients = [toEmail];
    }

    // Deduplicate and normalize
    recipients = Array.from(new Set(recipients.map((r: string) => r.toLowerCase())));

    console.log('🔍 Resolved recipients:', recipients);

    // Prepare inserts for all found users; track misses
  const inserts: Array<Record<string, unknown>> = [];
    const missed: string[] = [];

    for (const rec of recipients) {
      try {
        const alias = String(rec).split('@')[0];
        console.log('� Looking up profile for alias:', alias);

        // Use maybeSingle() to avoid PGRST116 when no rows
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, alias, email, forward_to')
          .eq('alias', alias)
          .maybeSingle();

        if (profileError) {
          console.error('❌ Supabase profiles lookup error for', alias, profileError);
          missed.push(rec);
          continue;
        }

        if (!profile) {
          console.warn('⚠️  No profile found for alias:', alias);
          missed.push(rec);
          continue;
        }

        console.log('✅ Found profile:', { id: profile.id, alias: profile.alias, email: profile.email });

        inserts.push({
          user_id: profile.id,
          from_email: fromEmail,
          to_email: rec,
          subject,
          body: text,
          html_body: html,
          received_at: new Date().toISOString(),
          type: 'incoming',
          is_read: false,
          message_id: body.messageId || body.message_id || null,
          attachments: attachments.map((att: { filename?: string; name?: string; contentType?: string; type?: string; size?: number }) => ({
            filename: att.filename || att.name || 'unknown',
            content_type: att.contentType || att.type || 'application/octet-stream',
            size: att.size || 0,
          })),
          metadata: {
            raw_webhook: body,
            received_timestamp: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.error('💥 Unexpected error processing recipient', rec, err);
        missed.push(rec);
        continue;
      }
    }

    if (inserts.length === 0) {
      console.error('❌ No recipients matched any user. Missed:', missed);
      return NextResponse.json(
        {
          error: 'No recipient matched',
          missed,
        },
        { status: 404 }
      );
    }

    // Insert one or many email rows in a single call
    const { data, error } = await supabase
      .from('emails')
      .insert(inserts)
      .select();

    if (error) {
      console.error('❌ Supabase error inserting emails:', error);
      return NextResponse.json(
        { error: 'Failed to store email(s)', details: error.message },
        { status: 500 }
      );
    }

    // data is an array of inserted rows
    console.log('✅ Emails stored successfully. Count:', Array.isArray(data) ? data.length : 1);

    type InsertedRow = { id: string | number; user_id: string | number; to_email: string };
    const created: InsertedRow[] = Array.isArray(data)
      ? (data as unknown[]).map(d => {
          const row = d as Record<string, unknown>;
          return {
            id: row.id as string | number,
            user_id: row.user_id as string | number,
            to_email: String(row.to_email || ''),
          };
        })
      : [{ id: (data as unknown as Record<string, unknown>).id as string | number, user_id: (data as unknown as Record<string, unknown>).user_id as string | number, to_email: String((data as unknown as Record<string, unknown>).to_email || '') }];

    return NextResponse.json(
      {
        success: true,
        created_count: created.length,
        created,
        missed,
        message: 'Email(s) received and stored successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('='.repeat(80));
    console.error('💥 WEBHOOK ERROR');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error details:', JSON.stringify(error, null, 2));
    console.error('='.repeat(80));
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error),
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    );
  }
}
