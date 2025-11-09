/**
 * Manual Test Script for Conversational Page Management (Task 2.8)
 * 
 * Usage:
 *   npx tsx scripts/test-page-management.ts <userId>
 * 
 * Prerequisites:
 *   - User must have a business profile
 *   - User must have a website draft (run website generation first)
 *   - Set x-user-id header or pass as argument
 */

import { processUserMessage } from '../libs/chat-core/src/orchestrator'

const TEST_USER_ID = process.argv[2] || process.env.TEST_USER_ID || 'test-user-id'

const testScenarios = [
  {
    name: '1. CREATE_PAGE - Add Gallery page',
    message: 'Add a Gallery page to my website',
    expected: 'Done! I created the',
  },
  {
    name: '2. CREATE_PAGE - Add Pricing page',
    message: 'Create a Pricing page',
    expected: 'Done! I created the',
  },
  {
    name: '3. RENAME_PAGE - Rename About to Our Story',
    message: 'Rename the About page to Our Story',
    expected: 'Okay, I renamed the page',
  },
  {
    name: '4. DELETE_PAGE - Attempt delete (should ask for confirmation)',
    message: 'Delete the Gallery page',
    expected: 'Please confirm',
  },
  {
    name: '5. DELETE_PAGE - Confirm deletion',
    message: 'Yes, delete it',
    expected: "I've deleted the page",
  },
  {
    name: '6. PLAN_LIMIT - Test limit enforcement (if at limit)',
    message: 'Add another page called Test',
    expected: 'plan limit', // May or may not trigger depending on current count
  },
]

async function runTest(scenario: typeof testScenarios[0]) {
  console.log(`\n${scenario.name}`)
  console.log(`User: "${scenario.message}"`)
  console.log('---')
  
  try {
    const response = await processUserMessage(TEST_USER_ID, scenario.message)
    console.log(`AI: ${response}`)
    
    if (response.includes(scenario.expected)) {
      console.log('✅ PASS - Response contains expected text')
    } else {
      console.log(`⚠️  PARTIAL - Expected "${scenario.expected}" but got different response`)
    }
  } catch (error: any) {
    console.error(`❌ FAIL - Error: ${error.message}`)
    console.error(error.stack)
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('Conversational Page Management Test Flow')
  console.log('='.repeat(60))
  console.log(`Test User ID: ${TEST_USER_ID}`)
  console.log('\n⚠️  Note: This script requires:')
  console.log('   - Active Supabase connection')
  console.log('   - Valid OpenAI API key')
  console.log('   - User must have business profile and website draft')
  console.log('   - Set NEXT_PUBLIC_SUPABASE_URL and OPENAI_API_KEY env vars')
  console.log('='.repeat(60))

  for (const scenario of testScenarios) {
    await runTest(scenario)
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n' + '='.repeat(60))
  console.log('Test Flow Complete')
  console.log('='.repeat(60))
  console.log('\nNext steps:')
  console.log('1. Check /api/website/me to verify draft changes')
  console.log('2. Open dashboard to see updated page list')
  console.log('3. Verify published sites are unaffected')
}

if (require.main === module) {
  main().catch(console.error)
}

export { runTest, testScenarios }

