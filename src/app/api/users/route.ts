import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteForwardEmailDNS, listForwardEmailDNS } from '@/lib/cloudflare';

// GET - List all users (admin only)
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

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get all users with their profiles using admin client to bypass RLS
    const supabaseAdmin = createAdminClient();
    const { data: profiles, error: usersError } = await supabaseAdmin
      .from('profiles')
      .select('id, alias, email, forward_to, role, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Failed to fetch users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      users: profiles,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a user (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Get the user's profile to find their alias (use admin client to bypass RLS)
    const supabaseAdmin = createAdminClient();
    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from('profiles')
      .select('alias, role')
      .eq('id', userId)
      .single();

    if (targetProfileError || !targetProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent deleting other admins
    if (targetProfile.role === 'admin') {
      return NextResponse.json(
        { error: 'Cannot delete other admin accounts' },
        { status: 400 }
      );
    }

    // Find and delete the Cloudflare DNS record for this user
    let dnsDeleted = false;
    let dnsError = null;

    try {
      const dnsListResult = await listForwardEmailDNS();
      
      if (dnsListResult.success && dnsListResult.records) {
        // Find the DNS record that contains this user's alias
        // The content might be like: "forward-email=alias:email@domain.com,alias:webhook"
        // We need to match alias: in the content (with or without quotes)
        const userRecord = dnsListResult.records.find((record) => {
          const content = record.content.replace(/^"(.*)"$/, '$1'); // Remove surrounding quotes if present
          const pattern = new RegExp(`forward-email=.*\\b${targetProfile.alias}:`);
          return pattern.test(content);
        });

        if (userRecord?.id) {
          console.log(`🗑️ Deleting DNS record for ${targetProfile.alias} (ID: ${userRecord.id})`);
          const deleteResult = await deleteForwardEmailDNS(userRecord.id);
          
          if (deleteResult.success) {
            dnsDeleted = true;
            console.log(`✅ DNS record deleted successfully`);
          } else {
            dnsError = deleteResult.error;
            console.error(`❌ Failed to delete DNS record:`, deleteResult.error);
          }
        } else {
          console.log(`⚠️ No DNS record found for ${targetProfile.alias}`);
        }
      }
    } catch (error) {
      dnsError = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error deleting DNS record:', error);
    }

    // Delete user from Supabase Auth using admin API
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('Failed to delete user from auth:', deleteAuthError);
      return NextResponse.json(
        { 
          error: 'Failed to delete user', 
          details: deleteAuthError.message,
          dnsDeleted,
          dnsError 
        },
        { status: 500 }
      );
    }

    // The profile and emails will be automatically deleted via CASCADE

    return NextResponse.json({
      success: true,
      message: `User ${targetProfile.alias} deleted successfully`,
      dnsDeleted,
      dnsError: dnsError || undefined,
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
