# Module 4: SEO Growth Engine

The **SEO Growth Engine** module provides automated SEO audits, keyword tracking, competitive analysis, and local SEO optimization. It helps businesses improve their search engine visibility.

## Overview

This module provides:
- **Automated Website Audits**: Comprehensive SEO health checks
- **Keyword Rank Tracking**: Daily rank monitoring for target keywords
- **Competitive Analysis**: Track competitor rankings and strategies
- **Local SEO**: Citation analysis and NAP consistency checks
- **AI Fixes**: Automated SEO issue resolution
- **Monthly Reporting**: Automated performance reports

## Key Components

### `crawler.ts`
Website crawling and analysis:
- `runWebsiteAudit(websiteUrl: string)`: Crawls website and identifies SEO issues
- Checks: Title tags, meta descriptions, H1 tags, alt text, robots.txt, sitemap.xml
- Returns array of `SeoIssue` objects

### `keyword_tracker.ts`
Keyword rank tracking:
- `runDailyRankTracker()`: Daily job to update keyword rankings
- Tracks user and competitor keywords
- Localized rank tracking (location-based)

### `strategist.ts`
Competitive analysis:
- `runCompetitiveStrategist()`: Weekly job for competitive insights
- AI-generated insights: content gaps, keyword opportunities, celebrations

### `local_citation.ts`
Local SEO analysis:
- `analyzeLocalCitations(userId: string)`: Checks NAP consistency
- Identifies missing citations on major platforms
- Tracks citation quality

### `fixer.ts`
Automated SEO fixes:
- `applySeoFix(issueId: string)`: Applies AI-generated fixes
- Dispatches fixes via Action Queue to Website Builder

### `best_practices.ts`
AI best practices engine:
- `updateSeoKnowledgeBase()`: Monthly job to research SEO trends
- Creates `SeoOpportunity` records for admin review

### `scheduler.ts`
Scheduled jobs coordinator:
- `runWeeklyHealthAudits()`: Weekly audit scheduling
- `runDailyRankTracker()`: Daily rank updates
- `runCompetitiveStrategist()`: Weekly competitive analysis
- `updateSeoKnowledgeBase()`: Monthly knowledge base updates
- `generateAndSendMonthlyReports()`: Monthly report generation

## Database Tables

### `seo_audit_reports`
Stores audit results:
- `id`: UUID primary key
- `user_id`: References auth.users
- `website_url`: Website being audited
- `health_score`: Overall SEO score (0-100)
- `issues`: Array of SEO issues (JSONB)
- `created_at`: Audit timestamp

### `seo_issues`
Individual SEO issues:
- `id`: UUID primary key
- `user_id`: References auth.users
- `type`: 'missing_title' | 'missing_meta' | 'missing_h1' | 'missing_alt' | etc.
- `severity`: 'high' | 'medium' | 'low'
- `page_url`: Affected page
- `status`: 'pending' | 'fixed' | 'ignored'

### `keyword_performance`
Keyword rank tracking:
- `id`: UUID primary key
- `user_id`: References auth.users
- `keyword`: Target keyword
- `location`: Geographic location
- `current_rank`: Current Google rank
- `previous_rank`: Previous rank
- `tracked_at`: Last update timestamp

### `competitive_insights`
Competitor analysis:
- `id`: UUID primary key
- `user_id`: References auth.users
- `competitor_domain`: Competitor website
- `insight_type`: 'content_gap' | 'keyword_opportunity' | 'celebration'
- `description`: AI-generated insight
- `created_at`: Insight timestamp

### `seo_opportunities`
AI-generated opportunities (admin-gated):
- `id`: UUID primary key
- `user_id`: References auth.users (nullable for global)
- `title`: Opportunity title
- `description`: Detailed description
- `category`: Opportunity category
- `status`: 'pending_review' | 'approved' | 'rejected'
- `suggested_action`: Recommended action

### `local_citations`
Local citation tracking:
- `id`: UUID primary key
- `user_id`: References auth.users
- `platform`: 'google' | 'yelp' | 'apple_maps' | etc.
- `url`: Citation URL
- `nap_data`: Name, Address, Phone (JSONB)
- `is_consistent`: Boolean consistency check

## SEO Issue Types

- `missing_title`: Missing or empty title tag
- `missing_meta`: Missing meta description
- `missing_h1`: Missing H1 tag
- `missing_alt`: Missing alt text on images
- `duplicate_title`: Duplicate title tags
- `duplicate_meta`: Duplicate meta descriptions
- `long_title`: Title tag too long
- `long_meta`: Meta description too long
- `no_robots_txt`: Missing robots.txt
- `no_sitemap`: Missing sitemap.xml

## API Endpoints

- `GET /api/seo/audit-report`: Get latest audit report
- `GET /api/seo/issues`: List SEO issues
- `POST /api/seo/fix`: Apply automated fix
- `GET /api/seo/keyword-performance`: Get keyword rankings
- `GET /api/seo/monthly-report`: Get monthly performance report

## Integration Points

### Module 1 (Chat Core)
Provides SEO opportunity suggestions to orchestrator.

### Module 2 (Website Builder)
Receives `UPDATE_WEBSITE_CONTENT` commands for SEO fixes.

### Module 10 (Admin Center)
Admin reviews and approves `SeoOpportunity` records.

## Scheduled Jobs

- `runWeeklyHealthAudits()`: Weekly (Monday 2 AM UTC)
- `runDailyRankTracker()`: Daily (6 AM UTC)
- `runCompetitiveStrategist()`: Weekly (Sunday 2 AM UTC)
- `updateSeoKnowledgeBase()`: Monthly (1st of month, 2 AM UTC)
- `generateAndSendMonthlyReports()`: Monthly (1st of month, 8 AM UTC)

## Usage Example

```typescript
import { runWebsiteAudit } from '@/libs/seo-audit/src/crawler'

const issues = await runWebsiteAudit('https://example.com')
// Returns array of SEO issues to fix
```

