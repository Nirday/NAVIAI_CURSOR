# Navi AI - Preview Deployment Guide

## 🚀 Step-by-Step Preview Deployment

This guide walks you through deploying Navi AI to a preview environment (Vercel, Netlify, or similar).

---

## Prerequisites

- ✅ Git repository with all code committed
- ✅ Supabase project created
- ✅ All API keys obtained (OpenAI, Resend, Twilio, Stripe)
- ✅ Node.js 18+ installed locally

---

## Step 1: Choose Your Deployment Platform

### Option A: Vercel (Recommended for Next.js)
- Best for Next.js applications
- Automatic deployments from Git
- Built-in environment variable management
- Free tier available

### Option B: Netlify
- Good Next.js support
- Similar features to Vercel
- Free tier available

### Option C: Self-Hosted (VPS/Cloud)
- Full control
- Requires server setup
- More configuration needed

**We'll use Vercel as the example, but steps are similar for other platforms.**

---

## Step 2: Prepare Your Repository

### 2.1 Verify All Code is Committed

```bash
cd /Users/rasheshmehta/Downloads/Navi_AI_Gemini/navi-ai
git status
# Ensure all files are committed
git push origin main  # or your branch name
```

### 2.2 Create Deployment Configuration (Optional)

Create `vercel.json` in the root:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

## Step 3: Database Setup

### 3.1 Run All Database Migrations

**In Supabase Dashboard:**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Run these SQL files in order:

#### a) Main Schema
```sql
-- Copy and paste contents of: supabase-schema.sql
-- This creates all 40+ tables for all 10 modules
```

#### b) V1.5 Schema Updates
```sql
-- Copy and paste contents of: scripts/v1.5-schema-updates.sql
-- This adds call tracking and V1.5 features
```

#### c) Website Editor V1.5
```sql
-- Copy and paste contents of: scripts/website-editor-schema-update.sql
-- This adds last_google_ping_at column
```

### 3.2 Verify Tables Created

Run this query to verify:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see 40+ tables including:
- `business_profiles`
- `websites`
- `blog_posts`
- `social_connections`
- `contacts`
- `reviews`
- `subscriptions`
- `user_profiles`
- `call_tracking_numbers`
- etc.

### 3.3 Create Initial Admin User

```sql
-- Replace with actual user ID from auth.users
INSERT INTO user_profiles (user_id, role)
VALUES ('your-user-id-here', 'super_admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
```

---

## Step 4: Deploy to Vercel

### 4.1 Connect Repository

1. Go to https://vercel.com
2. Sign in with GitHub/GitLab/Bitbucket
3. Click **"Add New Project"**
4. Import your Navi AI repository
5. Select the repository

### 4.2 Configure Project

**Framework Preset**: Next.js (auto-detected)
**Root Directory**: `./navi-ai` (if monorepo) or `.` (if root)
**Build Command**: `npm run build`
**Output Directory**: `.next` (auto-detected)
**Install Command**: `npm install`

### 4.3 Set Environment Variables

In Vercel project settings → **Environment Variables**, add:

#### Core Services
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_DB_PASSWORD=your_db_password
```

#### AI Services
```
OPENAI_API_KEY=your_openai_key
```

#### Email & SMS
```
RESEND_API_KEY=your_resend_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

#### Payments
```
STRIPE_SECRET_KEY=your_stripe_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

#### OAuth (Optional - for specific features)
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
```

#### App Configuration
```
NEXT_PUBLIC_APP_URL=https://your-preview-domain.vercel.app
NEXT_PUBLIC_PUBLISH_BASE_DOMAIN=naviai.local
NODE_ENV=production
```

**Important**: 
- Set these for **Production**, **Preview**, and **Development** environments
- Use different values for preview vs production if needed

### 4.4 Deploy

1. Click **"Deploy"**
2. Wait for build to complete (5-10 minutes)
3. Note the deployment URL (e.g., `navi-ai-abc123.vercel.app`)

---

## Step 5: Configure Webhooks

### 5.1 Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Endpoint URL: `https://your-preview-domain.vercel.app/api/billing/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
5. Copy the **Signing Secret**
6. Add to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

### 5.2 Twilio Webhook

1. Go to https://console.twilio.com
2. Navigate to **Phone Numbers** → Your number
3. Set **Voice & Fax** webhook URL:
   - `https://your-preview-domain.vercel.app/api/call-tracking/webhook`
4. Set **Status Callback URL**:
   - `https://your-preview-domain.vercel.app/api/call-tracking/webhook`

### 5.3 Resend Webhook (Optional)

If using Resend webhooks:
1. Go to https://resend.com/webhooks
2. Add webhook URL:
   - `https://your-preview-domain.vercel.app/api/inbound/email`

---

## Step 6: Update OAuth Redirect URIs

### 6.1 Google OAuth

1. Go to https://console.cloud.google.com
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Add authorized redirect URIs:
   ```
   https://your-preview-domain.vercel.app/api/auth/callback/search-console
   https://your-preview-domain.vercel.app/api/auth/callback/reputation/google
   ```

### 6.2 Facebook OAuth

1. Go to https://developers.facebook.com
2. Navigate to your app → **Settings** → **Basic**
3. Add **Valid OAuth Redirect URIs**:
   ```
   https://your-preview-domain.vercel.app/api/auth/callback/facebook
   https://your-preview-domain.vercel.app/api/auth/callback/reputation/facebook
   ```

