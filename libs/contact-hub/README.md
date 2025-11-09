# Module 7: Lead & Contact Hub

The **Lead & Contact Hub** provides unified contact management, omnichannel lead ingestion, and AI-powered interaction summaries. It serves as the central CRM for all customer interactions.

## Overview

This module provides:
- **Contact Management**: Unified contact list with search and filtering
- **Omnichannel Lead Ingestion**: Capture leads from any channel
- **Activity Timeline**: Complete interaction history
- **AI Interaction Summary**: AI-generated contact summaries
- **Tag Management**: Flexible tagging system
- **Unsubscribe Management**: Email/SMS unsubscribe handling

## Key Components

### `lead_ingestion.ts`
Lead capture:
- `ingestNewLead(userId: string, leadData: LeadData)`: Creates new contact
- De-duplicates by email
- Adds `'new_lead'` tag
- Creates `lead_capture` activity event
- Dispatches `NEW_LEAD_ADDED` to Action Queue

### `ai_summary.ts`
AI-powered summaries:
- `generateInteractionSummary(contactId: string)`: Generates AI summary
- Analyzes last 20 activity events
- Highlights billing status and recent engagement

## Database Tables

### `contacts`
Contact information:
- `id`: UUID primary key
- `user_id`: References auth.users
- `first_name`: First name
- `last_name`: Last name
- `email`: Email address
- `phone`: Phone number
- `tags`: Array of tags (TEXT[])
- `is_unsubscribed`: Boolean unsubscribe status
- `created_at`: Contact creation timestamp
- `updated_at`: Last update timestamp

### `activity_events`
Interaction history:
- `id`: UUID primary key
- `user_id`: References auth.users
- `contact_id`: References contacts (nullable)
- `event_type`: Event type (see below)
- `content`: Human-readable summary
- `created_at`: Event timestamp

## Event Types

- `lead_capture`: New lead captured
- `note`: Manual note added
- `email_sent`: Email sent to contact
- `email_opened`: Email opened
- `link_clicked`: Link clicked in email
- `sms_sent`: SMS sent to contact
- `sms_opened`: SMS opened
- `billing_status_change`: Subscription status changed
- `review_request`: Review request sent
- `negative_feedback`: Negative feedback received

## System Tags

Billing-related tags (system-managed):
- `active_customer`: Active subscription
- `trial_user`: Trial subscription
- `canceled_customer`: Canceled subscription
- `new_lead`: Newly captured lead
- `Negative_Feedback`: Received negative feedback

## API Endpoints

- `GET /api/contacts`: List contacts (searchable, sortable)
- `POST /api/contacts`: Create manual contact
- `GET /api/contacts/[id]`: Get contact details
- `PUT /api/contacts/[id]`: Update contact
- `POST /api/contacts/[id]/tags`: Manage tags
- `POST /api/contacts/[id]/send-message`: Send email/SMS
- `POST /api/contacts/[id]/ai-summary`: Generate AI summary
- `POST /api/leads/submit`: Submit new lead

## Integration Points

### Module 6 (Communication Hub)
Provides contact data for broadcasts and automations.

### Module 8 (Reputation Hub)
Receives negative feedback via `addFeedbackActivity()`.

### Module 9 (Billing Hub)
Updates billing tags based on subscription status.

## Usage Example

```typescript
import { ingestNewLead } from '@/libs/contact-hub/src/lead_ingestion'

await ingestNewLead('user-123', {
  email: 'customer@example.com',
  firstName: 'John',
  lastName: 'Doe',
  source: 'website_form'
})
```

