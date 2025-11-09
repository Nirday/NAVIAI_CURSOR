# Module 6: Communication & Automation Hub

The **Communication & Automation Hub** enables businesses to send email and SMS broadcasts, run A/B tests, and create automation sequences. It integrates with the Contact Hub to target specific audiences.

## Overview

This module provides:
- **Email/SMS Broadcasts**: One-time campaigns with A/B testing
- **Automation Sequences**: Multi-step automated workflows
- **A/B Testing**: Subject line testing with winner determination
- **Performance Analytics**: Track opens, clicks, and conversions
- **Contact Integration**: Seamless integration with Contact Hub

## Key Components

### `composer.ts`
AI-powered content generation:
- `generateBroadcastContent(options: ContentOptions)`: Generates 3 subject lines and body
- Includes primary CTA in body
- Manual fallback if AI fails

### `engine.ts`
Broadcast and automation engine:
- `runBroadcastScheduler()`: Processes scheduled broadcasts (runs every 1 minute)
- `processBroadcast(broadcast: Broadcast)`: Handles broadcast sending
- `initializeAbTest()`: Sets up A/B test (20% test, 50/50 split)
- `runAbTestWinnerCheck()`: Determines winner and sends final batch
- `runAutomationEngine()`: Processes automation sequences

### `contact_adapter.ts`
Contact Hub integration:
- `fetchContactsForEmailBroadcast(userId: string, tags?: string[])`: Fetches email contacts
- `fetchContactsForSmsBroadcast(userId: string, tags?: string[])`: Fetches SMS contacts
- Filters by channel (email/phone) and tags (OR logic)

### `email_service.ts`
Email sending via Resend:
- `sendEmail(to: string, subject: string, html: string)`: Sends email

### `sms_service.ts`
SMS sending via Twilio:
- `sendSMS(to: string, message: string)`: Sends SMS

### `system_emails.ts`
Transactional emails:
- `sendTrialEndingEmail(userId: string)`: Trial ending notification
- `sendPaymentFailedEmail(userId: string)`: Payment failure notification

## Database Tables

### `broadcasts`
One-time campaigns:
- `id`: UUID primary key
- `user_id`: References auth.users
- `audience_id`: Audience identifier (tags or contact IDs)
- `channel`: 'email' | 'sms'
- `type`: 'standard' | 'review_request'
- `content`: Array of content versions (JSONB)
- `ab_test_config`: A/B test configuration (JSONB, nullable)
- `status`: 'draft' | 'scheduled' | 'testing' | 'sending' | 'sent' | 'failed'
- `scheduled_at`: When to send
- `sent_at`: When actually sent
- `total_recipients`: Total audience size
- `sent_count`: Successfully sent
- `failed_count`: Failed sends
- `open_count`: Email opens (email only)
- `click_count`: Link clicks

### `automation_sequences`
Automation workflows:
- `id`: UUID primary key
- `user_id`: References auth.users
- `name`: Sequence name
- `trigger_type`: 'new_lead_added' (V1)
- `is_enabled`: Boolean activation status

### `automation_steps`
Steps in automation sequences:
- `id`: UUID primary key
- `sequence_id`: References automation_sequences
- `order`: Step order (0-based)
- `action`: 'send_email' | 'send_sms' | 'wait'
- `subject`: Email subject (for send_email)
- `body`: Message body
- `wait_days`: Days to wait (for wait action)

### `automation_contact_progress`
Tracks contact progress through sequences:
- `id`: UUID primary key
- `user_id`: References auth.users
- `contact_id`: References contacts
- `sequence_id`: References automation_sequences
- `current_step_id`: Current step
- `next_step_at`: When to execute next step
- `completed_at`: When sequence completed

## A/B Testing

- **Test Size**: Fixed 20% of audience
- **Split**: 50/50 between variants A and B
- **What's Tested**: Subject lines only (same body for both)
- **Winner Determination**: Based on open rates (V1 placeholder)
- **Final Send**: Remaining 80% receives winning variant

## Automation Triggers

V1 supports only:
- `new_lead_added`: Triggered when new contact is created

## API Endpoints

- `POST /api/communication/broadcasts`: Create broadcast
- `GET /api/communication/broadcasts`: List broadcasts
- `POST /api/communication/generate-content`: Generate AI content
- `POST /api/communication/automation`: Create automation sequence
- `GET /api/communication/analytics/broadcasts`: Broadcast analytics
- `GET /api/communication/analytics/automations`: Automation analytics

## Integration Points

### Module 7 (Contact Hub)
Reads contacts for audience targeting.

### Module 8 (Reputation Hub)
Handles `review_request` type broadcasts.

### Module 9 (Billing Hub)
Sends transactional emails for billing events.

## Scheduled Jobs

- `runBroadcastScheduler()`: Every 1 minute
- `runAbTestWinnerCheck()`: Dynamically scheduled after test duration
- `runAutomationEngine()`: Frequently (every 1 minute)

## Usage Example

```typescript
import { generateBroadcastContent } from '@/libs/communication-hub/src/composer'

const content = await generateBroadcastContent({
  userId: 'user-123',
  topic: 'New Service Launch',
  primaryCta: 'Learn More'
})
// Returns: { subjectLines: [...], body: '...' }
```