### 6.3 LinkedIn OAuth

1. Go to https://www.linkedin.com/developers/apps
2. Edit your app
3. Add **Authorized redirect URLs**:
   ```
   https://your-preview-domain.vercel.app/api/auth/callback/linkedin
   ```

### 6.4 Twitter OAuth

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Edit your app
3. Add **Callback URL**:
   ```
   https://your-preview-domain.vercel.app/api/auth/callback/twitter
   ```

---

## Step 7: Update Supabase Settings

### 7.1 Update Site URL

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set **Site URL**: `https://your-preview-domain.vercel.app`
3. Add **Redirect URLs**:
   ```
   https://your-preview-domain.vercel.app/**
   ```

### 7.2 Update RLS Policies (if needed)

Verify RLS policies allow access from your preview domain.

---

## Step 8: Test Deployment

### 8.1 Basic Health Check

Visit: `https://your-preview-domain.vercel.app`

Should see your app (or redirect to login).

### 8.2 Test Core Features

#### Module 1: Chat
- [ ] Visit `/dashboard`
- [ ] Send a test message
- [ ] Verify response

#### Module 2: Website
- [ ] Visit `/dashboard/website`
- [ ] Generate or edit website
- [ ] Test form editor

#### Module 9: Billing
- [ ] Visit `/dashboard/billing`
- [ ] View plans
- [ ] Test checkout (use Stripe test mode)

### 8.3 Test API Endpoints

```bash
# Test chat endpoint
curl -X POST https://your-preview-domain.vercel.app/api/chat/send \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-id" \
  -d '{"message": "Hello"}'

# Test website endpoint
curl https://your-preview-domain.vercel.app/api/website/me \
  -H "x-user-id: test-user-id"
```

### 8.4 Check Logs

In Vercel Dashboard:
1. Go to **Deployments**
2. Click on your deployment
3. View **Logs** tab
4. Check for errors

---

## Step 9: Post-Deployment Checklist

### 9.1 Verify Environment Variables

- [ ] All environment variables set correctly
- [ ] No sensitive keys exposed in logs
- [ ] Different values for preview vs production

### 9.2 Verify Database

- [ ] All tables created
- [ ] RLS policies enabled
- [ ] Admin user created
- [ ] Test data inserted (optional)

### 9.3 Verify Webhooks

- [ ] Stripe webhook receiving events
- [ ] Twilio webhook configured
- [ ] Test webhook delivery

### 9.4 Verify OAuth

- [ ] Google OAuth redirects work
- [ ] Facebook OAuth redirects work
- [ ] LinkedIn OAuth redirects work
- [ ] Twitter OAuth redirects work

### 9.5 Performance Check

- [ ] Page load times acceptable
- [ ] API response times good
- [ ] No memory leaks
- [ ] Build size reasonable

---

## Step 10: Set Up Monitoring (Optional)

### 10.1 Vercel Analytics

1. Enable in Vercel Dashboard
2. View performance metrics
3. Monitor errors

### 10.2 Error Tracking

Consider adding:
- Sentry for error tracking
- LogRocket for session replay
- Datadog for APM

### 10.3 Uptime Monitoring

Set up:
- UptimeRobot
- Pingdom
- StatusCake

---

## Troubleshooting

### Build Fails

**Error**: Module not found
- **Fix**: Check import paths, ensure all files committed

**Error**: Environment variable missing
- **Fix**: Add all required env vars in Vercel

**Error**: Database connection failed
- **Fix**: Verify Supabase credentials, check network access

### Runtime Errors

**Error**: 500 Internal Server Error
- **Fix**: Check Vercel logs, verify API routes

**Error**: OAuth redirect fails
- **Fix**: Verify redirect URIs match exactly

**Error**: Webhook not receiving events
- **Fix**: Verify webhook URL, check signature validation

### Database Issues

**Error**: Table doesn't exist
- **Fix**: Run migration SQL in Supabase

**Error**: RLS policy blocking access
- **Fix**: Check RLS policies, verify user authentication

---

## Quick Deploy Commands

### Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd navi-ai
vercel

# Deploy to preview
vercel --prod
```

### Using Git (Automatic)

1. Push to `main` branch → Production
2. Push to other branches → Preview
3. Create PR → Preview deployment

---

## Next Steps After Preview

1. **Test thoroughly** with real users
2. **Monitor errors** and fix issues
3. **Gather feedback** from stakeholders
4. **Optimize performance** based on metrics
5. **Prepare for production** deployment

---

## Production Deployment

When ready for production:

1. Create production environment in Vercel
2. Set production environment variables
3. Update OAuth redirect URIs to production domain
4. Update Supabase site URL
5. Configure production webhooks
6. Set up custom domain
7. Enable production monitoring

---

## Support

If you encounter issues:

1. Check Vercel deployment logs
2. Check Supabase logs
3. Review error messages
4. Consult `COMPLETE_DEPLOYMENT_CHECKLIST.md`
5. Review module-specific README files

---

## Summary

✅ **Ready to Deploy**: All 10 modules implemented
✅ **Database**: Migrations ready
✅ **Environment**: Variables documented
✅ **Webhooks**: Configuration guide provided
✅ **OAuth**: Setup instructions included

**Estimated Time**: 2-4 hours for complete setup

**Confidence Level**: High - All core functionality ready

🚀 **Let's deploy!**

