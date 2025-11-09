# Website Editor V1.5 Implementation

## Overview
V1.5 adds a form-based website editor and Google Bot Ping functionality to address the "AI prison" concern and ensure manual website changes are indexed by Google quickly.

## Features Implemented

### 1. Form-Based Website Editor
- **Location**: `/dashboard/website`
- **Component**: `apps/dashboard/components/WebsiteEditor.tsx`
- **Features**:
  - Simple form-based editor (not drag-and-drop)
  - Page navigation sidebar
  - Section-by-section editing (Hero, Feature, Text, Image Gallery, etc.)
  - Meta title and description editing per page
  - "Save & Publish" button (no separate draft state)
  - Unsaved changes warning
  - Google Search Console connection status indicator

### 2. API Endpoint: `/api/website/update`
- **Location**: `app/api/website/update/route.ts`
- **Features**:
  - Full object replacement (not partial updates)
  - Zod validation against Website TypeScript interface
  - Field-level error responses
  - Transaction #1: Save to database
  - Transaction #2: Publish website (asynchronous, non-blocking)
  - Graceful error handling (data saved even if publish fails)

### 3. Google Search Console Integration
- **OAuth Service**: `libs/connections-hub/src/search_console_oauth.ts`
  - OAuth scope: `https://www.googleapis.com/auth/webmasters`
  - Token refresh support
- **Sitemaps API Service**: `libs/website-builder/src/google_sitemaps.ts`
  - Submits sitemap.xml URL to Google Search Console
  - Handles token refresh automatically
  - Non-blocking (logs errors but doesn't fail publish)
- **OAuth Callback**: `app/api/auth/callback/search-console/route.ts`
- **OAuth Initiate**: `app/api/auth/callback/search-console/initiate/route.ts`

### 4. Publisher Enhancement
- **Location**: `libs/website-builder/src/publisher.ts`
- **Enhancement**: `publishWebsite` function now:
  1. Saves website to database
  2. Generates static HTML/CSS/sitemap.xml (if applicable)
  3. Pings Google Sitemaps API (non-blocking)
  4. Updates `last_google_ping_at` timestamp

### 5. Database Schema Updates
- **File**: `scripts/website-editor-schema-update.sql`
- **Changes**:
  - Added `last_google_ping_at` column to `websites` table
  - Added `google_search_console` to `social_connections.platform` CHECK` constraint

### 6. Validation
- **Location**: `libs/website-builder/src/validation.ts`
- **Features**:
  - Zod schema for Website TypeScript interface
  - Field-level validation
  - Date parsing support

### 7. Navigation
- **Component**: `apps/dashboard/components/DashboardNavigation.tsx`
- **New Item**: "Website" navigation link (🌐) added to main dashboard navigation

## Technical Details

### Validation Rules
- Client-side: Basic validation (required fields, etc.)
- Server-side: Zod validation against TypeScript interface
- No character limits or max page counts for V1.5
- Field-level error responses

### Update Strategy
- Full object replacement (not partial)
- "Last write wins" (no concurrency handling in V1.5)
- Deletions handled by omission from new JSON

### Publishing Workflow
1. User clicks "Save & Publish"
2. Frontend sends complete WebsiteData JSON
3. Backend validates with Zod
4. Transaction #1: Save to database
5. Transaction #2: Publish (async, non-blocking)
   - Updates status to 'published'
   - Generates static files (if applicable)
   - Pings Google Sitemaps API
   - Updates `last_google_ping_at`

### Google Bot Ping
- **API**: Google Search Console Sitemaps API
- **Method**: Submit entire sitemap.xml URL
- **Frequency**: Once per publish (no batching)
- **Error Handling**: 
  - If not connected: Shows warning in UI, doesn't fail publish
  - If ping fails: Logs error, doesn't fail publish
  - No auto-retry (next publish will ping again)

### UI Features
- Form-based editing (no drag-and-drop)
- Page navigation sidebar
- Collapsible section forms
- "Add New Service" button (generates UUID client-side)
- Image upload/AI generation buttons (UI ready, backend integration pending)
- Unsaved changes warning (beforeunload event)
- Google Search Console connection status indicator

## Files Created/Modified

### New Files
1. `apps/dashboard/components/WebsiteEditor.tsx` - Main form-based editor component
2. `apps/dashboard/components/DashboardNavigation.tsx` - Navigation component with Website link
3. `libs/website-builder/src/publisher.ts` - Enhanced publisher with Google ping
4. `libs/website-builder/src/validation.ts` - Zod validation schema
5. `libs/website-builder/src/google_sitemaps.ts` - Google Sitemaps API service
6. `libs/connections-hub/src/search_console_oauth.ts` - Google Search Console OAuth
7. `app/api/website/update/route.ts` - Update endpoint
8. `app/api/auth/callback/search-console/route.ts` - OAuth callback
9. `app/api/auth/callback/search-console/initiate/route.ts` - OAuth initiate
10. `scripts/website-editor-schema-update.sql` - Database schema updates

### Modified Files
1. `app/dashboard/website/page.tsx` - Updated to use new WebsiteEditor component
2. `libs/website-builder/src/data.ts` - Added `updateWebsiteData` function
3. `supabase-schema.sql` - Added `google_search_console` to platform CHECK constraint

## Environment Variables Required
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `NEXT_PUBLIC_APP_URL` - Base URL for OAuth redirects

## Dependencies
- `zod` - Already installed (via openai/puppeteer dependencies)

## Next Steps (V2)
- Image upload backend integration
- AI image generation integration
- Live preview
- Drag-and-drop reordering
- Version control/history
- Real-time syncing between Chat and Form Editor

