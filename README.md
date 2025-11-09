# Navi AI - Unified Business Growth Platform

**Navi AI** is an AI-powered, conversational platform designed to simplify and automate essential online marketing and business management tasks for Small-to-Medium Businesses (SMBs). The primary interface is a chat assistant, making powerful tools accessible through plain English commands.

## 🎯 Core Product Vision

Navi AI acts as an automated marketing team, website manager, SEO expert, social media manager, and customer relationship hub, allowing business owners to focus on their core services while Navi AI handles their online presence and growth.

## 🏗️ Architecture

Navi AI is built with a **modular architecture**, where each module is responsible for a specific domain:

- **Module 1: Conversational AI Core** - Central chat orchestrator and business profile management
- **Module 2: Website Builder** - AI-powered website generation and management
- **Module 3: AI Content Autopilot** - Blog post generation and content repurposing
- **Module 4: SEO Growth Engine** - Automated SEO audits, keyword tracking, and competitive analysis
- **Module 5: Social Media Growth Hub** - Social media scheduling, engagement, and analytics
- **Module 6: Communication & Automation Hub** - Email/SMS broadcasts and automation sequences
- **Module 7: Lead & Contact Hub** - Unified contact management and lead ingestion
- **Module 8: AI Reputation Management Hub** - Review management and response automation
- **Module 9: Billing & Subscription Hub** - Stripe integration and feature gating
- **Module 10: AI Admin Control Center** - Platform administration and monitoring

## 🚀 Key Features

### Conversational Interface
- Natural language chat interface powered by GPT-4
- Persistent chat history
- Proactive suggestions and "Aha!" moments
- Intent recognition and disambiguation

### Website Management
- AI-generated websites from business profile
- Drag-and-drop page editor
- SEO-optimized content
- Analytics integration

### Content Creation
- AI blog post generation
- Content repurposing for social media
- Approval workflow
- Scheduled publishing

### SEO Automation
- Automated website audits
- Keyword rank tracking
- Competitive analysis
- Local SEO optimization

### Social Media
- Multi-platform scheduling (Facebook, Instagram, LinkedIn, Twitter/X)
- Content calendar with grid preview
- Unified inbox for DMs and comments
- AI-powered reply suggestions

### Communication
- Email and SMS broadcasts
- A/B testing for subject lines
- Automation sequences
- Performance analytics

### Contact Management
- Unified contact hub
- Omnichannel lead ingestion
- Activity timeline
- AI interaction summaries

### Reputation Management
- Automated review fetching (Google, Yelp, Facebook)
- AI-generated response suggestions
- Approval workflow via email/SMS
- Review showcasing

### Billing & Subscriptions
- Stripe integration
- Three-tier plan system (Starter, Growth, Pro)
- Feature gating
- Trial management

### Admin Tools
- Feature flag management
- User management
- System monitoring
- Platform settings
- Admin broadcasts

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: OpenAI (GPT-4, DALL-E 3, Embeddings)
- **Email**: Resend
- **SMS**: Twilio
- **Payments**: Stripe
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## 📁 Project Structure

```
navi-ai/
├── app/                    # Next.js App Router routes
│   ├── api/               # API endpoints
│   ├── dashboard/         # User dashboard pages
│   └── (admin)/           # Admin panel routes
├── apps/                  # Frontend applications
│   └── dashboard/         # Dashboard components
├── libs/                  # Module libraries
│   ├── chat-core/         # Module 1: Conversational AI Core
│   ├── website-builder/   # Module 2: Website Builder
│   ├── content-engine/    # Module 3: Content Autopilot
│   ├── seo-audit/         # Module 4: SEO Growth Engine
│   ├── social-hub/        # Module 5: Social Media Hub
│   ├── communication-hub/ # Module 6: Communication Hub
│   ├── contact-hub/       # Module 7: Contact Hub
│   ├── reputation-hub/    # Module 8: Reputation Hub
│   ├── billing-hub/       # Module 9: Billing Hub
│   └── admin-center/      # Module 10: Admin Center
├── supabase-schema.sql    # Database schema
└── README.md             # This file
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- OpenAI API key
- Resend API key (for email)
- Twilio account (for SMS)
- Stripe account (for payments)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd navi-ai
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Fill in your API keys and configuration
```

4. Set up the database:
```bash
# Run the schema file in your Supabase SQL editor
# Or use Supabase CLI
supabase db push
```

5. Run the development server:
```bash
npm run dev
```

## 📚 Module Documentation

Each module has its own README with detailed documentation:

- [Module 1: Conversational AI Core](./libs/chat-core/README.md)
- [Module 2: Website Builder](./libs/website-builder/README.md)
- [Module 3: AI Content Autopilot](./libs/content-engine/README.md)
- [Module 4: SEO Growth Engine](./libs/seo-audit/README.md)
- [Module 5: Social Media Growth Hub](./libs/social-hub/README.md)
- [Module 6: Communication & Automation Hub](./libs/communication-hub/README.md)
- [Module 7: Lead & Contact Hub](./libs/contact-hub/README.md)
- [Module 8: AI Reputation Management Hub](./libs/reputation-hub/README.md)
- [Module 9: Billing & Subscription Hub](./libs/billing-hub/README.md)
- [Module 10: AI Admin Control Center](./libs/admin-center/README.md)

## 🔄 Inter-Module Communication

Modules communicate through a centralized **Action Queue** system stored in the `action_commands` table. This allows modules to dispatch commands that other modules can process asynchronously.

Example commands:
- `ADD_WEBSITE_BLOG_POST`
- `CREATE_SOCIAL_POST_DRAFT`
- `NEW_LEAD_ADDED`
- `ADD_WEBSITE_TESTIMONIAL`

## 🔐 Security

- Row Level Security (RLS) policies on all Supabase tables
- Server-side authentication checks on all API routes
- Encrypted storage for OAuth tokens (AES-256-GCM)
- Role-based access control (user, admin, super_admin)

## 📝 License

[Add your license here]

## 🤝 Contributing

[Add contribution guidelines here]

## 📧 Support

[Add support contact information here]
