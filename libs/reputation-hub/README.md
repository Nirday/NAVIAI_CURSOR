# Module 8: AI Reputation Management Hub

The **AI Reputation Management Hub** automates review management across Google, Yelp, and Facebook. It fetches reviews, generates AI responses, manages approval workflows, and helps showcase positive reviews.

## Overview

This module provides:
- **Automated Review Fetching**: Fetches reviews from Google, Yelp, Facebook
- **AI Reply Assistant**: Generates context-aware responses
- **Approval Workflow**: Email/SMS approval system
- **Response Publishing**: Automated publishing to review platforms
- **Review Showcasing**: Add reviews to website and social media
- **Sentiment Analysis**: AI-powered theme identification
- **Review Gating**: Filter feedback before public reviews

## Key Components

### `review_fetcher.ts`
Automated review fetching:
- `runReviewFetcher()`: Runs every 4 hours
- Fetches from Google Business Profile API, Yelp Fusion API, Facebook Graph API
- De-duplicates by `sourceId` + `reviewId`
- Marks sources inactive on auth errors

### `reply_assistant.ts`
AI response generation:
- `generateAndRequestApproval(reviewId: string)`: Generates response and sends approval
- Handles negative reviews (≤3 stars) with apology + contact info
- Handles positive reviews (≥4 stars) with simple thank you
- Sends email and SMS notifications with approval links

### `response_publisher.ts`
Publishing automation:
- `runResponsePublisher()`: Runs every 5 minutes
- Publishes approved replies to Google and Facebook
- Yelp replies not supported (sets status to 'response_failed')
- Retry logic for transient errors (max 3 attempts)

### `review_campaign.ts`
Review gating campaigns:
- `generateFeedbackUrl(userId: string, contactId: string, platform: string)`: Generates secure feedback URL
- Integrates with Communication Hub for campaign sending

### `showcase_handler.ts`
Review showcasing:
- `triggerShowcaseAction(reviewId: string, action: 'website' | 'social')`: Triggers showcase actions
- Dispatches `ADD_WEBSITE_TESTIMONIAL` or `CREATE_SOCIAL_POST_DRAFT`

### `analyzer.ts`
Sentiment analysis:
- `runReputationAnalysis()`: Daily job to analyze reviews
- Identifies Top 5 Positive and Top 5 Negative themes
- Flags showcase-worthy reviews (5 stars, 20+ words, enthusiastic)

## Database Tables

### `review_sources`
Review platform connections:
- `id`: UUID primary key
- `user_id`: References auth.users
- `platform`: 'google' | 'yelp' | 'facebook'
- `platform_account_id`: Platform-specific account ID
- `status`: 'active' | 'inactive' | 'expired'
- `last_checked_at`: Last fetch timestamp

### `reviews`
Individual reviews:
- `id`: UUID primary key
- `user_id`: References auth.users
- `source_id`: References review_sources
- `platform_review_id`: Platform-specific review ID
- `reviewer_name`: Reviewer name
- `reviewer_avatar_url`: Avatar URL
- `rating`: 1-5 stars
- `content`: Review text
- `review_url`: Link to original review
- `published_at`: When review was published
- `status`: Review status (see below)
- `suggested_response_content`: AI-generated response
- `approval_token`: Single-use approval token
- `approval_token_expires_at`: Token expiration
- `response_retry_count`: Retry attempts
- `response_error_message`: Error message if failed
- `is_good_for_showcasing`: Boolean showcase flag

### `review_responses`
Published responses:
- `id`: UUID primary key
- `review_id`: References reviews
- `response_id`: Platform response ID
- `content`: Response content
- `responded_at`: When response was published
- `platform_response_id`: Platform-specific ID

### `reputation_settings`
User reputation settings:
- `id`: UUID primary key
- `user_id`: References auth.users
- `review_request_template`: Email/SMS template
- `direct_review_links`: Array of platform links (JSONB)

### `reputation_themes`
AI-identified themes:
- `id`: UUID primary key
- `user_id`: References auth.users
- `theme_type`: 'positive' | 'negative'
- `theme_text`: Theme description
- `order`: Importance order (1-5)
- `created_at`: Analysis timestamp

## Review Statuses

- `needs_response`: New review requiring response
- `response_pending_approval`: Waiting for user approval
- `response_changes_requested`: User requested changes
- `response_approved`: Approved, ready to publish
- `response_sent`: Successfully published
- `response_failed`: Publishing failed

## API Endpoints

- `GET /api/reputation/reviews`: List reviews (filterable)
- `POST /api/reputation/reviews/[id]/suggest`: Generate AI response
- `POST /api/reputation/reviews/[id]/reply`: Manual reply
- `POST /api/reputation/approve`: Approve response
- `POST /api/reputation/request-changes`: Request changes
- `POST /api/reputation/reviews/[id]/showcase`: Showcase review
- `GET /api/reputation/dashboard`: Dashboard metrics
- `POST /api/reputation/campaigns`: Create review campaign

## Integration Points

### Module 2 (Website Builder)
Receives `ADD_WEBSITE_TESTIMONIAL` commands.

### Module 5 (Social Hub)
Receives `CREATE_SOCIAL_POST_DRAFT` commands.

### Module 6 (Communication Hub)
Sends review request campaigns.

### Module 7 (Contact Hub)
Calls `addFeedbackActivity()` for negative feedback.

## Scheduled Jobs

- `runReviewFetcher()`: Every 4 hours
- `runResponsePublisher()`: Every 5 minutes
- `runReputationAnalysis()`: Daily (6 AM UTC)

## Usage Example

```typescript
import { generateAndRequestApproval } from '@/libs/reputation-hub/src/reply_assistant'

await generateAndRequestApproval('review-123')
// Generates response and sends approval notification
```

