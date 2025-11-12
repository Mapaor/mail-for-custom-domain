import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildForwardEmailDNS } from '@/lib/cloudflare';

const APEX_DOMAIN = process.env.APEX_DOMAIN || 'example.com';

// Cloudflare API Configuration
const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

// GET - Get current forwarding configuration for authenticated user
export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile with forwarding info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('alias, email, forward_to')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      alias: profile.alias,
      email: profile.email,
      forward_to: profile.forward_to,
      forwarding_enabled: !!profile.forward_to,
    });
  } catch (error) {
    console.error('Get forwarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Update forwarding configuration (creates/updates Cloudflare DNS record)
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

    const body = await request.json();
    const { forward_to } = body;

    // Validate forward_to email if provided
    if (forward_to && !isValidEmail(forward_to)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('alias, email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Update profile with new forward_to value
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ forward_to: forward_to || null })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update forwarding', details: updateError.message },
        { status: 500 }
      );
    }

    // If Cloudflare credentials are configured, update DNS
    const cloudflareApiKey = process.env.CLOUDFLARE_API_KEY;
    const cloudflareZoneId = process.env.CLOUDFLARE_ZONE_ID;

    if (cloudflareApiKey && cloudflareZoneId) {
      try {
        await updateCloudflareDNS(
          profile.alias,
          forward_to,
          cloudflareApiKey,
          cloudflareZoneId
        );
      } catch (cloudflareError) {
        console.error('Cloudflare DNS update failed:', cloudflareError);
        // Don't fail the request, just log the error
        return NextResponse.json({
          success: true,
          warning: 'Forwarding updated in database, but Cloudflare DNS update failed',
          details: (cloudflareError as Error).message,
        });
      }
    } else {
      console.warn('Cloudflare credentials not configured - skipping DNS update');
    }

    return NextResponse.json({
      success: true,
      message: forward_to 
        ? `Forwarding enabled: ${profile.email} → ${forward_to}` 
        : 'Forwarding disabled',
      alias: profile.alias,
      email: profile.email,
      forward_to: forward_to || null,
    });
  } catch (error) {
    console.error('Update forwarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Helper function to validate email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to update Cloudflare DNS TXT record
async function updateCloudflareDNS(
  alias: string,
  forwardTo: string | null,
  apiKey: string,
  zoneId: string
): Promise<void> {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  // List existing TXT records for forward-email
  const listResponse = await fetch(
    `${CLOUDFLARE_API_BASE}/zones/${zoneId}/dns_records?type=TXT&name=${APEX_DOMAIN}`,
    { headers }
  );

  if (!listResponse.ok) {
    const errorData = await listResponse.json();
    throw new Error(`Cloudflare API error: ${errorData.errors?.[0]?.message || 'Unknown error'}`);
  }

  const listData = await listResponse.json();
  
  // Find existing forward-email record for this alias
  // The record should contain the alias in the forward-email configuration
  const existingRecord = listData.result.find((record: { content: string; id: string }) => {
    // Check if this is a forward-email record that includes this alias
    const match = record.content.match(/"forward-email=([^"]+)"/);
    if (match) {
      const rules = match[1].split(',');
      return rules.some(rule => rule.startsWith(`${alias}:`));
    }
    return false;
  });

  if (!existingRecord) {
    throw new Error(`No DNS record found for alias: ${alias}. Please contact support.`);
  }

  // Build the new DNS content using the helper function from cloudflare.ts
  const newContent = buildForwardEmailDNS(alias, forwardTo || undefined);

  console.log('🔄 Updating Cloudflare DNS record:', {
    recordId: existingRecord.id,
    alias,
    forwardTo: forwardTo || 'none (webhook only)',
    oldContent: existingRecord.content,
    newContent,
  });

  // Update existing record with PATCH
  const updateResponse = await fetch(
    `${CLOUDFLARE_API_BASE}/zones/${zoneId}/dns_records/${existingRecord.id}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        content: newContent,
      }),
    }
  );

  if (!updateResponse.ok) {
    const errorData = await updateResponse.json();
    console.error('❌ Cloudflare DNS update failed:', errorData);
    throw new Error(`Failed to update DNS record: ${errorData.errors?.[0]?.message || 'Unknown error'}`);
  }

  const updateData = await updateResponse.json();
  console.log('✅ DNS record updated successfully:', updateData.result.id);
}
