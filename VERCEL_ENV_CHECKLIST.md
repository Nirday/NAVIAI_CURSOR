# 🔐 VERCEL ENVIRONMENT VARIABLES CHECKLIST

**Project**: Navi AI Platform  
**Date**: November 9, 2025  
**Status**: Ready for Vercel Dashboard Configuration

---

## 📋 HOW TO USE THIS CHECKLIST

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add each variable below with the specified value
3. Set the environment for each: **Production**, **Preview**, and **Development** (or as noted)
4. Variables marked with 🔴 are **CRITICAL** - deployment will fail without them
5. Variables marked with 🟡 are **HIGH PRIORITY** - features will be broken without them
6. Variables marked with 🟢 are **OPTIONAL** - can be added later

---

## 🔴 CRITICAL VARIABLES (Required for Deployment)

### 1. **ENCRYPTION_KEY** 🔴
- **Purpose**: Encrypts OAuth tokens (Facebook, Google, Twitter, etc.) at rest in database
- **Type**: Secret (256-bit random string)
- **How to generate**:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **Example**: `a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2`
- **Environment**: Production, Preview, Development

---

### 2. **CRON_SECRET** 🔴
- **Purpose**: Secures cron job API endpoints from unauthorized access
- **Type**: Secret (UUID or random string)
- **How to generate**:
  ```bash
  node -e "console.log(require('crypto').randomUUID())"
  ```
- **Example**: `550e8400-e29b-41d4-a716-446655440000`
- **Environment**: Production, Preview, Development

---

### 3. **REVIEW_CAMPAIGN_SECRET** 🔴
- **Purpose**: Secures review campaign links (for review gating feature)
- **Type**: Secret (UUID or random string)
- **How to generate**: Same as CRON_SECRET
- **Example**: `660e9511-f30c-52e5-b827-557766551111`
- **Environment**: Production, Preview, Development

---

### 4. **RESEND_FROM_EMAIL** 🔴
- **Purpose**: "From" address for all transactional emails (approvals, notifications, etc.)
- **Type**: Email address (must be verified in Resend dashboard)
- **Value**: `noreply@yourdomain.com` (or your verified domain)
- **Example**: `noreply@naviai.com`
- **Environment**: Production, Preview, Development

---

### 5. **ADMIN_EMAIL** 🔴
- **Purpose**: Admin notification recipient email address
- **Type**: Email address
- **Value**: Your admin email
- **Example**: `admin@naviai.com`
- **Environment**: Production, Preview, Development

---

### 6. **EMAIL_DOMAIN** 🔴
- **Purpose**: Base domain for email reply-to addresses (e.g., reviews+TOKEN@yourdomain.com)
- **Type**: Domain name (without protocol)
- **Value**: Your primary domain
- **Example**: `naviai.com`
- **Environment**: Production, Preview, Development

---

### 7. **PLATFORM_NAME** 🔴
- **Purpose**: Platform name displayed in email templates and UI
- **Type**: String
- **Value**: Your platform's brand name
- **Example**: `Navi AI`
- **Environment**: Production, Preview, Development

---

### 8. **NEXT_PUBLIC_PUBLISH_BASE_DOMAIN** 🔴
- **Purpose**: Base domain for multi-tenant website publishing (e.g., clientname.yourdomain.app)
- **Type**: Domain name (without protocol)
- **Value**: Your website publishing subdomain
- **Example**: `naviai.app` (results in client1.naviai.app, client2.naviai.app, etc.)
- **Environment**: Production, Preview, Development
- **Note**: This is a PUBLIC variable (visible in browser)

---

## 🟡 HIGH PRIORITY VARIABLES (Features Broken Without These)

