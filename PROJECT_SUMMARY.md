# Navi AI - Complete Project Summary

## 📊 Platform Overview

**Navi AI** is a comprehensive, AI-powered business growth platform built for Small-to-Medium Businesses (SMBs). The platform consists of **10 integrated modules** working together to automate marketing, content creation, SEO, social media, customer management, reputation, and billing.

### Platform Statistics
- **Total API Endpoints**: 109+ routes
- **Module Libraries**: 75+ TypeScript files
- **Database Tables**: 40+ tables with full RLS policies
- **Scheduled Jobs**: 15+ automated background jobs
- **Integration Points**: Centralized Action Queue system

---

## 🎯 Module 1: Conversational AI Core

### Current Capabilities

**The Brain of Navi AI** - This is the central orchestrator that powers the entire conversational interface.

#### ✅ What It Can Do Right Now:

1. **Natural Language Processing**
   - Processes user messages using GPT-4 Turbo
   - Recognizes 15+ different intents (CREATE_WEBSITE, WRITE_BLOG, UPDATE_PROFILE, etc.)
   - Handles ambiguous requests with clarification questions
   - Maintains conversation context from chat history

2. **Business Profile Management**
   - Creates and manages complete business profiles
   - Stores: business name, industry, services, location, hours, contact info, custom attributes
   - Intelligent profile updates (merges arrays instead of overwriting)
   - Flexible JSONB structure for custom data

3. **Onboarding System**
   - Interactive onboarding interview for new users
   - Website scraping: Extracts business info from existing websites
   - Auto-populates profile from scraped data
   - Asks follow-up questions to complete profile

4. **RAG (Retrieval-Augmented Generation)**
   - Vector embeddings of business profile data
   - Semantic search over profile information
   - Provides context to AI when generating content
   - Uses OpenAI embeddings + Supabase pgvector

5. **Proactive Suggestions**
   - "Aha!" moment detection (immediate value after profile completion)
   - Gap analysis (identifies missing profile information)
   - Goal-based suggestions (e.g., "Establish online presence" vs "Create website")
   - Prevents duplicate suggestions

6. **Chat History**
   - Persistent conversation storage
   - Retrieves last 50 messages for context
   - Saves both user and assistant messages
   - Enables stateful conversations

7. **Intent Recognition & Action Dispatch**
   - Recognizes intents and dispatches to appropriate modules
   - Handles: website creation, blog writing, page management, analytics queries, billing questions
   - Integrates with all other modules via Action Queue

#### 🔧 Technical Implementation:
- **Files**: `orchestrator.ts`, `profile.ts`, `scraper.ts`, `rag.ts`, `suggestion_engine.ts`, `types.ts`
- **Database Tables**: `business_profiles`, `chat_messages`, `profile_embeddings`, `suggestion_prompts`
- **API Endpoints**: `/api/chat/send`, `/api/chat/messages`, `/api/suggestions`, `/api/profile`

---

## 🌐 Module 2: Website Builder

### Current Capabilities

**AI-Powered Website Generation** - Creates professional, SEO-optimized websites through conversation.

#### ✅ What It Can Do Right Now:

1. **AI Website Generation**
   - Generates complete websites from business profiles
   - Creates multiple pages (Home, About, Services, Contact)
   - AI-powered content generation using GPT-4
   - SEO-optimized with meta tags and schema markup

2. **Page Management**
   - Create new pages via chat ("Add an About page")
   - Rename page titles (slug remains unchanged)
   - Delete pages with safety checks
   - Edit page content through conversational interface

3. **Visual Editor**
   - Drag-and-drop page editor
   - Live preview of changes
   - Section reordering
   - Theme customization

4. **Section Types**
   - Hero sections with CTAs
   - Feature showcases
   - Rich text sections
   - Image galleries
   - Video embeds
   - Contact forms
   - Custom embeds/widgets
   - Footer sections

5. **SEO Features**
   - Automatic meta title and description generation
   - Schema.org markup (FAQPage, BlogPosting, Review)
   - Dynamic sitemap.xml generation
   - robots.txt management
   - Search engine ping (Google, Bing)

6. **Analytics Integration**
   - Plausible Analytics integration
   - Conditional injection on published pages
   - Analytics summary via chat ("How's my website traffic?")

