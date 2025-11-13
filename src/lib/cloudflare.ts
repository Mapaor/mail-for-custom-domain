/**
 * Cloudflare API integration for managing DNS records
 */

const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY;
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const CLOUDFLARE_API_URL = 'https://api.cloudflare.com/client/v4';
const APEX_DOMAIN = process.env.NEXT_PUBLIC_APEX_DOMAIN || 'example.com';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mail.example.com';

interface CloudflareDNSRecord {
  id?: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
}

/**
 * Check if auto-registration is enabled
 */
export function isAutoRegisterEnabled(): boolean {
  return process.env.ALLOW_AUTO_REGISTER === 'TRUE';
}

/**
 * Build ForwardEmail DNS record content
 */
export function buildForwardEmailDNS(alias: string, forwardTo?: string): string {
  const webhookUrl = `${SITE_URL}/api/webhooks/incomingMail`;
  
  if (forwardTo) {
    return `"forward-email=${alias}:${forwardTo},${alias}:${webhookUrl}"`;
  }
  
  return `"forward-email=${alias}:${webhookUrl}"`;
}

/**
 * Create a DNS TXT record in Cloudflare for email forwarding
 */
export async function createForwardEmailDNS(
  alias: string,
  forwardTo?: string
): Promise<{ success: boolean; error?: string; record?: CloudflareDNSRecord }> {
  if (!CLOUDFLARE_API_KEY || !CLOUDFLARE_ZONE_ID) {
    console.error('❌ Cloudflare credentials not configured');
    return {
      success: false,
      error: 'Cloudflare API not configured',
    };
  }

  const content = buildForwardEmailDNS(alias, forwardTo);

  try {
    console.log('Creating Cloudflare DNS record:', { alias, content });

    const response = await fetch(
      `${CLOUDFLARE_API_URL}/zones/${CLOUDFLARE_ZONE_ID}/dns_records`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'TXT',
          name: '@', // Root domain
          content,
          ttl: 3600,
          proxied: false, // Only DNS, no Cloudflare proxy
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('❌ Cloudflare API error:', data);
      return {
        success: false,
        error: data.errors?.[0]?.message || 'Failed to create DNS record',
      };
    }

    console.log('DNS record created successfully:', data.result.id);

    return {
      success: true,
      record: data.result,
    };
  } catch (error) {
    console.error('Error creating DNS record:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List all DNS TXT records for the domain
 */
export async function listForwardEmailDNS(): Promise<{
  success: boolean;
  records?: CloudflareDNSRecord[];
  error?: string;
}> {
  if (!CLOUDFLARE_API_KEY || !CLOUDFLARE_ZONE_ID) {
    return {
      success: false,
      error: 'Cloudflare API not configured',
    };
  }

  try {
    // Get all TXT records without filtering by name first
    const response = await fetch(
      `${CLOUDFLARE_API_URL}/zones/${CLOUDFLARE_ZONE_ID}/dns_records?type=TXT`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.errors?.[0]?.message || 'Failed to list DNS records',
      };
    }

    // Filter only forward-email records (content might be wrapped in quotes)
    const forwardEmailRecords = data.result.filter((record: CloudflareDNSRecord) => {
      const content = record.content || '';
      return content.includes('forward-email=');
    });

    return {
      success: true,
      records: forwardEmailRecords,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a DNS record by ID
 */
export async function deleteForwardEmailDNS(recordId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!CLOUDFLARE_API_KEY || !CLOUDFLARE_ZONE_ID) {
    return {
      success: false,
      error: 'Cloudflare API not configured',
    };
  }

  try {
    const response = await fetch(
      `${CLOUDFLARE_API_URL}/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${recordId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.errors?.[0]?.message || 'Failed to delete DNS record',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update an existing DNS record
 */
export async function updateForwardEmailDNS(
  recordId: string,
  alias: string,
  forwardTo?: string
): Promise<{ success: boolean; error?: string }> {
  if (!CLOUDFLARE_API_KEY || !CLOUDFLARE_ZONE_ID) {
    return {
      success: false,
      error: 'Cloudflare API not configured',
    };
  }

  const content = buildForwardEmailDNS(alias, forwardTo);

  try {
    const response = await fetch(
      `${CLOUDFLARE_API_URL}/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.errors?.[0]?.message || 'Failed to update DNS record',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
