# Module 3: AI Content Autopilot

The **AI Content Autopilot** module automates blog post creation, content repurposing, and publishing workflows. It generates SEO-optimized blog content and repurposes it for social media.

## Overview

This module provides:
- **AI Blog Generation**: GPT-4 powered blog post creation
- **Topic Suggestions**: AI-generated topic ideas based on business profile
- **Content Repurposing**: Convert blog posts to social media assets
- **Approval Workflow**: Email/SMS approval system for content
- **Scheduled Publishing**: Automated content scheduling
- **Image Generation**: DALL-E 3 integration for branded graphics

## Key Components

### `draft_generator.ts`
Blog post generation:
- `generateBlogPostDraft(options: BlogPostOptions)`: Creates blog post using GPT-4
- `generateTopicSuggestions(userId: string, count: number)`: Suggests blog topics
- SEO metadata generation (title, description, focus keyword)

### `repurposer.ts`
Content repurposing:
- `repurposeBlogPostForSocial(post: BlogPost)`: Creates social media assets
- Generates platform-specific content (Facebook, Instagram, LinkedIn, Twitter)
- Creates branded graphics suggestions

### `image_service.ts`
Image generation:
- `generateBrandedGraphic(prompt: string, style: string)`: Uses DALL-E 3
- `generateBlogImage(topic: string, style: string)`: Creates blog post images

### `approval_workflow.ts`
Approval system:
- `sendApprovalNotification(post: BlogPost, profile: BusinessProfile)`: Sends email/SMS
- `processApproval(token: string)`: Handles approval
- `processRevisionRequest(token: string, feedback: string)`: Handles revision requests

### `publisher.ts`
Publishing automation:
- `publishBlogPost(postId: string)`: Publishes approved posts
- Integrates with Website Builder to add posts to website

### `scheduler.ts`
Content scheduling:
- `runContentScheduler()`: Daily job to schedule posts
- `runContentPublisher()`: Frequent job to publish scheduled posts

## Database Tables

### `blog_posts`
Stores blog post content:
- `id`: UUID primary key
- `user_id`: References auth.users
- `title`: Post title
- `slug`: URL-friendly identifier
- `content_markdown`: Markdown content
- `seo_metadata`: SEO data (JSONB)
- `status`: 'draft' | 'scheduled' | 'pending_approval' | 'approved' | 'changes_requested' | 'published'
- `approval_token`: Single-use approval token
- `scheduled_at`: When to publish
- `published_at`: When actually published

### `repurposed_assets`
Stores social media assets:
- `platform`: 'facebook' | 'instagram' | 'linkedin' | 'twitter'
- `content`: Platform-specific content
- `image_url`: Generated graphic URL
- `scheduled_at`: When to post

## Workflow

1. **Topic Suggestion**: AI suggests topics based on business profile
2. **Draft Generation**: User selects topic, AI generates blog post
3. **Approval Request**: System sends email/SMS with approval link
4. **User Approval**: User approves or requests changes
5. **Revision** (if needed): AI revises based on feedback
6. **Publishing**: Approved posts are published automatically

## API Endpoints

- `GET /api/content/posts`: List blog posts
- `POST /api/content/posts`: Create new blog post
- `POST /api/content/approve`: Approve blog post
- `POST /api/content/request-changes`: Request revisions
- `POST /api/content/resend-approval`: Resend approval notification

## Integration Points

### Module 1 (Chat Core)
Receives `WRITE_BLOG` intent from orchestrator.

### Module 2 (Website Builder)
Dispatches `ADD_WEBSITE_BLOG_POST` to add posts to website.

### Module 5 (Social Hub)
Dispatches `CREATE_SOCIAL_POST_DRAFT` for repurposed content.

## Scheduled Jobs

- `runContentScheduler()`: Runs daily to schedule posts
- `runContentPublisher()`: Runs every 10 minutes to publish scheduled posts

## Usage Example

```typescript
import { generateBlogPostDraft } from '@/libs/content-engine/src/draft_generator'

const post = await generateBlogPostDraft({
  userId: 'user-123',
  topic: '5 Tips for Local SEO',
  profile: businessProfile,
  focusKeyword: 'local seo'
})
```