7. **Legal Pages**
   - Automated Privacy Policy generation
   - Automated Terms of Service generation
   - Adds to website automatically

8. **Publishing System**
   - Draft-only editing (changes don't affect live site)
   - One-click publishing
   - Unpublishing capability
   - Subdomain-based hosting

#### 🔧 Technical Implementation:
- **Files**: `generator.ts`, `page_ops.ts`, `Renderer.tsx`, `legal_pages.ts`, `analytics.ts`, `sitemap.ts`
- **Database Tables**: `websites`, `website_analytics`
- **API Endpoints**: `/api/website/me`, `/api/website/save`, `/api/website/publish`, `/api/analytics/summary`

---

## ✍️ Module 3: AI Content Autopilot

### Current Capabilities

**Automated Blog Content Creation** - Generates SEO-optimized blog posts and repurposes them for social media.

#### ✅ What It Can Do Right Now:

1. **AI Blog Post Generation**
   - Generates complete blog posts using GPT-4
   - SEO-optimized with focus keywords
   - Creates meta titles and descriptions
   - Generates branded graphics using DALL-E 3

2. **Topic Suggestions**
   - AI-generated topic ideas based on business profile
   - Considers industry, services, and business goals
   - Provides multiple topic options

3. **Content Repurposing**
   - Converts blog posts to social media assets
   - Platform-specific adaptation (Facebook, Instagram, LinkedIn, Twitter)
   - Creates multiple social media posts from one blog post
   - Generates image suggestions for social posts

4. **Approval Workflow**
   - Email and SMS approval notifications
   - Single-use approval tokens (7-day expiry)
   - Approve or request changes
   - AI-powered revision based on feedback
   - Resend approval if needed

5. **Scheduled Publishing**
   - Schedule posts for future publication
   - Automated publishing via background job
   - Status tracking: draft → scheduled → pending_approval → approved → published

6. **Image Generation**
   - DALL-E 3 integration for branded graphics
   - Blog post featured images
   - Social media graphics
   - Style customization

#### 🔧 Technical Implementation:
- **Files**: `draft_generator.ts`, `repurposer.ts`, `image_service.ts`, `approval_workflow.ts`, `publisher.ts`, `scheduler.ts`
- **Database Tables**: `blog_posts`, `repurposed_assets`
- **API Endpoints**: `/api/content/posts`, `/api/content/approve`, `/api/content/request-changes`
- **Scheduled Jobs**: `runContentScheduler()` (daily), `runContentPublisher()` (every 10 minutes)

---

## 🔍 Module 4: SEO Growth Engine

### Current Capabilities

**Automated SEO Optimization** - Comprehensive SEO audits, keyword tracking, and competitive analysis.

#### ✅ What It Can Do Right Now:

1. **Automated Website Audits**
   - Crawls website pages
   - Checks: Title tags, meta descriptions, H1 tags, alt text
   - Identifies: Missing elements, duplicates, length issues
   - Generates health score (0-100)
   - Checks robots.txt and sitemap.xml

2. **Keyword Rank Tracking**
   - Daily rank monitoring for target keywords
   - Tracks user and competitor keywords
   - Localized rank tracking (location-based)
   - Rank change detection and alerts

3. **Competitive Analysis**
   - Tracks competitor keyword rankings
   - AI-generated competitive insights:
     - Content gaps
     - Keyword opportunities
     - Celebration of wins
   - Weekly competitive strategist job

4. **Local SEO**
   - NAP (Name, Address, Phone) consistency checks
   - Citation analysis across platforms
   - Apple Maps, Google Business Profile, Yelp tracking
   - Missing citation identification

5. **AI-Powered Fixes**
   - "Fix it for Me" automated SEO fixes
   - AI generates fixes for identified issues
   - Dispatches fixes to Website Builder
   - Tracks fix status and results

6. **SEO Opportunities**
   - AI best practices engine (monthly job)
   - Generates SEO opportunities for admin review
   - Admin can approve/reject opportunities
   - Opportunities become suggestions in chat

7. **Monthly Reporting**
   - Automated email reports
   - Health score trends
   - Keyword performance improvements
   - Fixes applied
   - Website visitor count

#### 🔧 Technical Implementation:
- **Files**: `crawler.ts`, `keyword_tracker.ts`, `strategist.ts`, `local_citation.ts`, `fixer.ts`, `best_practices.ts`, `scheduler.ts`
- **Database Tables**: `seo_audit_reports`, `seo_issues`, `keyword_performance`, `competitive_insights`, `seo_opportunities`, `local_citations`
- **API Endpoints**: `/api/seo/audit-report`, `/api/seo/issues`, `/api/seo/fix`, `/api/seo/keyword-performance`
- **Scheduled Jobs**: `runWeeklyHealthAudits()` (weekly), `runDailyRankTracker()` (daily), `runCompetitiveStrategist()` (weekly), `updateSeoKnowledgeBase()` (monthly)

---

## 📱 Module 5: Social Media Growth Hub

### Current Capabilities

**Multi-Platform Social Media Management** - Schedule posts, manage engagement, and track performance across Facebook, Instagram, LinkedIn, and Twitter/X.

#### ✅ What It Can Do Right Now:

1. **Multi-Platform Support**
   - Facebook Business Pages
   - Instagram Business Accounts
   - LinkedIn Company Pages
   - Twitter/X Accounts
   - Platform-specific API integration

2. **OAuth Connection Management**
   - Secure OAuth flows for all platforms
   - Facebook Page selection after OAuth
   - Token encryption (AES-256-GCM)
   - "Refresh on use" token strategy
   - Connection status tracking

3. **Post Composer**
   - AI-powered content generation
   - Platform-specific character limit adaptation
   - Image upload and management
   - Optimal timing suggestions
   - Schedule posts for future publication

4. **Content Calendar**
   - Visual calendar view
   - Instagram Grid Preview (9-post grid)
   - Drag-and-drop scheduling
   - Post status tracking (draft, scheduled, published, failed)

5. **AI Idea Engine**
   - Weekly content idea generation
   - 3 ideas per user per week
   - Considers current date/season
   - Industry-specific suggestions
   - Ideas appear in Calendar tab

6. **Unified Inbox**
   - Centralized DMs and comments
   - Grouped by customer (DMs) and post (comments)
   - Platform icons and customer names
   - Last message preview
   - Unread count badges
   - Relative timestamps

7. **AI Reply Assistant**
   - Context-aware reply suggestions
   - Pre-fills reply box with editable suggestion
   - Quick actions (Mark as Closed)
   - Conversation status management (Open/Closed)

8. **Inbound Engine**
   - Webhooks for Facebook/Instagram
   - Polling for LinkedIn/Twitter (every 5 minutes)
   - Fallback polling for Facebook/Instagram
   - Message deduplication by platformMessageId
   - Handles both DMs and comments

9. **Analytics Dashboard**
   - Post performance metrics
   - Engagement rates
   - Platform-specific analytics
   - Content calendar with performance overlay

#### 🔧 Technical Implementation:
- **Files**: `adapter.ts`, `idea_engine.ts`, `inbox_fetcher.ts`, `reply_assistant.ts`, `types.ts`
- **Database Tables**: `social_connections`, `social_posts`, `social_conversations`, `social_messages`, `social_ideas`
- **API Endpoints**: `/api/social/posts`, `/api/social/conversations`, `/api/social/conversations/[id]/suggest-reply`, `/api/social/ideas`
- **Scheduled Jobs**: `generateSocialIdeas()` (weekly), `runInboxPoller()` (every 5 minutes)

---

## 📧 Module 6: Communication & Automation Hub

### Current Capabilities

**Email/SMS Broadcasts & Automation** - Send targeted campaigns and automate customer communication workflows.

#### ✅ What It Can Do Right Now:

1. **Email & SMS Broadcasts**
   - One-time campaigns to targeted audiences
   - Channel selection (Email or SMS)
   - Audience selection via Contact Hub tags
   - Immediate or scheduled sending
   - Filters contacts by channel (email/phone required)

2. **AI-Powered Composer**
   - Generates 3 subject line options
   - Generates email/SMS body with primary CTA
   - Requires selecting 1 or 2 subjects (for A/B testing)
   - Manual fallback if AI fails
   - Character count display

3. **A/B Testing**
   - Subject line A/B testing only
   - Fixed 20% test size (10% variant A, 10% variant B)
   - Winner determined by open rates
   - Remaining 80% receives winning variant
   - Can skip A/B testing (single subject)

4. **Broadcast Workflow**
   - Step 1: Channel selection (Email/SMS)
   - Step 2: Audience selection (tags, optional)
   - Step 3: Content creation (AI or manual)
   - Step 4: Schedule or send immediately
   - Temporary audience (not saved)

5. **Automation Sequences**
   - Trigger: `new_lead_added` (V1 only)
   - Multi-step sequences
   - Step types: Send Email, Send SMS, Wait
   - Wait steps: Minimum 1 day, no maximum
   - No consecutive wait steps
   - Steps are editable and deletable (not reorderable)

6. **Automation Engine**
   - Event-driven (listens for NEW_LEAD_ADDED)
   - Tracks contact progress through sequences
   - Updates `nextStepAt` for wait steps
   - Processes sequences frequently (every 1 minute)

7. **Performance Analytics**
   - Broadcast analytics: Total Sent, Open Rate, Click Rate, Failed count
   - A/B test results with side-by-side comparison
   - Automation analytics: Contacts per step (funnel view)
   - All-time data (no date filtering in V1)

8. **Unsubscribe Management**
   - Checks `isUnsubscribed` before every send
   - Permanently skips unsubscribed contacts
   - No warnings or errors

9. **Review Request Campaigns**
   - Special broadcast type: `review_request`
   - Generates personalized feedback URLs
   - Integrates with Reputation Hub
   - Review gating flow

#### 🔧 Technical Implementation:
- **Files**: `composer.ts`, `engine.ts`, `contact_adapter.ts`, `email_service.ts`, `sms_service.ts`, `system_emails.ts`
- **Database Tables**: `broadcasts`, `automation_sequences`, `automation_steps`, `automation_contact_progress`
- **API Endpoints**: `/api/communication/broadcasts`, `/api/communication/generate-content`, `/api/communication/automation`, `/api/communication/analytics`
- **Scheduled Jobs**: `runBroadcastScheduler()` (every 1 minute), `runAbTestWinnerCheck()` (dynamically scheduled), `runAutomationEngine()` (every 1 minute)

---

## 👥 Module 7: Lead & Contact Hub

### Current Capabilities

**Unified Contact Management** - Central CRM for all customer interactions and lead capture.

#### ✅ What It Can Do Right Now:

1. **Contact Management**
   - Unified contact list with search and filtering
   - Search by: Name, Email, Phone
   - Sort by: Name, Email, Date Added (default: newest first)
   - Tag filtering (single search input)
   - Tag management: Add/remove tags via modal

2. **Contact Creation**
   - Manual contact creation (Email required, Name/Phone/Tags optional)
   - Omnichannel lead ingestion from any source
   - Email-based de-duplication
   - Auto-tagging: `'new_lead'` for new contacts

3. **Contact View**
   - Read-only contact info display
   - Name, Email, Phone, Tags (color-coded pills)
   - "Unsubscribed" badge if applicable
   - Activity timeline (newest first)
   - Distinct icons for each event type

4. **Activity Timeline**
   - Vertical list of all interactions
   - Event types: lead_capture, note, email_sent, email_opened, link_clicked, sms_sent, sms_opened, billing_status_change, review_request, negative_feedback
   - Human-readable content summaries
   - Timestamps for each event
   - No date grouping (V1)

5. **Quick Actions**
   - "Send Email" button (opens modal composer)
   - "Send SMS" button (opens modal composer)
   - Disabled if no email/phone or unsubscribed
   - "Add Note" textarea (always visible at top)
   - Successful sends auto-log events

6. **AI Interaction Summary**
   - Generates AI summary of contact's activity
   - Analyzes last 20 activity events
   - Highlights billing status and recent engagement
   - Displays in modal
   - Regenerates on each click (no caching)

7. **Omnichannel Lead Ingestion**
   - `ingestNewLead()` function for any channel
   - Creates contact only if new (email de-duplication)
   - Adds `'new_lead'` tag
   - Creates `lead_capture` activity event
   - Dispatches `NEW_LEAD_ADDED` to Action Queue (triggers automations)

8. **Negative Feedback Handling**
   - `addFeedbackActivity()` function
   - Adds `'Negative_Feedback'` tag
   - Creates `negative_feedback` activity event
   - Used by Review Gating flow

#### 🔧 Technical Implementation:
- **Files**: `lead_ingestion.ts`, `ai_summary.ts`, `types.ts`
- **Database Tables**: `contacts`, `activity_events`
- **API Endpoints**: `/api/contacts`, `/api/contacts/[id]`, `/api/contacts/[id]/send-message`, `/api/contacts/[id]/ai-summary`, `/api/leads/submit`

---

## ⭐ Module 8: AI Reputation Management Hub

### Current Capabilities

**Automated Review Management** - Fetches, responds to, and showcases reviews across Google, Yelp, and Facebook.

#### ✅ What It Can Do Right Now:

1. **Review Source Management**
   - Connect Google Business Profile (OAuth)
   - Connect Facebook Pages (OAuth with page selection)
   - Connect Yelp (API key entry)
   - Auto-fetches direct review links
   - Connection status tracking (active/inactive/expired)
   - Disconnect functionality

2. **Automated Review Fetching**
   - Runs every 4 hours
   - Fetches from Google Business Profile API
   - Fetches from Facebook Graph API (`/ratings` endpoint)
   - Fetches from Yelp Fusion API
   - De-duplicates by `sourceId` + `reviewId`
   - Marks sources inactive on auth errors
   - Initial status: `needs_response`

3. **Unified Review Inbox**
   - Single unified list of all reviews
   - Sorted by `publishedAt` (newest first)
   - Filters: Status, Platform, Rating (combinable)
   - Review cards show: reviewer name, rating, text, platform, date, status badge
   - Suggested response preview (if available)

4. **AI Reply Assistant**
   - Generates context-aware responses
   - Negative reviews (≤3 stars): Apology + business contact info
   - Positive reviews (≥4 stars): Simple thank you
   - Pulls contact info from BusinessProfile
   - Manual reply option

5. **Approval Workflow**
   - Sends email and SMS notifications
   - Single-use approval token (7-day expiry)
   - Approval links in notifications
   - Full review, rating, and suggested response included
   - Status: `response_pending_approval`

6. **Approve Reply Handler**
   - Email approval: Redirects to HTML success page
   - SMS approval: Sends confirmation SMS
   - Token validation (exists, not expired, correct status)
   - Updates status to `response_approved`
   - Queues for publishing (doesn't publish immediately)

7. **Reply-to-Edit Handler**
   - Email replies: Parses body, removes quoted content
   - SMS replies: Uses entire body as feedback
   - Review identification via custom email header or phone lookup
   - Sets status to `response_changes_requested`
   - AI revision: Preserves tone, applies requested edits
   - Re-runs approval workflow after revision

8. **Response Publisher**
   - Runs every 5 minutes
   - Publishes approved replies to Google and Facebook
   - Yelp: Sets status to `response_failed` (API not supported)
   - Textless Facebook ratings: Skips publishing
   - Retry logic: Max 3 attempts for transient errors
   - Saves `ReviewResponse` records on success

9. **Review Showcasing**
   - "Add to Website" button (if `isGoodForShowcasing === true`)
   - "Share on Social" button (if showcase-worthy)
   - Dispatches `ADD_WEBSITE_TESTIMONIAL` command
   - Dispatches `CREATE_SOCIAL_POST_DRAFT` command
   - AI formats social post (celebratory, quote, thank you, rating/platform)

10. **Review Gating Campaigns**
    - Sends customers to internal feedback page first
    - Positive feedback (4-5 stars): Redirects to public review site
    - Negative feedback (1-3 stars): Captures internally, adds `Negative_Feedback` tag
    - Secure token-based URLs
    - Integrates with Communication Hub

11. **Sentiment Analysis & Dashboard**
    - Daily analysis job (6 AM UTC)
    - Identifies Top 5 Positive and Top 5 Negative themes
    - Flags showcase-worthy reviews (5 stars, 20+ words, enthusiastic)
    - Dashboard metrics: Average Rating, Total Reviews, Response Rate, Rating Distribution
    - Rating Trend Chart (last 90 days, weekly grouping)
    - Theme lists (sorted by AI-determined importance)

#### 🔧 Technical Implementation:
- **Files**: `review_fetcher.ts`, `reply_assistant.ts`, `response_publisher.ts`, `review_campaign.ts`, `showcase_handler.ts`, `analyzer.ts`, `review_link_fetcher.ts`
- **Database Tables**: `review_sources`, `reviews`, `review_responses`, `reputation_settings`, `reputation_themes`
- **API Endpoints**: `/api/reputation/reviews`, `/api/reputation/reviews/[id]/suggest`, `/api/reputation/approve`, `/api/reputation/publish-responses`, `/api/reputation/dashboard`
- **Scheduled Jobs**: `runReviewFetcher()` (every 4 hours), `runResponsePublisher()` (every 5 minutes), `runReputationAnalysis()` (daily)

---

## 💳 Module 9: Billing & Subscription Hub

### Current Capabilities

**Stripe Integration & Feature Gating** - Manages subscriptions, plans, and feature access control.

#### ✅ What It Can Do Right Now:

1. **Three-Tier Plan System**
   - **Starter**: Website, Contacts, Reputation (500 contacts, 20 reviews/month, 1 social connection)
   - **Growth**: Adds Content, Social (1,500 contacts, 50 reviews/month, 3 connections, 4 blog posts/month)
   - **Pro**: All modules including SEO, Communication (5,000 contacts, unlimited reviews, 5 connections, 8 blog posts/month, 10 SEO keywords, 3 competitors)

2. **Stripe Checkout Integration**
   - Secure checkout session creation
   - Subscription and one-time payment support
   - Trial period logic (no trial if existing customer)
   - "Get or create" customer logic
   - Success/cancel URL handling

3. **Stripe Webhook Handler**
   - Handles: checkout.session.completed, subscription.created/updated/deleted, invoice.payment_succeeded/failed, trial_will_end
   - Updates subscription status in database
   - Updates contact billing tags (active_customer, trial_user, canceled_customer)
   - Creates contacts for billing events
   - Logs billing_status_change activity events

4. **Feature Gating**
   - `hasFeatureAccess()`: Check if user has feature
   - `isWithinLimit()`: Check if within plan limits
   - `getUserLimit()`: Get limit value
   - `hasActiveSubscription()`: Check active subscription
   - `getSubscriptionStatus()`: Get status
   - `getUserPlanName()`: Get plan name
   - `getUserFeatures()`: Get enabled features
   - Access granted only for 'active' and 'trialing' subscriptions

5. **Billing Dashboard UI**
   - Subscription status display
   - Trial information
   - Past due warnings
   - Plan features and limits
   - "Manage Billing" button (Stripe Customer Portal)

6. **Plan Selection UI**
   - Fetches plans from Stripe API
   - Displays features from ENTITLEMENTS config
   - Feature comparison table
   - Highlights current plan
   - One-time products section

7. **Dunning & Communication**
   - Trial ending email (triggered by `trial_will_end` webhook)
   - Payment failed email (triggered by `invoice.payment_failed`)
   - Fixed email templates with Stripe Portal links
   - Personalized with user name and plan details
   - Event-driven (not cron jobs)

8. **AI Billing Assistant**
   - Answers billing questions via chat
   - Integrated into Module 1 orchestrator
   - Handles: subscription questions, trial info, plan details
   - Directs to Stripe Customer Portal for actions

#### 🔧 Technical Implementation:
- **Files**: `checkout.ts`, `data.ts`, `feature_gating.ts`, `ai_assistant.ts`, `config/entitlements.ts`, `types.ts`
- **Database Tables**: `subscriptions`, `one_time_payments`
- **API Endpoints**: `/api/billing/subscription`, `/api/billing/create-checkout-session`, `/api/billing/portal`, `/api/billing/products`, `/api/billing/webhook`

---

## 🛡️ Module 10: AI Admin Control Center

### Current Capabilities

**Platform Administration** - Complete admin tools for managing the platform, users, and system health.

#### ✅ What It Can Do Right Now:

1. **Secure Admin Authentication**
   - Role-based access control (user, admin, super_admin)
   - Server-side auth guards
   - JWT role reflection
   - Non-admin redirects with error messages
   - Separate admin route group

2. **User Management**
   - Paginated, searchable user list
   - Columns: Email, Name, Role, Subscription Status, Created At
   - Search by email or name
   - User detail view with:
     - Send password reset (Supabase Auth Admin API)
     - View activity log
     - Impersonate user (creates token, redirects to user dashboard)
   - Audit logging for all actions

3. **Feature Flag Management**
   - List of all feature flags
   - Toggle switches with confirmation dialogs
   - Flag descriptions
   - Audit logging (oldValue, newValue)
   - Flags created in code (not via UI)

4. **System Monitoring Dashboard**
   - Key Metrics Cards:
     - Total Users (from auth.users)
     - Active Subscriptions (status = 'active')
     - Jobs Failed (24h) (from job_run_logs)
     - New Errors (24h) (from Sentry API)
   - Background Job Status Table:
     - Most recent run per unique jobName
     - Columns: Job Name, Last Run, Status, Duration
   - Recent Errors List:
     - Last 10 errors from Sentry
     - Error message and timestamp
     - Clickable links to Sentry dashboard

5. **SEO Opportunity Review**
   - List of pending SEO opportunities
   - Shows: title, description, suggestedAction
   - Approve/Reject buttons
   - Updates status and removes from list
   - Audit logging

6. **Admin User Management (Super Admin Only)**
   - List current admin users (admin and super_admin roles)
   - List pending admin invites
   - Invite new admin (email + role selection)
   - Remove admin access (prevents removing last super_admin)
   - Revoke pending invites
   - Secure invitation system (24-hour expiry, single-use tokens)

7. **Platform Settings Management (Super Admin Only)**
   - Simple form for editable settings
   - V1: Only `defaultTrialLengthDays` is editable
   - Validation (positive integer, max 365 days)
   - Confirmation dialog before saving
   - Audit logging

8. **Admin Broadcast Tool (Super Admin Only)**
   - Three targeting options: All Users, Paying Users, Trial Users
   - Recipient count preview before sending
   - Rich text (HTML) email composer
   - Subject line input
   - Immediate send only
   - Progress indicator during send
   - Final summary (sent/failed counts)
   - Audit logging

9. **Audit Logging**
   - All critical admin actions logged
   - Flexible JSONB details field
   - Tracks: flag toggles, impersonation, settings changes, broadcasts, user management
   - No IP address in V1

10. **Job Run Logs**
    - Tracks all background job executions
    - Status: success or failed
    - Error messages
    - Details in JSONB (e.g., recordsProcessed)

#### 🔧 Technical Implementation:
- **Files**: `access_control.ts`, `data.ts`, `types.ts`, `plan_limits.ts`
- **Database Tables**: `user_profiles`, `feature_flags`, `admin_audit_logs`, `admin_invites`, `job_run_logs`, `platform_settings`
- **API Endpoints**: `/api/admin/users`, `/api/admin/feature-flags`, `/api/admin/system-health/*`, `/api/admin/admins`, `/api/admin/platform-settings`, `/api/admin/broadcasts`
- **UI Components**: AdminDashboard, UserManager, FeatureFlagManager, AdminManager, PlatformSettingsManager, BroadcastComposer, OpportunityReview

---

## 🔄 Inter-Module Integration

### Action Queue System
Centralized communication between modules via `action_commands` table:

- `ADD_WEBSITE_BLOG_POST`: Content Engine → Website Builder
- `CREATE_SOCIAL_POST_DRAFT`: Content/Reputation Hub → Social Hub
- `UPDATE_WEBSITE_CONTENT`: SEO Hub → Website Builder
- `NEW_LEAD_ADDED`: Contact Hub → Communication Hub (triggers automations)
- `ADD_WEBSITE_TESTIMONIAL`: Reputation Hub → Website Builder
- `UPDATE_LOCAL_LISTING`: SEO Hub → Google Integration

### Shared Services

1. **Connections Hub** (`libs/connections-hub/`)
   - Centralized OAuth management
   - Token encryption (AES-256-GCM)
   - "Refresh on use" strategy
   - Used by: Social Hub, Reputation Hub

2. **Action Queue Processor**
   - Background job processes `action_commands`
   - Routes commands to appropriate modules
   - Handles failures and retries

---

## 📊 Platform Statistics

### Codebase
- **Total API Endpoints**: 109+ routes
- **Module TypeScript Files**: 75+ files
- **React Components**: 30+ dashboard components
- **Database Tables**: 40+ tables
- **Scheduled Jobs**: 15+ automated jobs

### Database Schema
- **User Management**: `auth.users`, `user_profiles`, `business_profiles`
- **Content**: `websites`, `blog_posts`, `repurposed_assets`
- **SEO**: `seo_audit_reports`, `seo_issues`, `keyword_performance`, `competitive_insights`, `seo_opportunities`
- **Social**: `social_connections`, `social_posts`, `social_conversations`, `social_messages`, `social_ideas`
- **Communication**: `broadcasts`, `automation_sequences`, `automation_steps`, `automation_contact_progress`
- **Contacts**: `contacts`, `activity_events`
- **Reputation**: `review_sources`, `reviews`, `review_responses`, `reputation_settings`, `reputation_themes`
- **Billing**: `subscriptions`, `one_time_payments`
- **Admin**: `feature_flags`, `admin_audit_logs`, `admin_invites`, `job_run_logs`, `platform_settings`
- **System**: `action_commands`, `chat_messages`, `profile_embeddings`, `suggestion_prompts`

### Scheduled Jobs
1. `runContentScheduler()` - Daily
2. `runContentPublisher()` - Every 10 minutes
3. `runWeeklyHealthAudits()` - Weekly (Monday 2 AM UTC)
4. `runDailyRankTracker()` - Daily (6 AM UTC)
5. `runCompetitiveStrategist()` - Weekly (Sunday 2 AM UTC)
6. `updateSeoKnowledgeBase()` - Monthly (1st, 2 AM UTC)
7. `generateAndSendMonthlyReports()` - Monthly (1st, 8 AM UTC)
8. `generateSocialIdeas()` - Weekly (Monday 2 AM UTC)
9. `runInboxPoller()` - Every 5 minutes
10. `runBroadcastScheduler()` - Every 1 minute
11. `runAbTestWinnerCheck()` - Dynamically scheduled
12. `runAutomationEngine()` - Every 1 minute
13. `runReviewFetcher()` - Every 4 hours
14. `runResponsePublisher()` - Every 5 minutes
15. `runReputationAnalysis()` - Daily (6 AM UTC)

---

## 🎯 Current Platform Capabilities Summary

### What Users Can Do Right Now:

1. **Chat with AI** to:
   - Create and manage their business profile
   - Generate complete websites
   - Create blog posts
   - Get SEO suggestions
   - Ask billing questions
   - View analytics

2. **Manage Their Website**:
   - AI-generated websites with multiple pages
   - Visual editor with drag-and-drop
   - SEO optimization
   - Analytics tracking
   - Legal page generation

3. **Create Content**:
   - AI blog posts with SEO optimization
   - Content repurposing for social media
   - Approval workflow
   - Scheduled publishing

4. **Improve SEO**:
   - Automated website audits
   - Keyword rank tracking
   - Competitive analysis
   - Automated fixes
   - Local SEO optimization

5. **Manage Social Media**:
   - Schedule posts across 4 platforms
   - Content calendar with grid preview
   - Unified inbox for engagement
   - AI reply suggestions
   - Weekly content ideas

6. **Communicate with Customers**:
   - Email and SMS broadcasts
   - A/B testing
   - Automation sequences
   - Performance tracking

7. **Manage Contacts**:
   - Unified contact list
   - Omnichannel lead capture
   - Activity timeline
   - AI interaction summaries

8. **Manage Reputation**:
   - Automated review fetching
   - AI response generation
   - Approval workflow
   - Review showcasing
   - Review gating campaigns

9. **Manage Billing**:
   - Three-tier subscription plans
   - Stripe integration
   - Feature gating
   - Trial management

10. **Admin Tools** (for admins):
    - User management
    - Feature flags
    - System monitoring
    - Platform settings
    - Admin broadcasts

---

## 🔐 Security Features

- **Row Level Security (RLS)**: All tables have RLS policies
- **Server-Side Auth**: All API routes verify authentication
- **Token Encryption**: OAuth tokens encrypted at rest (AES-256-GCM)
- **Role-Based Access**: user, admin, super_admin roles
- **JWT Role Claims**: Roles included in JWT for fast authorization
- **Audit Logging**: All admin actions logged
- **Secure Invitations**: Single-use, time-limited admin invites

---

## 🚀 What's Next (V2 Potential)

While V1 is complete, potential V2 enhancements could include:
- Advanced analytics and reporting
- More automation triggers
- Additional social platforms
- Enhanced A/B testing
- More SEO features
- Advanced content repurposing
- Multi-language support
- Mobile apps

---

**This is a production-ready V1 platform with comprehensive functionality across all 10 modules, fully integrated and operational.**

