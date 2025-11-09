# 🔍 Why Your Emails Aren't Showing Up

## The Problem

Your Vercel logs show:
```
GET 200 /api/webhooks/incomingMail  ← Monitor page checking for emails
GET 200 /api/webhooks/incomingMail  ← Monitor page checking for emails
```

But you need to see:
```
POST 200 /api/webhooks/incomingMail  ← Actual email being received!
```

## What's Happening

**The GET requests are from YOUR Monitor page**, not from ForwardEmail!

When you visit https://mail.fisica.cat/dashboard/monitor, it makes GET requests to check if any emails have been received. These requests return 200 OK because the endpoint is working correctly.

**BUT**: ForwardEmail hasn't sent any POST requests yet, so there are no emails to show!

---

## ✅ Database Structure is CORRECT

You asked: "Should I create another table for received emails?"

**NO!** The `emails` table stores BOTH:
- ✉️ **Incoming emails** (type = 'incoming')
- 📤 **Outgoing emails** (type = 'outgoing')

The `type` column distinguishes between them. This is the correct design!

```sql
CREATE TABLE emails (
  ...
  type TEXT CHECK (type IN ('incoming', 'outgoing')) NOT NULL,
  ...
);
```

When you:
- **Send an email**: Stored with `type = 'outgoing'`
- **Receive an email**: Stored with `type = 'incoming'`

The Inbox page queries: `WHERE type = 'incoming'`  
The Sent page queries: `WHERE type = 'outgoing'`

---

## 🎯 The Real Issue

**ForwardEmail is NOT configured to send POST requests to your webhook yet!**

Or it's configured incorrectly. Here's what needs to happen:

### What Should Happen:
1. Someone sends email to `alias@fisica.cat`
2. ForwardEmail receives it
3. ForwardEmail sends a **POST request** to `https://mail.fisica.cat/api/webhooks/incomingMail`
4. Your webhook stores it in Supabase
5. Email appears in Inbox

### What's Actually Happening:
1. Your Monitor page makes **GET requests** to check for emails
2. No POST requests are being received
3. No emails are stored
4. Inbox is empty

---

## 🧪 How to Test

### Step 1: Test Your Webhook (New Feature!)

Visit: **https://mail.fisica.cat/dashboard/test**

Click "Send Test Email" - this will:
1. Simulate ForwardEmail sending a POST request
2. Store a test email in your database
3. Show it in your inbox

**If this works**: Your webhook is functioning correctly! The problem is ForwardEmail configuration.

**If this doesn't work**: There's an issue with Supabase connection or database schema.

### Step 2: Check Vercel Logs After Test

After clicking "Send Test Email", check Vercel logs. You should see:

```
POST 200 /api/test-webhook        ← Your test button
POST 200 /api/webhooks/incomingMail  ← Webhook receiving the test email
📨 Webhook received: { headers: {...}, body: {...} }
📧 Parsed email data: {...}
✅ Email stored successfully: abc123-def456-...
```

### Step 3: Check Your Inbox

Go to https://mail.fisica.cat/dashboard/inbox

You should see a test email from `test@example.com`!

---

## 📋 ForwardEmail Configuration Checklist

Once the test works, configure ForwardEmail:

### In ForwardEmail Dashboard:

1. ✅ **Alias**: `alias@fisica.cat` or `*@fisica.cat` (catch-all)

2. ✅ **Forward To**: Enable "Webhook" option

3. ✅ **Webhook URL**: 
   ```
   https://mail.fisica.cat/api/webhooks/incomingMail
   ```

4. ✅ **Method**: POST (not GET!)

5. ✅ **Content-Type**: application/json

6. ✅ **Authentication**: None required (unless you want to add webhook secret)

### Common ForwardEmail Issues:

❌ **Wrong URL**: Make sure it's exactly `https://mail.fisica.cat/api/webhooks/incomingMail`
❌ **Wrong Method**: Must be POST, not GET
❌ **Webhook disabled**: Make sure webhook forwarding is enabled for the alias
❌ **DNS not configured**: Verify MX records are correct

---

## 🔬 Debugging Guide

### Check 1: Test Page Works?
- Go to `/dashboard/test`
- Click "Send Test Email"
- ✅ Works? → Problem is ForwardEmail config
- ❌ Doesn't work? → Problem is Supabase/database

### Check 2: Vercel Logs Show POST Requests?
After someone emails `alias@fisica.cat`:
- ✅ See POST to `/api/webhooks/incomingMail`? → Webhook receiving emails
- ❌ Only see GET requests? → ForwardEmail not sending webhooks

### Check 3: Database Has Table?
Run in Supabase SQL Editor:
```sql
SELECT * FROM emails WHERE type = 'incoming' ORDER BY created_at DESC LIMIT 5;
```
- ✅ Returns results? → Emails are being stored
- ❌ Error: relation does not exist? → Run `database-setup.sql`

### Check 4: ForwardEmail Logs
Check ForwardEmail dashboard for:
- Webhook delivery status
- Any error messages
- Retry attempts

---

## 📊 Understanding the Request Types

### GET Requests (What you're seeing):
```
Source: Your browser/Monitor page
Purpose: Checking IF emails have been received
Result: Returns list of existing emails (or empty array)
Storage: Does NOT store anything
```

### POST Requests (What you need):
```
Source: ForwardEmail (when someone sends email)
Purpose: STORING new incoming email
Result: Creates new row in database
Storage: YES - stores the email
```

---

## ✅ Quick Fix Checklist

1. [ ] Run the test at `/dashboard/test` - does it work?
2. [ ] Check test email appears in `/dashboard/inbox`
3. [ ] Verify Supabase table exists (run `database-setup.sql`)
4. [ ] Configure ForwardEmail webhook URL correctly
5. [ ] Set ForwardEmail method to POST
6. [ ] Send test email to `alias@fisica.cat`
7. [ ] Check Vercel logs for POST request
8. [ ] Check Monitor page for webhook delivery
9. [ ] Check Inbox for the email

---

## 💡 Pro Tip

After you configure ForwardEmail correctly, your Vercel logs will look like this:

```
GET 200 /api/webhooks/incomingMail         ← Monitor page checking
POST 200 /api/webhooks/incomingMail        ← ACTUAL EMAIL RECEIVED! ✅
GET 200 /api/emails?type=incoming          ← Inbox fetching emails
GET 200 /api/webhooks/incomingMail         ← Monitor page checking again
```

The POST requests are what you're waiting for!

---

## 🎯 Summary

- ✅ Your database structure is CORRECT (one table for both incoming and outgoing)
- ✅ Your webhook endpoint is WORKING (responds to requests)
- ✅ Your Monitor page is WORKING (shows GET requests)
- ❌ ForwardEmail is NOT sending POST requests yet
- 🎯 Use the Test page at `/dashboard/test` to verify everything works
- 🔧 Then configure ForwardEmail to send webhooks

**The webhook IS working, it's just not receiving any emails from ForwardEmail yet!**
