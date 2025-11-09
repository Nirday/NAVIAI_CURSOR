# Environment Variables for Vercel Deployment

Copy these into Vercel → Project Settings → Environment Variables

## Core Services (Required)

```
NEXT_PUBLIC_SUPABASE_URL=https://wmhkfuxjipemqnoorcgy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtaGtmdXhqaXBlbXFub29yY2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NTQ2OTAsImV4cCI6MjA3ODEzMDY5MH0.j3QRezwl8wuAglvKgj39UxhEsEKoX7bMxWGOi39aNII
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtaGtmdXhqaXBlbXFub29yY2d5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjU1NDY5MCwiZXhwIjoyMDc4MTMwNjkwfQ.3hf80QSILu8iUkSKxUI4NRvivjzg_9VD2Xi8coFWnx0
SUPABASE_DB_PASSWORD=Highlands@891
```

## AI Services (Required)

```
OPENAI_API_KEY=your_openai_api_key_here
```

## Email & SMS (Required)

```
RESEND_API_KEY=your_resend_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

## Payments (Required for Billing Module)

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

## OAuth (Optional - for specific features)

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
```

## App Configuration

```
NEXT_PUBLIC_APP_URL=https://your-preview-domain.vercel.app
NEXT_PUBLIC_PUBLISH_BASE_DOMAIN=naviai.local
NODE_ENV=production
```

## Important Notes

1. **NEXT_PUBLIC_APP_URL**: Update this AFTER you get your Vercel deployment URL
2. **STRIPE_WEBHOOK_SECRET**: Get this AFTER setting up Stripe webhook
3. Set these for **Production**, **Preview**, and **Development** environments in Vercel
4. Replace `your_*` placeholders with actual values

