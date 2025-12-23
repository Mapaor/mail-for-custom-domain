## Overview

A minimalistic, modern email dashboard for sending and receiving mail at a custom domain for Free. Using SMTP2GO, ForwardEmail, Supabase and Cloudflare.

![](/public/screenshots/inbox.png)

<details>
<summary>More screenshots</summary>

![](/public/screenshots/compose.png)

![](/public/screenshots/user-management.png)

![](/public/screenshots/monitor.png)

![](/public/screenshots/settings.png)

![](/public/screenshots/login.png)

![](/public/screenshots/signup.png)

All pages have a dark mode available as well.

![](/public/screenshots/singin-dark.png)

![](/public/screenshots/sent-dark.png)

</details>

### Features

- Multi-user authentication
- Receive emails at alias@yourdomain.com (and optionally forward them to your personal Gmail, Outlook, etc. inboxes)
- Send emails from your domain manually using SMTP2GO (alias@yourdomain.com).
- If you want you can still send automated emails from a subdomain (alias@mg.yourdomain.com)
- Role-based access (admin or user roles)
- Row Level Security (users only see their own emails)
- Admin dashboard for user management (delete users and their DNS records)
- Dark mode available
- Nice minimalistic UI and refresh buttons for real-time updates.

### Tech used

- Next.js 16 (with App Router), Tailwind CSS and Typescript.
- PostgreSQL with RLS and authentication (managed via Supabase and Supabase Auth).
- ForwardEmail for receiving emails (and forwarding them to other mail addressed and webhooks endpoints).
- SMTP2GO for sending emails manually
- (Optionally) Mailgun for sending automated emails.
- Cloudflare dashboard and Cloudflare API for managing DNS
- Cron-job.org for keeping the Supabase project active.

### Context

If you have a domain, you can send and receive mails at your domain for free! There are multiple ways of doing that, one would be to set up your own mail server (self-hosted options like Postfix or similar), the problem is that is hard to achieve and maintain good email reputation for your domain and server IP. Another option would be to use Zoho or other mail providers, but their free tier, as generous as it is, is normally limited to a specific number of accounts (or aliases) and lot's of features (like email routing, webhooks, etc.) are only available as paid plans.

Then what does this repository do? It uses already existing and popular services like ForwardEmail (for receiving emails) SMPT2GO (for sending emails), Cloudflare (for managing DNS), Vercel (for hosting the NextJS web app) or Supabase (for hosting the database), allowing for a totally customizable email dashboard for sending and receiving emails at your apex domain.

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/mail-for-custom-domain.git
mv mail-for-custom-domain your-repo-name
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

You can obtain your Supabase environment variables following [SUPABSE_GUIDE.md](./SUPABASE_GUIDE.md). Make sure you get your database properly configured (as explained in the guide) before doing anything.

To obtain your Cloudflare API environment variables (as well as SMTP2GO API Key) follow the [CLOUDFLARE_GUIDE.md](./CLOUDFLARE_GUIDE.md).


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

## Keeping the Supabase project active
Great, you've managed to deploy your site and your mail dashboard is working correctly both for sending and receiving emails. It works now, however if no one sends you (or you sent) an email in 7 days, the Supabase project will be paused. 

This is a limit of the Supabase Free Tier, but it can be easily overcome. The trick is very simple and explained in the following toggle.

<details>
<summary>How to set up a cron job to avoid your Supabase project getting paused</summary>


### The idea
This NextJS project already has one api route (with no authentication required) implemented called `supabase-keep-alive` so that when you visit https://your-site.com/api/supabase-keep-alive the website (Vercel) performs a GET request to Supabase. 

The idea is then to create cron-job that "visits" this link periodically. This way our Supabase project will remain "active" and won't get paused.

### What does the api route do?


Specifically it fetches (only) the total number of profiles. So the user count number is the only data accessible via this endpoint which is accessible by anyone (not like the other api endpoints which have Row Level Security).

### How do I setup the cron job?

 There are numerous ways to set up a cron job. One of the easiest is just signing up at [cron-job.org](https://cron-job.org) (free and open-source) and creating a cron job there.

 Here you can see an example setup for a cron job.

![](/public/screenshots/cron-job-setup.png)

In the example image above, the following cron expression was used: 

```
0 2 * *  0,3
```
Which corresponds to Sunday and Wednesday at 2am.

Once your cron job is active your Supabase project should never get paused. However Supabase may change one day their Free Tier policy. If this ever happens don't worry I'll be the first to be notified and I'll think of a fix or a Supabase alternative.

</details>

## Questions
If you have any questions contact me at [marti@fisica.cat](mailto:marti@fisica.cat) ;)


## License

MIT License
