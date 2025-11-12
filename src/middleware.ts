import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip ALL middleware logic for webhooks - let them through immediately
  if (pathname.startsWith('/api/webhooks')) {
    console.log('='.repeat(80));
    console.log('🔔 MIDDLEWARE: WEBHOOK REQUEST DETECTED');
    console.log('📍 Path:', pathname);
    console.log('📍 Method:', request.method);
    console.log('📍 User-Agent:', request.headers.get('user-agent'));
    console.log('📍 Content-Type:', request.headers.get('content-type'));
    console.log('📍 All Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
    console.log('📍 Timestamp:', new Date().toISOString());
    console.log('✅ BYPASSING ALL MIDDLEWARE - Passing through to route handler');
    console.log('='.repeat(80));
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes
  if (
    !user &&
    !pathname.startsWith('/sign-in') &&
    !pathname.startsWith('/sign-up') &&
    !pathname.startsWith('/api/webhooks') && // Allow webhooks without auth
    !pathname.startsWith('/api/verify-passphrase') // Allow passphrase verification during sign-up
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    return NextResponse.redirect(url);
  }

  // If user is logged in and tries to access sign-in/sign-up, redirect to dashboard
  if (
    user &&
    (pathname.startsWith('/sign-in') ||
      pathname.startsWith('/sign-up'))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard/inbox';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
