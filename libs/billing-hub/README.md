# Module 9: Billing & Subscription Hub

The **Billing & Subscription Hub** manages subscriptions, feature gating, and billing operations through Stripe integration. It provides three-tier pricing plans with feature limits.

## Overview

This module provides:
- **Stripe Integration**: Checkout, webhooks, and Customer Portal
- **Three-Tier Plans**: Starter, Growth, Pro with different features
- **Feature Gating**: Access control based on subscription
- **Trial Management**: Trial period handling
- **Dunning Emails**: Trial ending and payment failure notifications
- **AI Billing Assistant**: Answers billing questions via chat

## Key Components

### `checkout.ts`
Stripe Checkout integration:
- `createCheckoutSession(userId: string, priceId: string, isSubscription: boolean)`: Creates checkout session
- Handles both subscriptions and one-time payments
- Trial period logic (no trial if existing customer)

### `data.ts`
Subscription data access:
- `getSubscription(userId: string)`: Get user's subscription
- `upsertSubscription()`: Create or update subscription
- `createOneTimePayment()`: Record one-time payment

### `feature_gating.ts`
Access control:
- `hasFeatureAccess(userId: string, feature: string)`: Check feature access
- `isWithinLimit(userId: string, limitType: string, currentValue: number)`: Check limits
- `getUserLimit(userId: string, limitType: string)`: Get limit value
- `hasActiveSubscription(userId: string)`: Check active subscription
- `getSubscriptionStatus(userId: string)`: Get subscription status
- `getUserPlanName(userId: string)`: Get plan name
- `getUserFeatures(userId: string)`: Get enabled features

### `ai_assistant.ts`
Billing question handling:
- `handleBillingQuestion(userId: string, question: string)`: Answers billing questions
- Integrated into Module 1 orchestrator

### `config/entitlements.ts`
Plan entitlements configuration:
- `ENTITLEMENTS`: Maps `stripePriceId` to features and limits
- Three plans: Starter, Growth, Pro

## Plan Details

### Starter Plan
- **Features**: Website, Contacts, Reputation
- **Limits**: 500 contacts, 20 reviews/month, 1 social connection

### Growth Plan
- **Features**: Website, Contacts, Reputation, Content, Social
- **Limits**: 1,500 contacts, 50 reviews/month, 3 social connections, 4 blog posts/month

### Pro Plan
- **Features**: All modules (Website, Contacts, Reputation, Content, Social, SEO, Communication)
- **Limits**: 5,000 contacts, unlimited reviews, 5 social connections, 8 blog posts/month, 10 SEO keywords, 3 competitors

## Database Tables

### `subscriptions`
Subscription records:
- `id`: UUID primary key
- `user_id`: References auth.users
- `stripe_customer_id`: Stripe customer ID
- `stripe_subscription_id`: Stripe subscription ID
- `stripe_price_id`: Stripe price ID (links to plan)
- `stripe_current_period_end`: Current period end date
- `status`: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired'
- `trial_ends_at`: Trial end date (nullable)
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### `one_time_payments`
One-time purchases:
- `id`: UUID primary key
- `user_id`: References auth.users
- `stripe_payment_intent_id`: Stripe payment intent ID
- `amount`: Payment amount
- `currency`: Currency code
- `product_name`: Product name
- `created_at`: Payment timestamp

## Stripe Webhook Events

Handled events:
- `checkout.session.completed`: Initial subscription or payment
- `customer.subscription.created`: New subscription
- `customer.subscription.updated`: Subscription changes
- `customer.subscription.deleted`: Cancellation
- `invoice.payment_succeeded`: Successful payment
- `invoice.payment_failed`: Payment failure
- `customer.subscription.trial_will_end`: Trial ending soon

## API Endpoints

- `GET /api/billing/subscription`: Get user's subscription
- `POST /api/billing/create-checkout-session`: Create checkout session
- `POST /api/billing/portal`: Create Customer Portal session
- `GET /api/billing/products`: List one-time products
- `POST /api/billing/webhook`: Stripe webhook handler

## Integration Points

### Module 1 (Chat Core)
Handles `BILLING_QUESTION` intent.

### Module 7 (Contact Hub)
Updates billing tags (`active_customer`, `trial_user`, `canceled_customer`) based on subscription status.

### Module 6 (Communication Hub)
Sends transactional emails for trial ending and payment failures.

## Feature Gating

All modules check feature access before allowing actions:
```typescript
import { hasFeatureAccess, isWithinLimit } from '@/libs/billing-hub/src/feature_gating'

if (!await hasFeatureAccess(userId, 'MODULE_SEO')) {
  throw new Error('SEO features require Pro plan')
}

if (!await isWithinLimit(userId, 'maxContacts', currentContactCount)) {
  throw new Error('Contact limit reached')
}
```

## Usage Example

```typescript
import { createCheckoutSession } from '@/libs/billing-hub/src/checkout'

const session = await createCheckoutSession('user-123', 'price_abc123', true)
// Returns Stripe Checkout session URL
```