### 9. **SERP_API_KEY** 🟡
- **Purpose**: SEO rank tracking (Module 4)
- **Type**: API Key
- **Where to get**: [serpapi.com](https://serpapi.com)
- **Environment**: Production, Preview

---

### 10. **TWITTER_CLIENT_ID** 🟡
- **Purpose**: Twitter/X OAuth integration (Module 5)
- **Type**: OAuth Client ID
- **Where to get**: [developer.twitter.com](https://developer.twitter.com)
- **Environment**: Production, Preview, Development

---

### 11. **TWITTER_CLIENT_SECRET** 🟡
- **Purpose**: Twitter/X OAuth integration (Module 5)
- **Type**: Secret
- **Where to get**: [developer.twitter.com](https://developer.twitter.com)
- **Environment**: Production, Preview, Development

---

### 12. **FACEBOOK_WEBHOOK_VERIFY_TOKEN** 🟡
- **Purpose**: Verifies Facebook webhook requests (Module 5)
- **Type**: Secret (random string you create)
- **How to generate**: Any random string (e.g., UUID)
- **Example**: `fb_webhook_770e9511f30c`
- **Environment**: Production, Preview
- **Note**: Must match the token you configure in Facebook App Dashboard

---

### 13. **INSTAGRAM_WEBHOOK_VERIFY_TOKEN** 🟡
- **Purpose**: Verifies Instagram webhook requests (Module 5)
- **Type**: Secret (random string you create)
- **How to generate**: Any random string (e.g., UUID)
- **Example**: `ig_webhook_880e0622g41d`
- **Environment**: Production, Preview
- **Note**: Must match the token you configure in Instagram Business API

---

### 14. **TWILIO_PHONE_NUMBER_POOL** 🟡
- **Purpose**: Advanced phone number provisioning (V1.5 Call Tracking)
- **Type**: JSON array of phone numbers
- **Format**: `["+15551234567", "+15559876543"]`
- **Environment**: Production, Preview
- **Note**: Optional if using single provisioned numbers per user

---

### 15. **NEXT_PUBLIC_PLAUSIBLE_DOMAIN** 🟡
- **Purpose**: Plausible Analytics domain (if using Plausible for website analytics)
- **Type**: Domain name
- **Example**: `naviai.com`
- **Environment**: Production, Preview
- **Note**: This is a PUBLIC variable (visible in browser)

---

## 🟢 OPTIONAL VARIABLES (For Advanced Features)

### 16. **SENTRY_API_KEY** 🟢
- **Purpose**: Error tracking with Sentry (Module 10)
- **Type**: API Key
- **Where to get**: [sentry.io](https://sentry.io)
- **Environment**: Production, Preview

---

### 17. **SENTRY_ORG** 🟢
- **Purpose**: Sentry organization identifier
- **Type**: String (your Sentry org slug)
- **Where to get**: Sentry dashboard
- **Environment**: Production, Preview

---

### 18. **SENTRY_PROJECT** 🟢
- **Purpose**: Sentry project identifier
- **Type**: String (your Sentry project slug)
- **Where to get**: Sentry dashboard
- **Environment**: Production, Preview

---

### 19. **NEXT_PUBLIC_USE_MOCK_DATA** 🟢
- **Purpose**: Feature flag to use mock data (for demos/testing)
- **Type**: Boolean string
- **Value**: `false` (for production), `true` (for development/demos)
- **Environment**: Development only
- **Note**: This is a PUBLIC variable (visible in browser)

---

## ✅ ALREADY CONFIGURED (Verify These Are Set)

These variables should already exist in your .env.local and must be added to Vercel:

1. **NEXT_PUBLIC_SUPABASE_URL** ✅
   - Your Supabase project URL
   - Environment: Production, Preview, Development
   - Public variable

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY** ✅
   - Your Supabase anonymous/public key
   - Environment: Production, Preview, Development
   - Public variable

3. **SUPABASE_SERVICE_ROLE_KEY** ✅
   - Your Supabase service role key (NEVER expose to client)
   - Environment: Production, Preview, Development
   - Secret

4. **NEXT_PUBLIC_APP_URL** ✅
   - Your application's public URL
   - Production: `https://your-app.vercel.app` or your custom domain
   - Preview: `https://your-app-git-branch-user.vercel.app`
   - Development: `http://localhost:3000`
   - Public variable

5. **OPENAI_API_KEY** ✅
   - Your OpenAI API key for GPT-4, DALL-E 3, Whisper
   - Environment: Production, Preview, Development
   - Secret

6. **RESEND_API_KEY** ✅
   - Your Resend API key for transactional emails
   - Environment: Production, Preview, Development
   - Secret

7. **STRIPE_SECRET_KEY** ✅
   - Your Stripe secret key
   - Environment: Production, Preview, Development
   - Secret

8. **STRIPE_WEBHOOK_SECRET** ✅
   - Your Stripe webhook signing secret
   - Environment: Production, Preview, Development
   - Secret
   - Note: Different for each environment

9. **GOOGLE_CLIENT_ID** ✅
   - Google OAuth client ID
   - Environment: Production, Preview, Development

10. **GOOGLE_CLIENT_SECRET** ✅
    - Google OAuth client secret
    - Environment: Production, Preview, Development

11. **FACEBOOK_APP_ID** ✅
    - Facebook App ID
    - Environment: Production, Preview, Development

12. **FACEBOOK_APP_SECRET** ✅
    - Facebook App Secret
    - Environment: Production, Preview, Development

13. **LINKEDIN_CLIENT_ID** ✅
    - LinkedIn OAuth client ID
    - Environment: Production, Preview, Development

14. **LINKEDIN_CLIENT_SECRET** ✅
    - LinkedIn OAuth client secret
    - Environment: Production, Preview, Development

15. **TWILIO_ACCOUNT_SID** ✅
    - Twilio Account SID (for V1.5 call tracking)
    - Environment: Production, Preview, Development

16. **TWILIO_AUTH_TOKEN** ✅
    - Twilio Auth Token
    - Environment: Production, Preview, Development

17. **TWILIO_PHONE_NUMBER** ✅
    - Your primary Twilio phone number
    - Format: `+15551234567`
    - Environment: Production, Preview, Development

18. **PLAUSIBLE_API_KEY** ✅
    - Plausible Analytics API key (if using)
    - Environment: Production, Preview

---

## 📝 QUICK REFERENCE: GENERATE ALL SECRETS

Run these commands to generate all required secret values:

```bash
# ENCRYPTION_KEY (256-bit)
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# CRON_SECRET (UUID)
node -e "console.log('CRON_SECRET=' + require('crypto').randomUUID())"

# REVIEW_CAMPAIGN_SECRET (UUID)
node -e "console.log('REVIEW_CAMPAIGN_SECRET=' + require('crypto').randomUUID())"

# FACEBOOK_WEBHOOK_VERIFY_TOKEN (random string)
node -e "console.log('FACEBOOK_WEBHOOK_VERIFY_TOKEN=fb_' + require('crypto').randomBytes(8).toString('hex'))"

# INSTAGRAM_WEBHOOK_VERIFY_TOKEN (random string)
node -e "console.log('INSTAGRAM_WEBHOOK_VERIFY_TOKEN=ig_' + require('crypto').randomBytes(8).toString('hex'))"
```

---

## 🎯 DEPLOYMENT PRIORITY

**Before first deployment**, you MUST add:
- All 🔴 CRITICAL variables (8 total)
- All ✅ ALREADY CONFIGURED variables (18 total)

**After initial deployment**, add as needed:
- 🟡 HIGH PRIORITY variables (for specific integrations)
- 🟢 OPTIONAL variables (for advanced features)

---

## ⚠️ IMPORTANT NOTES

1. **Environment-Specific Values**: Some variables (like `NEXT_PUBLIC_APP_URL` and `STRIPE_WEBHOOK_SECRET`) need different values for Production vs Preview vs Development.

2. **Public Variables**: Any variable starting with `NEXT_PUBLIC_` is exposed to the browser. Never put secrets in these.

3. **Stripe Webhook Secret**: You'll get different webhook secrets for each environment. Configure each webhook endpoint in the Stripe Dashboard.

4. **Domain Configuration**: Make sure `NEXT_PUBLIC_PUBLISH_BASE_DOMAIN` is properly configured with DNS wildcard records (*.yourdomain.app → Vercel).

5. **OAuth Callback URLs**: Update all OAuth provider dashboards with your Vercel deployment URLs:
   - Google: `https://your-app.vercel.app/api/auth/callback/google`
   - Facebook: `https://your-app.vercel.app/api/auth/callback/facebook`
   - LinkedIn: `https://your-app.vercel.app/api/auth/callback/linkedin`
   - Twitter: `https://your-app.vercel.app/api/auth/callback/twitter`

6. **Feature Flags**: Consider using `NEXT_PUBLIC_USE_MOCK_DATA=false` in production to ensure real data is always used.

---

## ✅ VERIFICATION

After adding all variables to Vercel:

1. Go to **Deployments** → Redeploy the latest commit
2. Check the build logs for any "undefined" environment variable errors
3. Test each integration (OAuth, emails, Stripe, etc.)
4. Monitor error logs for missing configuration

---

**End of Checklist**  
*Last Updated: November 9, 2025*

