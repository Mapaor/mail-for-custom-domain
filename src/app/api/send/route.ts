import { NextRequest, NextResponse } from 'next/server';
import { sendEmailViaSMTP2GO } from '@/lib/smtp2go';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: 'Supabase credentials not configured',
          has_url: !!supabaseUrl,
          has_anon_key: !!supabaseAnonKey
        },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    
    // Get authenticated user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication error', details: authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User authenticated:', user.id, user.email);

    // Get user's profile to determine sender email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile query error:', {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        user_id: user.id
      });
      return NextResponse.json(
        { 
          error: 'Failed to load user profile',
          details: profileError.message,
          code: profileError.code,
          user_id: user.id
        },
        { status: 500 }
      );
    }

    if (!profile) {
      console.error('Profile not found for user:', user.id);
      return NextResponse.json(
        { 
          error: 'User profile not found',
          details: 'No profile exists for this user in the database',
          user_id: user.id
        },
        { status: 404 }
      );
    }

    console.log('Profile found:', profile.email);

    const body = await request.json();
    const { to, subject, body: emailBody, html_body } = body;

    // Validate required fields - need either body or html_body
    if (!to || !subject || (!emailBody && !html_body)) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, and (body or html_body)' },
        { status: 400 }
      );
    }

    // Parse 'to' field to support multiple recipients (comma or semicolon separated)
    let recipients: string | string[] = to;
    if (typeof to === 'string') {
      // Split by comma or semicolon and trim whitespace
      const parsedRecipients = to
        .split(/[,;]/)
        .map(email => email.trim())
        .filter(email => email.length > 0);
      
      // Validate all email addresses
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = parsedRecipients.filter(email => !emailRegex.test(email));
      
      if (invalidEmails.length > 0) {
        return NextResponse.json(
          { error: 'Invalid email address(es)', details: invalidEmails.join(', ') },
          { status: 400 }
        );
      }
      
      recipients = parsedRecipients.length > 1 ? parsedRecipients : parsedRecipients[0];
    }

    // Send email via SMTP2GO using user's email as sender
    const emailPayload: {
      to: string | string[];
      subject: string;
      body?: string;
      html_body?: string;
      from: string;
    } = {
      to: recipients,
      subject,
      from: profile.email,
    };

    // Include either body or html_body based on what was provided
    if (html_body) {
      emailPayload.html_body = html_body;
    } else if (emailBody) {
      emailPayload.body = emailBody;
    }

    const smtp2goResponse = await sendEmailViaSMTP2GO(emailPayload);

    // Store the sent email in Supabase
    const { data, error } = await supabase
      .from('emails')
      .insert({
        user_id: user.id,
        from_email: profile.email,
        to_email: Array.isArray(recipients) ? recipients.join(', ') : recipients,
        subject: subject,
        body: emailBody || html_body || '', // Store whichever was provided
        html_body: html_body || (emailBody ? emailBody.replace(/\n/g, '<br>') : ''),
        sent_at: new Date().toISOString(),
        type: 'outgoing',
        is_read: true, // Sent emails are considered "read"
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      // Email was sent but not stored - log this
      return NextResponse.json(
        { 
          success: true, 
          warning: 'Email sent but not stored in database',
          smtp2go_response: smtp2goResponse 
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        email_id: data.id,
        smtp2go_response: smtp2goResponse 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Send email error:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: (error as Error).message },
      { status: 500 }
    );
  }
}
