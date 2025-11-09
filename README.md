# mail.fisica.cat

A minimalistic, modern email dashboard for managing @fisica.cat email addresses. Built with Next.js, Supabase, and integrated with ForwardEmail (receiving) and SMTP2GO (sending).

## Features

- 🔐 **Multi-user authentication** with Supabase Auth
- 📧 **Receive emails** via ForwardEmail webhooks
- 📤 **Send emails** using SMTP2GO API
- 👤 **Personal aliases** - each user gets their own `alias@fisica.cat` email
- 📨 **Email forwarding** to external addresses (optional)
- 👨‍💼 **Role-based access** - admin and user roles
- 🔒 **Row Level Security** - users only see their own emails
- 🎨 **Clean UI** with Tailwind CSS v4
- ⚡ **Real-time** email delivery

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS v4
- **Email Receiving**: ForwardEmail
- **Email Sending**: SMTP2GO
- **DNS Management**: Cloudflare API (optional)
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account
- SMTP2GO API key
- ForwardEmail account
- Cloudflare API access (optional, for forwarding)

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/mail-fisica.cat.git
cd mail-fisica.cat
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# SMTP2GO Configuration
SMTP2GO_API_KEY=your_smtp2go_api_key
SMTP2GO_SENDER_EMAIL=alias@fisica.cat

# ForwardEmail Webhook Secret (optional)
FORWARD_EMAIL_WEBHOOK_SECRET=your_webhook_secret

# Cloudflare API Configuration (optional, for automatic DNS forwarding)
CLOUDFLARE_API_KEY=your_cloudflare_api_key
CLOUDFLARE_ZONE_ID=your_cloudflare_zone_id
```

### 3. Database Setup

1. Go to your Supabase project SQL Editor
2. Run the SQL from `database-multiuser-setup.sql`
3. This creates:
   - `profiles` table for user data
   - `emails` table for messages
   - Row Level Security policies
   - Helper functions for alias validation

### 4. Configure ForwardEmail

Add a TXT record to your domain DNS:

```
Type: TXT
Name: @
Value: forward-email=alias:https://mail.fisica.cat/api/webhooks/incomingMail
```

**Important**: The `alias:` prefix is required for ForwardEmail to send the full email content.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign up with your desired alias.

## Architecture

### Authentication Flow

1. User signs up with an alias (e.g., "miquel")
2. Supabase creates auth user and profile automatically
3. Profile email is `alias@fisica.cat` (generated column)
4. Middleware protects all dashboard routes
5. RLS policies ensure data isolation

### Email Receiving Flow

1. Email sent to `alias@fisica.cat`
2. ForwardEmail webhook calls `/api/webhooks/incomingMail`
3. Webhook extracts recipient alias
4. Finds user by alias in profiles table
5. Stores email with `user_id` in emails table
6. User sees email in their inbox (filtered by RLS)

### Email Sending Flow

1. User composes email in dashboard
2. API gets user's profile to determine sender email
3. SMTP2GO sends email from `alias@fisica.cat`
4. Email stored with `user_id` as "outgoing"
5. User sees it in their sent folder

### Email Forwarding Flow (Optional)

1. User configures forwarding in Settings
2. API updates profile `forward_to` field
3. If Cloudflare credentials configured, creates DNS TXT record
4. ForwardEmail automatically forwards to external address
5. Emails still stored in user's inbox

## Project Structure

```
src/
├── app/
│   ├── sign-in/              # Login page
│   ├── sign-up/              # Registration with alias selection
│   ├── dashboard/
│   │   ├── inbox/           # Incoming emails
│   │   ├── sent/            # Sent emails
│   │   ├── compose/         # Send new email
│   │   ├── settings/        # Forwarding configuration
│   │   ├── monitor/         # Webhook logs (admin only)
│   │   └── test/            # Test webhook (admin only)
│   └── api/
│       ├── emails/          # GET/PATCH emails
│       ├── send/            # POST send email
│       ├── forwarding/      # GET/POST forwarding config
│       └── webhooks/
│           └── incomingMail/ # ForwardEmail webhook
├── components/
│   ├── Sidebar.tsx          # Navigation with auth
│   ├── EmailList.tsx        # Email list component
│   └── ...
├── lib/
│   ├── supabase/
│   │   ├── server.ts        # Server-side client
│   │   └── client.ts        # Browser client
│   ├── types/
│   │   └── auth.ts          # Profile, User types
│   ├── smtp2go.ts           # SMTP2GO integration
│   └── types.ts             # Email types
└── middleware.ts            # Route protection
```

## Database Schema

### profiles

```sql
id: UUID (PK, FK to auth.users)
alias: TEXT (unique, e.g., "miquel")
email: TEXT (generated: alias || '@fisica.cat')
forward_to: TEXT (nullable)
role: TEXT (default: 'user', enum: 'admin' | 'user')
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
```

### emails

```sql
id: UUID (PK)
user_id: UUID (FK to profiles)
from_email: TEXT
to_email: TEXT
subject: TEXT
body: TEXT
html_body: TEXT
type: TEXT ('incoming' | 'outgoing')
is_read: BOOLEAN
sent_at: TIMESTAMPTZ (nullable)
received_at: TIMESTAMPTZ (nullable)
message_id: TEXT (nullable)
attachments: JSONB
metadata: JSONB
created_at: TIMESTAMPTZ
```

## API Endpoints

### Authentication
- **POST** `/api/auth/signup` - Register new user (handled by Supabase)
- **POST** `/api/auth/signin` - Sign in user (handled by Supabase)

### Emails
- **GET** `/api/emails?type=incoming&limit=50&offset=0` - Get user's emails
- **PATCH** `/api/emails` - Mark email as read/unread

### Sending
- **POST** `/api/send` - Send email (requires auth)

### Forwarding
- **GET** `/api/forwarding` - Get current forwarding config
- **POST** `/api/forwarding` - Update forwarding config

### Webhooks
- **POST** `/api/webhooks/incomingMail` - ForwardEmail webhook (no auth)
- **GET** `/api/webhooks/incomingMail?limit=10` - Recent webhooks (admin)

## Security

### Row Level Security Policies

```sql
-- Users can read their own emails
CREATE POLICY "Users can read own emails"
ON emails FOR SELECT
USING (auth.uid() = user_id);

