# Testing Guide

This document explains how to run tests for the Navi AI platform.

## Setup

Install dependencies:
```bash
npm install
```

## Unit Tests (Vitest)

Unit tests are located alongside source files with `.test.ts` extensions.

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests with UI
```bash
npm run test:ui
```

### Run specific test file
```bash
npm test page_ops.test.ts
```

## Manual Test Scripts

Manual test scripts test end-to-end flows that require real API connections.

### Page Management Flow

Test conversational page management (Task 2.8):

```bash
npm run test:page-management <userId>
```

Or with environment variable:
```bash
TEST_USER_ID=your-user-id npm run test:page-management
```

**Prerequisites:**
- User must have a business profile
- User must have a website draft (generate one via chat first)
- Environment variables set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY`

**What it tests:**
1. Creating new pages (CREATE_PAGE)
2. Renaming pages (RENAME_PAGE)
3. Deleting pages with confirmation (DELETE_PAGE)
4. Plan limit enforcement
5. Before/after diff summaries

**Output:**
- Prints each test scenario
- Shows user message and AI response
- Indicates pass/fail based on expected response patterns
- Provides next steps for verification

## Test Files

### Unit Tests
- `libs/website-builder/src/page_ops.test.ts` - Page operations (create/rename/delete)

### Manual Test Scripts
- `scripts/test-page-management.ts` - End-to-end page management flow

## Writing New Tests

### Unit Tests

Create a `.test.ts` file next to your source file:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { myFunction } from './my-module'

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expected)
  })
})
```

### Manual Test Scripts

Create a script in `scripts/` directory:

```typescript
import { processUserMessage } from '../libs/chat-core/src/orchestrator'

async function main() {
  const response = await processUserMessage(userId, 'test message')
  console.log(response)
}

main().catch(console.error)
```

Add script to `package.json`:
```json
{
  "scripts": {
    "test:my-feature": "tsx scripts/test-my-feature.ts"
  }
}
```

## CI/CD Integration

For CI/CD pipelines, run unit tests:
```bash
npm test -- --run
```

Manual test scripts require environment setup and should be run manually or in staging environments.

