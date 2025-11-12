# Multi-User Email System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  Sign In   │  │   Inbox    │  │  Compose   │                │
│  │    Page    │  │    Page    │  │    Page    │                │
│  └────────────┘  └────────────┘  └────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js App Router                          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     Middleware                            │  │
│  │  • Auth check on every request                           │  │
│  │  • Redirect unauthenticated users                        │  │
│  │  • Protect /dashboard/* routes                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     API Routes                            │  │
│  │                                                            │  │
│  │  /api/emails      → Get/update user's emails            │  │
│  │  /api/send        → Send email via SMTP2GO              │  │
│  │  /api/forwarding  → Manage email forwarding             │  │
│  │  /api/webhooks/   → Receive from ForwardEmail           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│    Supabase      │  │    SMTP2GO       │  │   Cloudflare     │
│                  │  │                  │  │                  │
│  ┌────────────┐  │  │  • Send emails  │  │  • DNS TXT       │
│  │ PostgreSQL │  │  │  • API key auth │  │    records       │
│  │   + RLS    │  │  │  • Dynamic      │  │  • Forwarding    │
│  └────────────┘  │  │    sender       │  │    config        │
│                  │  └──────────────────┘  └──────────────────┘
│  ┌────────────┐  │
│  │   Auth     │  │
│  │  Service   │  │           ┌──────────────────┐
│  └────────────┘  │           │  ForwardEmail    │
│                  │           │                  │
└──────────────────┘           │  • Receive mail  │
                               │  • Send webhook  │
                               │  • DNS MX        │
                               └──────────────────┘
```

## User Authentication Flow

```
1. User visits /sign-up
   ↓
2. Enters alias, email, password
   ↓
3. Supabase Auth creates user
   ↓
4. Trigger creates profile with alias
   ↓
5. Redirect to /dashboard/inbox
   ↓
6. Middleware checks session on each request
   ↓
7. API routes get user from session
   ↓
8. RLS filters queries by user_id
```

## Email Receiving Flow

```
External Sender → email to miquel@example.com
                              ↓
                    ForwardEmail MX server
                              ↓
                    Processes email content
                              ↓
                    POST /api/webhooks/incomingMail
                              ↓
                    Extract recipient alias ("miquel")
                              ↓
                    Query profiles table for user
                              ↓
                    Insert into emails with user_id
                              ↓
                    RLS ensures user sees only their emails
                              ↓
                    User refreshes inbox → sees new email
```

## Email Sending Flow

```
User clicks Compose → fills form
                              ↓
                    POST /api/send
                              ↓
                    Get authenticated user
                              ↓
                    Query profile for email address
                              ↓
                    Call SMTP2GO with sender = miquel@example.com
                              ↓
                    SMTP2GO delivers email
                              ↓
                    Insert into emails with type='outgoing'
                              ↓
                    User sees email in Sent folder
```

## Email Forwarding Flow

```
User enters forward_to in Settings
                              ↓
                    POST /api/forwarding
                              ↓
                    Update profile.forward_to
                              ↓
                    Call Cloudflare API
                              ↓
                    Create/update DNS TXT record
                    forward-email=miquel:external@email.com
                              ↓
                    DNS propagates (5-10 minutes)
                              ↓
                    ForwardEmail reads DNS
                              ↓
                    Incoming email → both stored AND forwarded
```

## Database Schema Relationships

```
┌─────────────────────────────────────────────┐
│              auth.users                      │
│  (Managed by Supabase Auth)                 │
│                                              │
│  • id (UUID)                                │
│  • email                                    │
│  • encrypted_password                       │
│  • created_at                               │
└─────────────────────────────────────────────┘
                    │
                    │ 1:1
                    ▼
┌─────────────────────────────────────────────┐
│              profiles                        │
│  (Custom user data)                         │
│                                              │
│  • id (FK to auth.users.id)                │
│  • alias (unique, e.g., "miquel")          │
│  • email (generated: alias@example.com)    │
│  • forward_to (nullable)                   │
│  • role ('admin' | 'user')                 │
│  • created_at, updated_at                  │
└─────────────────────────────────────────────┘
                    │
                    │ 1:N
                    ▼
┌─────────────────────────────────────────────┐
│              emails                          │
│  (Email messages)                           │
│                                              │
│  • id (UUID)                                │
│  • user_id (FK to profiles.id)             │
│  • from_email                               │
│  • to_email                                 │
│  • subject, body, html_body                │
│  • type ('incoming' | 'outgoing')          │
│  • is_read (boolean)                       │
│  • attachments (JSONB)                     │
│  • metadata (JSONB)                        │
│  • created_at, sent_at, received_at        │
└─────────────────────────────────────────────┘
```

## Row Level Security Policies

### Read Policies

```sql
-- Users can read their own emails
auth.uid() = user_id

-- Admins can read all emails
EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = 'admin'
)
```

### Write Policies

```sql
-- Users can insert their own emails (for sending)
auth.uid() = user_id

-- Webhooks use service role key (bypass RLS)
-- No INSERT policy needed for regular users
```

### Visual RLS Example

```
User A (id: xxx-111)           User B (id: xxx-222)
     │                              │
     ▼                              ▼
┌─────────────────┐         ┌─────────────────┐
│  emails table   │         │  emails table   │
│  (RLS filtered) │         │  (RLS filtered) │
│                 │         │                 │
│  • Email 1      │         │  • Email 4      │
│    user_id: 111 │         │    user_id: 222 │
│  • Email 2      │         │  • Email 5      │
│    user_id: 111 │         │    user_id: 222 │
│  • Email 3      │         │                 │
│    user_id: 111 │         │                 │
└─────────────────┘         └─────────────────┘

Admin (id: xxx-999, role: admin)
          │
          ▼
┌─────────────────┐
│  emails table   │
│  (No filter)    │
│                 │
│  • Email 1      │
│  • Email 2      │
│  • Email 3      │
│  • Email 4      │
│  • Email 5      │
└─────────────────┘
```

## API Authentication Patterns

### Server Components / API Routes

```typescript
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  // Query filtered by user.id
  const { data } = await supabase
    .from('emails')
    .select('*')
    .eq('user_id', user.id);  // Explicit filter + RLS
  
  return NextResponse.json({ emails: data });
}
```

### Client Components

```typescript
'use client';
import { createClient } from '@/lib/supabase/client';

export default function Component() {
  const supabase = createClient();
  
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      // RLS automatically filters
      const { data } = await supabase
        .from('emails')
        .select('*');
    }
  }, []);
}
```

### Webhooks (No Auth)

```typescript
import { createClient } from '@supabase/supabase-js';

const getSupabaseServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,  // Bypass RLS
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
};

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServiceClient();
  
  // Find user by alias
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('alias', recipientAlias)
    .single();
  
  // Insert with service role (bypasses RLS)
  await supabase.from('emails').insert({
    user_id: profile.id,
    // ... email data
  });
}
```

## Request Flow Examples

### 1. User Signs Up

```
Browser                 Next.js              Supabase
   │                       │                    │
   ├─ POST /sign-up ──────►│                    │
   │                       ├─ signUp() ────────►│
   │                       │                    ├─ Create user
   │                       │                    ├─ Trigger: create profile
   │                       │◄── Session ────────┤
   │◄── Redirect inbox ────┤                    │
   │                       │                    │
```

### 2. User Views Inbox

```
Browser                 Next.js              Supabase
   │                       │                    │
   ├─ GET /dashboard/inbox►│                    │
   │                       ├─ Middleware ───────►│
   │                       │◄── User ────────────┤
   │                       ├─ GET /api/emails ──►│
   │                       │                    ├─ SELECT ... WHERE user_id = ?
   │                       │◄── Emails ──────────┤
   │◄── HTML with emails ──┤                    │
   │                       │                    │
```

### 3. External Email Arrives

```
External              ForwardEmail         Webhook              Supabase
   │                       │                   │                    │
   ├─ Send email ─────────►│                   │                    │
   │                       ├─ Process email    │                    │
   │                       ├─ POST webhook ────►│                    │
   │                       │                   ├─ Parse payload     │
   │                       │                   ├─ Find user ────────►│
   │                       │                   │◄── profile ─────────┤
   │                       │                   ├─ Insert email ─────►│
   │                       │◄── 200 OK ────────┤                    │
   │◄── Delivery receipt ──┤                   │                    │
```

### 4. User Sends Email

```
Browser               Next.js            SMTP2GO           Supabase
   │                     │                  │                 │
   ├─ POST /api/send ───►│                  │                 │
   │                     ├─ Get user ───────────────────────►│
   │                     │◄── profile ──────────────────────┤
   │                     ├─ Send email ─────►│                │
   │                     │◄── Success ───────┤                │
   │                     ├─ Insert email ────────────────────►│
   │◄── Success ─────────┤                  │                 │
```

## File Structure Decision Tree

```
Need authentication?
├─ YES → Use /app/dashboard/[page]
│        Import: @/lib/supabase/server (if server component)
│        Import: @/lib/supabase/client (if client component)
│
└─ NO → Use public pages
        - /app/sign-in
        - /app/sign-up

Need data from database?
├─ User-specific → Filter by user_id + rely on RLS
├─ Admin-only → Check profile.role = 'admin'
└─ Webhook → Use service role client

API route security?
├─ User endpoint → Check auth, filter by user.id
├─ Admin endpoint → Check auth, verify role = 'admin'
└─ Webhook → Use service role, validate webhook secret (optional)
```

## Environment-Specific Behavior

### Development (localhost:3000)

- ForwardEmail webhook: Can't reach localhost
- Solution: Use ngrok or deploy to test environment
- Alternative: Test webhook with Monitor/Test pages

### Production (Vercel)

- All webhooks work normally
- DNS TXT record points to production URL
- Cloudflare API creates real DNS records

## Security Layers

```
┌─────────────────────────────────────────┐
│  Layer 1: Middleware                    │
│  • Checks auth on every request         │
│  • Redirects unauthenticated users      │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Layer 2: API Route Auth Check          │
│  • getUser() in each endpoint           │
│  • Return 401 if no user                │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Layer 3: Explicit Filtering            │
│  • .eq('user_id', user.id) in queries   │
│  • Defense-in-depth                     │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Layer 4: Row Level Security (RLS)      │
│  • Enforced at database level           │
│  • Cannot be bypassed (except service)  │
└─────────────────────────────────────────┘
```

## Deployment Architecture

```
                  ┌─────────────────┐
                  │   GitHub Repo   │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │  Vercel Deploy  │
                  │  • Auto build    │
                  │  • Edge network  │
                  │  • Env vars      │
                  └────────┬────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │ Supabase │    │ SMTP2GO  │    │Cloudflare│
   │ Database │    │   API    │    │   DNS    │
   └──────────┘    └──────────┘    └──────────┘
          ▲                              │
          │                              ▼
          │                    ┌──────────────────┐
          │                    │  ForwardEmail    │
          └────────────────────┤  • Reads DNS     │
                               │  • Sends webhook │
                               └──────────────────┘
```

---

This architecture provides:
✅ Complete data isolation between users
✅ Scalable to many users
✅ Secure authentication and authorization
✅ Real-time email delivery
✅ Optional forwarding to external emails
✅ Admin monitoring capabilities
