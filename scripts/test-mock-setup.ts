#!/usr/bin/env tsx
/**
 * Test script to verify mock setup is working correctly
 * Run with: npm run test:mock-setup
 * Or: tsx scripts/test-mock-setup.ts
 */

// Set mock mode before any imports
process.env.NEXT_PUBLIC_USE_MOCK_DATA = 'true'

import { getWebsiteByUserId, getPublishedWebsiteByDomain } from '../libs/website-builder/src/data'

async function testMockSetup() {
  console.log('🧪 Testing mock data setup...\n')

  try {
    // Test 1: Get website by user ID
    console.log('Test 1: Get website by user ID')
    const website = await getWebsiteByUserId('mock-user-123')
    if (website) {
      console.log('✅ Successfully retrieved website:', website.name)
      console.log(`   - Pages: ${website.pages.length}`)
      console.log(`   - Theme: ${website.theme.colorPalette.primary}`)
    } else {
      console.log('❌ Failed to retrieve website')
      process.exit(1)
    }

    // Test 2: Get published website by domain
    console.log('\nTest 2: Get published website by domain')
    const publishedWebsite = await getPublishedWebsiteByDomain('bellas-bakery.naviai.local')
    if (publishedWebsite) {
      console.log('✅ Successfully retrieved published website:', publishedWebsite.name)
    } else {
      console.log('❌ Failed to retrieve published website')
      process.exit(1)
    }

    // Test 3: Verify website structure
    console.log('\nTest 3: Verify website structure')
    const hasHomePage = website.pages.some(p => p.slug === 'home')
    const hasMenuPage = website.pages.some(p => p.slug === 'menu')
    const hasPrimaryCta = !!website.primaryCta

    if (hasHomePage && hasMenuPage && hasPrimaryCta) {
      console.log('✅ Website structure is valid')
      console.log(`   - Home page: ${hasHomePage}`)
      console.log(`   - Menu page: ${hasMenuPage}`)
      console.log(`   - Primary CTA: ${hasPrimaryCta}`)
    } else {
      console.log('❌ Website structure is invalid')
      process.exit(1)
    }

    console.log('\n✨ All tests passed! Mock setup is working correctly.')
    console.log('\nTo start the dev server, run: npm run dev')
    console.log('Then access the API at: http://localhost:3000/api/website/me')
    console.log('With header: x-user-id: mock-user-123')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testMockSetup()

