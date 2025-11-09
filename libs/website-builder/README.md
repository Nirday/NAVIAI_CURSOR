# Module 2: Website Builder

The **Website Builder** module enables AI-powered website generation and management. Users can create professional, SEO-optimized websites through natural language conversations.

## Overview

This module provides:
- **AI Website Generation**: Create complete websites from business profiles
- **Page Management**: Create, edit, rename, and delete pages
- **Visual Editor**: Drag-and-drop page editor with live preview
- **SEO Optimization**: Automatic meta tags, schema markup, and sitemap generation
- **Analytics Integration**: Plausible Analytics integration
- **Legal Pages**: Automated Privacy Policy and Terms of Service generation

## Key Components

### `generator.ts`
AI-powered website generation:
- `generatePageWithAI(options: PageGenerationOptions)`: Generates page content using GPT-4
- `generateWebsiteFromProfile(profile: BusinessProfile)`: Creates initial website structure
- Schema.org markup generation (FAQPage, BlogPosting, Review)

### `page_ops.ts`
Page management operations:
- `createPageDraft(userId: string, title: string, slug: string)`: Create new page
- `renamePageDraft(userId: string, pageId: string, newTitle: string)`: Rename page
- `deletePageDraft(userId: string, pageId: string)`: Delete page with safety checks
- `addEmbedToPage(userId: string, pageId: string, embed: Embed)`: Add embeds/widgets

### `Renderer.tsx`
React component that renders website pages from JSON structure.

### `legal_pages.ts`
Automated legal page generation:
- `addLegalPagesToWebsite(userId: string)`: Generates Privacy Policy and Terms of Service

### `analytics.ts`
Analytics integration:
- `getAnalyticsSummary(userId: string)`: Fetches website analytics data

### `sitemap.ts`
SEO tools:
- `generateSitemap(website: Website)`: Generates sitemap.xml
- `pingSearchEngines(sitemapUrl: string)`: Notifies Google and Bing of updates

## Database Tables

### `websites`
Stores website structure and configuration:
- `id`: UUID primary key
- `user_id`: References auth.users
- `pages`: JSONB array of page objects
- `theme`: Website theme configuration
- `is_published`: Boolean publication status
- `subdomain`: Unique subdomain for published sites

### `website_analytics`
Stores analytics data (if using custom tracking).

## Page Structure

Each page contains:
- `id`: Unique page identifier
- `title`: Page title
- `slug`: URL-friendly identifier
- `sections`: Array of section components (Hero, Feature, Text, etc.)
- `seo`: SEO metadata (title, description, keywords)
- `schema`: Schema.org structured data

## Supported Section Types

- `Hero`: Hero section with CTA
- `Feature`: Feature showcase
- `Text`: Rich text content
- `ImageGallery`: Image gallery
- `Video`: Video embed
- `ContactForm`: Contact form section
- `Embed`: Custom embed/widget
- `Footer`: Footer section

## API Endpoints

- `GET /api/website/me`: Get user's website
- `POST /api/website/save`: Save website changes
- `POST /api/website/publish`: Publish website
- `POST /api/website/unpublish`: Unpublish website
- `GET /api/analytics/summary`: Get analytics summary

## Integration Points

### Module 1 (Chat Core)
Receives commands from orchestrator:
- `CREATE_WEBSITE`
- `CREATE_PAGE`
- `DELETE_PAGE`
- `RENAME_PAGE`
- `UPDATE_PAGE_CONTENT`
- `ADD_EMBED`
- `GENERATE_LEGAL_PAGES`
- `GET_ANALYTICS`

### Module 4 (SEO)
- Receives SEO opportunity suggestions
- Generates Schema.org markup
- Creates sitemap.xml and robots.txt

## Usage Example

```typescript
import { generatePageWithAI } from '@/libs/website-builder/src/generator'

const page = await generatePageWithAI({
  userId: 'user-123',
  title: 'About Us',
  profile: businessProfile,
  focusKeyword: 'local business'
})
```

