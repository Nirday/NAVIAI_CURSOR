# Module 5: Social Media Growth Hub

The **Social Media Growth Hub** enables businesses to manage their social media presence across multiple platforms. It provides content scheduling, engagement management, analytics, and AI-powered content suggestions.

## Overview

This module provides:
- **Multi-Platform Support**: Facebook, Instagram, LinkedIn, Twitter/X
- **Content Calendar**: Visual calendar with Instagram grid preview
- **Post Composer**: AI-powered content creation with platform adaptation
- **Unified Inbox**: Centralized DMs and comments management
- **AI Reply Assistant**: Automated reply suggestions
- **Analytics Dashboard**: Post performance tracking
- **AI Idea Engine**: Weekly content idea generation

## Key Components

### `adapter.ts`
Platform-specific API abstraction:
- Handles OAuth token management
- Abstracts platform differences
- Provides unified interface for posting

### `idea_engine.ts`
Content idea generation:
- `generateSocialIdeas()`: Weekly job to generate content ideas
- Considers current date/season and user's industry
- Generates 3 ideas per user per week

### `inbox_fetcher.ts`
Inbound message handling:
- `runInboxPoller()`: Polls for new messages every 5 minutes
- Supports webhooks (Facebook/Instagram) and polling (LinkedIn/Twitter)
- Handles DMs and comments

### `reply_assistant.ts`
AI reply suggestions:
- `generateReplySuggestion(conversationId: string, context: string)`: Generates AI replies
- Context-aware suggestions based on conversation history

## Database Tables

### `social_connections`
OAuth connections:
- `id`: UUID primary key
- `user_id`: References auth.users
- `platform`: 'facebook' | 'instagram' | 'linkedin' | 'twitter'
- `platform_account_id`: Platform-specific account ID
- `access_token`: Encrypted access token
- `refresh_token`: Encrypted refresh token
- `status`: 'active' | 'expired' | 'inactive'
- `last_checked_at`: Last sync timestamp

### `social_posts`
Scheduled and published posts:
- `id`: UUID primary key
- `user_id`: References auth.users
- `platform`: Target platform
- `content`: Post content
- `image_url`: Image URL (if any)
- `status`: 'draft' | 'scheduled' | 'published' | 'failed'
- `scheduled_at`: When to publish
- `published_at`: When actually published
- `analytics`: Post analytics (JSONB)

### `social_conversations`
Unified conversation tracking:
- `id`: UUID primary key
- `user_id`: References auth.users
- `platform`: Source platform
- `platform_conversation_id`: Platform-specific ID
- `customer_name`: Customer identifier
- `status`: 'open' | 'closed'
- `last_message_at`: Last activity timestamp
- `unread_count`: Unread message count

### `social_messages`
Individual messages:
- `id`: UUID primary key
- `conversation_id`: References social_conversations
- `platform_message_id`: Platform-specific message ID
- `sender_type`: 'user' | 'customer'
- `content`: Message content
- `created_at`: Message timestamp

### `social_ideas`
AI-generated content ideas:
- `id`: UUID primary key
- `user_id`: References auth.users
- `content`: Idea text
- `image_suggestion`: Image prompt (text description)
- `status`: 'new' | 'used' | 'dismissed'
- `created_at`: Generation timestamp

## Supported Platforms

### Facebook
- Business Page posting
- Comments and DMs
- OAuth with page selection

### Instagram
- Business account posting
- Comments and DMs (via Facebook Graph API)
- Instagram Grid Preview

### LinkedIn
- Company page posting
- Comments and messages
- OAuth 2.0 with v2 API

### Twitter/X
- Tweet posting
- DMs and replies
- OAuth 2.0 with v2 API

## API Endpoints

- `GET /api/social/posts`: List social posts
- `POST /api/social/posts`: Create/schedule post
- `GET /api/social/conversations`: List conversations
- `GET /api/social/conversations/[id]/messages`: Get conversation messages
- `POST /api/social/conversations/[id]/suggest-reply`: Get AI reply suggestion
- `POST /api/social/conversations/[id]/reply`: Send reply
- `GET /api/social/ideas`: Get content ideas
- `POST /api/social/generate-ideas`: Generate new ideas

## Integration Points

### Module 1 (Chat Core)
Receives `CREATE_SOCIAL_POST_DRAFT` commands from orchestrator.

### Module 3 (Content Engine)
Receives repurposed content from blog posts.

### Module 6 (Communication Hub)
Shares OAuth connection management.

## Scheduled Jobs

- `generateSocialIdeas()`: Weekly (Monday 2 AM UTC)
- `runInboxPoller()`: Every 5 minutes

## Usage Example

```typescript
import { generateSocialIdeas } from '@/libs/social-hub/src/idea_engine'

const ideas = await generateSocialIdeas(userId)
// Returns 3 new content ideas
```