-- Admins can read all emails
CREATE POLICY "Admins can read all emails"
ON emails FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

### Middleware Protection

All routes under `/dashboard/*` require authentication. Public routes:
- `/sign-in`
- `/sign-up`
- `/api/webhooks/*` (protected by webhook secret)

## Admin Features

Users with `role = 'admin'` can:
- View Webhook Monitor (all recent incoming emails)
- Access Test Webhook page
- See all emails in the system (via RLS policy)

To make a user admin:

```sql
UPDATE profiles
SET role = 'admin'
WHERE alias = 'your-alias';
```

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables

Make sure all required env vars are set in your deployment:
- Supabase credentials (URL, anon key, service role key)
- SMTP2GO API key
- Cloudflare API credentials (optional)

## DNS Configuration

### Required Records

**ForwardEmail MX Records:**
```
Priority: 10, Host: @, Value: mx1.forwardemail.net
Priority: 20, Host: @, Value: mx2.forwardemail.net
```

**ForwardEmail Webhook TXT Record:**
```
Type: TXT
Name: @
Value: forward-email=alias:https://mail.fisica.cat/api/webhooks/incomingMail
```

### Optional (for forwarding)

**User-specific forwarding records** (created via Cloudflare API):
```
Type: TXT
Name: @
Value: forward-email=alias:external@email.com
```

## Troubleshooting

### Emails not arriving

1. Check ForwardEmail DNS records are correct
2. Verify webhook URL is accessible (use Monitor page)
3. Check Supabase logs for errors
4. Ensure `alias:` prefix is in TXT record

### Can't send emails

1. Verify SMTP2GO API key is correct
2. Check sender email is configured
3. Ensure user profile exists
4. Check browser console for errors

### Forwarding not working

1. Verify Cloudflare credentials are set
2. Check DNS propagation (can take a few minutes)
3. Use Settings page to test configuration
4. Check Cloudflare dashboard for TXT records

## Contributing

Contributions are welcome! Please open an issue or PR.

## License

MIT

## Support

For issues or questions, open a GitHub issue or contact admin@fisica.cat.

