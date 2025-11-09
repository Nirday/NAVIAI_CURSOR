# Step-by-Step Vercel Deployment

Follow these steps in order to deploy Navi AI to Vercel.

## Step 1: Push Code to GitHub (5 minutes)

### 1.1 Create GitHub Repository (if not exists)

1. Go to https://github.com/new
2. Repository name: `navi-ai` (or your preferred name)
3. Set to **Private** (recommended) or **Public**
4. **Don't** initialize with README (we already have one)
5. Click **"Create repository"**

### 1.2 Connect Local Repository

```bash
cd /Users/rasheshmehta/Downloads/Navi_AI_Gemini/navi-ai

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/navi-ai.git

# Push code
git branch -M main
git push -u origin main
```

**If you get authentication errors**, use:
- GitHub Personal Access Token (Settings → Developer settings → Personal access tokens)
- Or use SSH: `git@github.com:YOUR_USERNAME/navi-ai.git`

---

## Step 2: Deploy to Vercel (10 minutes)

### 2.1 Sign Up / Login

1. Go to https://vercel.com
2. Click **"Sign Up"** or **"Log In"**
3. Sign in with **GitHub** (recommended)

### 2.2 Import Project

1. Click **"Add New Project"** (or **"Import Project"**)
2. Find your `navi-ai` repository
3. Click **"Import"**

### 2.3 Configure Project

**Framework Preset**: Next.js (should auto-detect)

**Root Directory**: 
- If your repo root is `navi-ai/`, set to: `./navi-ai`
- If repo root is the project root, leave as: `.`

**Build Settings** (should auto-detect):
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

**Click "Deploy"** (we'll add environment variables after)

---

## Step 3: Add Environment Variables (15 minutes)

### 3.1 Go to Project Settings

1. After deployment starts, click on your project
2. Go to **Settings** → **Environment Variables**

### 3.2 Add Variables

**For each environment variable:**

1. Click **"Add New"**
2. Enter **Key** (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
3. Enter **Value** (from your `.env.local` or `ENV_VARIABLES_TEMPLATE.md`)
4. Select environments: **Production**, **Preview**, **Development**
5. Click **"Save"**

### 3.3 Required Variables (Copy from ENV_VARIABLES_TEMPLATE.md)

Add these **one by one**:

**Core:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_PASSWORD`

**AI:**
- `OPENAI_API_KEY`

**Email/SMS:**
- `RESEND_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

**Payments:**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (get this after Step 4)

**OAuth (Optional):**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- etc.

**App Config:**
- `NEXT_PUBLIC_APP_URL` (update after deployment - use your Vercel URL)
- `NEXT_PUBLIC_PUBLISH_BASE_DOMAIN=naviai.local`
- `NODE_ENV=production`

### 3.4 Redeploy

After adding all variables:
1. Go to **Deployments** tab
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**
4. Wait for build to complete

---

## Step 4: Configure Webhooks (10 minutes)

### 4.1 Get Your Deployment URL

After deployment, you'll get a URL like:
`https://navi-ai-abc123.vercel.app`

**Copy this URL** - you'll need it for webhooks and OAuth.

### 4.2 Update NEXT_PUBLIC_APP_URL

1. Go to Vercel → Settings → Environment Variables
2. Find `NEXT_PUBLIC_APP_URL`
3. Update value to: `https://your-actual-vercel-url.vercel.app`
4. Save
5. Redeploy

### 4.3 Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Endpoint URL: `https://your-vercel-url.vercel.app/api/billing/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
5. Click **"Add endpoint"**
6. Copy the **Signing Secret**
7. Add to Vercel as `STRIPE_WEBHOOK_SECRET`
8. Redeploy

### 4.4 Twilio Webhook

1. Go to https://console.twilio.com
2. Navigate to **Phone Numbers** → Your number
3. Set **Voice & Fax** webhook:
   - URL: `https://your-vercel-url.vercel.app/api/call-tracking/webhook`
   - Method: POST
4. Set **Status Callback URL**:
   - URL: `https://your-vercel-url.vercel.app/api/call-tracking/webhook`
5. Save

---

## Step 5: Update OAuth Redirect URIs (10 minutes)

### 5.1 Google OAuth

1. Go to https://console.cloud.google.com
2. APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add **Authorized redirect URIs**:
   ```
   https://your-vercel-url.vercel.app/api/auth/callback/search-console
   https://your-vercel-url.vercel.app/api/auth/callback/reputation/google
   ```
5. Save

### 5.2 Facebook OAuth

1. Go to https://developers.facebook.com
2. Your App → Settings → Basic
3. Add **Valid OAuth Redirect URIs**:
   ```
   https://your-vercel-url.vercel.app/api/auth/callback/facebook
   https://your-vercel-url.vercel.app/api/auth/callback/reputation/facebook
   ```
4. Save

### 5.3 LinkedIn OAuth

1. Go to https://www.linkedin.com/developers/apps
2. Edit your app
3. Add **Authorized redirect URLs**:
   ```
   https://your-vercel-url.vercel.app/api/auth/callback/linkedin
   ```
4. Save

### 5.4 Twitter OAuth

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Edit your app
3. Add **Callback URL**:
   ```
   https://your-vercel-url.vercel.app/api/auth/callback/twitter
   ```
4. Save

---

## Step 6: Update Supabase Settings (5 minutes)

### 6.1 Update Site URL

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Set **Site URL**: `https://your-vercel-url.vercel.app`
5. Add **Redirect URLs**:
   ```
   https://your-vercel-url.vercel.app/**
   ```
6. Save

---

## Step 7: Test Deployment (10 minutes)

### 7.1 Basic Health Check

1. Visit: `https://your-vercel-url.vercel.app`
2. Should see your app or redirect to login

### 7.2 Test Core Features

- [ ] Visit `/dashboard` - Chat interface
- [ ] Visit `/dashboard/website` - Website editor
- [ ] Visit `/dashboard/billing` - Billing page
- [ ] Send a test chat message

### 7.3 Check Logs

1. In Vercel Dashboard → **Deployments**
2. Click on your deployment
3. View **Logs** tab
4. Check for errors

---

## Step 8: Troubleshooting

### Build Fails

**Check:**
- All environment variables set?
- Node.js version compatible?
- Dependencies installed?

**Fix:**
- Review build logs
- Check for missing environment variables
- Verify `package.json` is correct

### Runtime Errors

**Check:**
- API routes working?
- Database connection?
- Environment variables correct?

**Fix:**
- Check Vercel function logs
- Verify Supabase credentials
- Test API endpoints directly

### OAuth Not Working

**Check:**
- Redirect URIs match exactly?
- OAuth credentials correct?
- Environment variables set?

**Fix:**
- Verify redirect URIs in OAuth provider
- Check OAuth callback logs
- Test OAuth flow step by step

---

## ✅ Success Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] All environment variables added
- [ ] Deployment successful
- [ ] Webhooks configured
- [ ] OAuth redirect URIs updated
- [ ] Supabase site URL updated
- [ ] Basic functionality tested

---

## 🎉 You're Live!

Your preview environment is now deployed at:
`https://your-vercel-url.vercel.app`

**Next Steps:**
1. Test all modules thoroughly
2. Monitor for errors
3. Gather feedback
4. Prepare for production

---

## Need Help?

- Check `PREVIEW_DEPLOYMENT_GUIDE.md` for detailed instructions
- Review Vercel logs for errors
- Check Supabase logs for database issues
- Review module-specific README files

