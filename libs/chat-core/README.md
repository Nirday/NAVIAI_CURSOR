# Module 1: Conversational AI Core

The **Conversational AI Core** is the foundational module that powers Navi AI's chat interface. It serves as the central orchestrator that manages stateful conversations, understands user intent, and coordinates actions across all other modules.

## Overview

This module provides:
- **AI Orchestrator**: Central conversational engine with intent recognition
- **Business Profile Management**: CRUD operations for business profiles
- **Website Scraper**: Automated profile extraction from existing websites
- **RAG Pipeline**: Retrieval-Augmented Generation for profile context
- **Suggestion Engine**: Proactive suggestions and "Aha!" moments
- **Chat History**: Persistent conversation storage and retrieval

## Key Components

### `orchestrator.ts`
The main conversational engine that:
- Processes user messages with context from chat history
- Analyzes intent using GPT-4
- Handles onboarding for new users
- Dispatches action commands to other modules
- Saves conversation history

**Main Function**: `processUserMessage(userId: string, message: string): Promise<string>`

### `profile.ts`
Business profile management functions:
- `getProfile(userId: string)`: Fetch user's business profile
- `createProfile(userId: string, profile: BusinessProfile)`: Create new profile
- `updateProfile(userId: string, updates: Partial<BusinessProfile>)`: Update profile with intelligent merging
- `deleteProfile(userId: string)`: Delete profile

### `scraper.ts`
Website scraping for onboarding:
- `scrapeWebsiteForProfile(url: string)`: Extracts business information from a website URL
- Uses Cheerio for static content and Puppeteer for dynamic content
- AI-powered extraction to parse unstructured data into structured profile

### `rag.ts`
Retrieval-Augmented Generation pipeline:
- `updateProfileEmbeddings(profile: BusinessProfile)`: Generates and stores embeddings
- `queryProfile(userId: string, queryText: string, matchCount: number)`: Semantic search over profile data
- Uses OpenAI embeddings and Supabase pgvector extension

### `suggestion_engine.ts`
Proactive suggestion system:
- `getSuggestedPrompts(userId: string, profile?: BusinessProfile, website?: any)`: Generates contextual suggestions
- "Aha!" moment detection (immediate value after profile completion)
- Gap analysis (missing profile information)
- Goal-based framing

### `types.ts`
Core type definitions:
- `BusinessProfile`: Complete business information structure
- `ChatMessage`: Conversation message with persistence
- `IntentAnalysis`: AI intent recognition result
- `ConversationHistory`: Chat history structure

## Supported Intents

The orchestrator recognizes and handles these intents:

- `UPDATE_PROFILE`: Update business profile information
- `USER_CORRECTION`: Handle user corrections
- `CREATE_WEBSITE`: Generate or update website
- `WRITE_BLOG`: Create blog content
- `CREATE_PAGE`: Add new website page
- `DELETE_PAGE`: Remove website page
- `RENAME_PAGE`: Rename page title
- `UPDATE_PAGE_CONTENT`: Modify page content
- `GENERATE_LEGAL_PAGES`: Create Privacy Policy and Terms of Service
- `GET_ANALYTICS`: Query website analytics
- `ADD_EMBED`: Add embed/widget to page
- `BILLING_QUESTION`: Handle billing-related questions
- `GET_SUGGESTIONS`: Get proactive suggestions
- `UNKNOWN`: Fallback for unclear intents

## Database Tables

### `business_profiles`
Stores complete business information with flexible JSONB structure for custom attributes.

### `chat_messages`
Persistent chat history:
- `message_id`: UUID primary key
- `user_id`: References auth.users
- `role`: 'user' | 'assistant'
- `content`: Message text
- `timestamp`: When message was sent

### `profile_embeddings`
Vector embeddings for RAG:
- `user_id`: References auth.users
- `content`: Text content that was embedded
- `embedding`: Vector embedding (pgvector)

### `suggestion_prompts`
Stores suggested prompts to prevent duplicates:
- `user_id`: References auth.users
- `prompt_text`: The suggestion text
- `metadata`: Additional context (JSONB)
- `created_at`: Timestamp

## Integration Points

### Action Queue
The orchestrator dispatches commands to the Action Queue for other modules:
- `ADD_WEBSITE_BLOG_POST`
- `CREATE_SOCIAL_POST_DRAFT`
- `UPDATE_WEBSITE_CONTENT`
- And more...

### Module Dependencies
- **Website Builder**: Page creation, updates, embeds
- **Content Engine**: Blog post generation
- **Billing Hub**: Billing question handling
- **SEO Audit**: SEO opportunity suggestions

## Usage Example

```typescript
import { processUserMessage } from '@/libs/chat-core/src/orchestrator'

// Process a user message
const response = await processUserMessage(userId, "Create a website for my business")
// Returns: "I'll help you create a website! Let me gather some information..."
```

## API Endpoints

- `POST /api/chat/send`: Send a message to the orchestrator
- `GET /api/chat/messages`: Retrieve chat history
- `GET /api/suggestions`: Get proactive suggestions

## Configuration

Requires OpenAI API key:
```env
OPENAI_API_KEY=your_key_here
```

## Testing

See `scripts/test-page-management.ts` for example usage of the orchestrator.

