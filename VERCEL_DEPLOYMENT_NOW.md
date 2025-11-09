# 🚀 Deploy to Vercel - Right Now!

Your code is now on GitHub: https://github.com/Nirday/NAVIAI_CURSOR

## Step 1: Go to Vercel (2 minutes)

1. **Open**: https://vercel.com
2. **Sign in** with GitHub (use the same GitHub account: `Nirday`)
3. Click **"Add New Project"** (or **"Import Project"**)

## Step 2: Import Your Repository (1 minute)

1. Find **"NAVIAI_CURSOR"** in the list
2. Click **"Import"**

## Step 3: Configure Project (1 minute)

**Vercel will auto-detect:**
- Framework: Next.js ✅
- Root Directory: `.` (leave as is)
- Build Command: `npm run build` ✅
- Output Directory: `.next` ✅

**Click "Deploy"** (we'll add environment variables after)

## Step 4: Wait for First Deployment (5-10 minutes)

- Vercel will build your project
- You'll get a URL like: `https://naviai-cursor-abc123.vercel.app`
- **Copy this URL** - you'll need it!

## Step 5: Add Environment Variables (10 minutes)

### 5.1 Go to Project Settings

1. Click on your project name
2. Go to **Settings** → **Environment Variables**

### 5.2 Add These Variables

**For EACH variable:**
1. Click **"Add New"**
2. Enter **Key** and **Value**
3. Select: **Production**, **Preview**, **Development**
4. Click **"Save"**

### 5.3 Required Variables (Copy from ENV_VARIABLES_TEMPLATE.md)

**Core Services:**
```
NEXT_PUBLIC_SUPABASE_URL=https://wmhkfuxjipemqnoorcgy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtaGtmdXhqaXBlbXFub29yY2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NTQ2OTAsImV4cCI6MjA3ODEzMDY5MH0.j3QRezwl8wuAglvKgj39UxhEsEKoX7bMxWGOi39aNII
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtaGtmdXhqaXBlbXFub29yY2d5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjU1NDY5MCwiZXhwIjoyMDc4MTMwNjkwfQ.3hf80QSILu8iUkSKxUI4NRvivjzg_9VD2Xi8coFWnx0
SUPABASE_DB_PASSWORD=Highlands@891
```

**AI Services:**
```
OPENAI_API_KEY=your_openai_api_key_here
```

**Email & SMS:**
```
RESEND_API_KEY=your_resend_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

**Payments:**
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

**OAuth (Optional):**
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**App Config:**
```
NEXT_PUBLIC_APP_URL=https://your-actual-vercel-url.vercel.app
NEXT_PUBLIC_PUBLISH_BASE_DOMAIN=naviai.local
NODE_ENV=production
```

**Important**: Update `NEXT_PUBLIC_APP_URL` with your actual Vercel URL after deployment!

## Step 6: Redeploy (2 minutes)

1. Go to **Deployments** tab
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**
4. Wait for build to complete

## Step 7: Test Your Deployment (5 minutes)

1. Visit your Vercel URL
2. Test `/dashboard` - Chat interface
3. Test `/dashboard/website` - Website editor
4. Check logs for any errors

---

## 🎉 You're Live!

Your preview environment is now deployed!

**Next Steps:**
- Configure webhooks (Stripe, Twilio)
- Update OAuth redirect URIs
- Test all modules
- Monitor for errors

---

## Quick Links

- **GitHub Repo**: https://github.com/Nirday/NAVIAI_CURSOR
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Full Guide**: See `PREVIEW_DEPLOYMENT_GUIDE.md`

