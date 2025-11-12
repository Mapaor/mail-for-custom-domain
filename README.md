## Overview

A minimalistic, modern email dashboard for sending and receiving mail at a custom domain for Free. Using SMTP2GO, ForwardEmail, Supabase and Cloudflare.

### Features

- Multi-user authentication
- Receive emails at alias@yourdomain.com (and optionally forward them to your personal Gmail, Outlook, etc. inboxes)
- Send emails from your domain manually using SMTP2GO (alias@yourdomain.com).
- Send automated emails from a subdomain (alias@mg.yourdomain.com)
- Role-based access (admin or user roles)
- Row Level Security (users only see their own emails)
- Nice minimalistic UI and refresh buttons for real-time updates.

### Tech used

- Next.js 16 (with App Router), Tailwind CSS and Typescript.
- PostgreSQL with RLS and authentication (managed via Supabase and Supabase Auth).
- ForwardEmail for receiving emails (and forwarding them to other mail addressed and webhooks endpoints).
- SMTP2GO for sending emails manually
- (Optionally) Mailgun for sending automated emails.
- Cloudflare dashboard and Cloudflare API for managing DNS

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/mail-fisica.cat.git
mv mail-fisica.cat your-repo-name
cd your-repo-name
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and fill in your domain info.

```bash
# Domain info
APEX_DOMAIN=example.com
SITE_URL=https://mail.example.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# SMTP2GO Configuration
SMTP2GO_API_KEY=your_smtp2go_api_key

# Cloudflare API Configuration
ALLOW_AUTO_REGISTER=TRUE
CLOUDFLARE_ZONE_ID=your_cloudflare_zone_id
CLOUDFLARE_API_KEY=your_cloudflare_api_key
```

You can obtain your Supabase environment variables following [SUPABSE_GUIDE.md](./SUPABASE_GUIDE.md), and to obtain your Cloudflare API environment variables (as well as SMTP2GO API Key) follow the [CLOUDFLARE_GUIDE.md](./CLOUDFLARE_GUIDE.md).

Make sure you get your database properly configured (as explained in [SUPABSE_GUIDE.md](./SUPABASE_GUIDE.md)) before doing anything.

## Run locally (development)

```bash
npm install
npm run dev
```
And open [http://localhost:3000](http://localhost:3000) (or similar) to see the website.

## Deploying on Vercel
First check the code can run in production with no errors:
```bash
npm run build
npm start
```
Then deploy it.

1. Push to GitHub (via GitHub Desktop or `git push`)
2. Import project in Vercel
3. Add environment variables
4. Click 'Deploy'
5. Connect it to you custom domain [mail.example.com](mail.example.com)

Now every time a commit gets pushed to GitHub, Vercel will automatically redeploy the site.

## License

MIT License
