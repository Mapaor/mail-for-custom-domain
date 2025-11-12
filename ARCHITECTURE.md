# Multi-User Email System Architecture

## Middleware
    ┌─────────────────────────────────────────────┐
    │               Middleware                    │
    │  • Auth check on every request              │
    │  • Redirect unauthenticated users           │
    │  • Protect /dashboard/* routes              │
    └─────────────────────────────────────────────┘


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
                  │  • Auto build   │
                  │  • Edge network │
                  │  • Env vars     │
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
