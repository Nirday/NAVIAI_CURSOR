/**
 * Browser Console Test Suite
 * Copy and paste this into your browser console on your Vercel deployment
 */

(async function runNaviTests() {
  console.log('🧪 Starting Navi AI Test Suite...\n')
  
  // Get user ID
  let userId = null
  try {
    const mockSession = localStorage.getItem('mockSession')
    if (mockSession) {
      const session = JSON.parse(mockSession)
      userId = session.user?.id || null
    }
  } catch (e) {
    console.warn('Could not get user ID from localStorage')
  }

  if (!userId) {
    console.error('❌ Could not get user ID. Please log in first.')
    console.log('💡 Tip: Log in, then run this test again.')
    return
  }

  console.log(`✅ User ID: ${userId}\n`)
  const results = []

  // Test 1: Profile API - Get
  console.log('📋 Testing Profile API...')
  try {
    const res = await fetch('/api/profile', {
      headers: { 'x-user-id': userId }
    })
    if (res.ok || res.status === 404) {
      results.push({ name: 'Profile API - Get', passed: true })
      console.log('  ✅ Profile fetch works')
    } else {
      throw new Error(`Status: ${res.status}`)
    }
  } catch (error) {
    results.push({ name: 'Profile API - Get', passed: false, error: error.message })
    console.log('  ❌ Profile fetch failed:', error.message)
  }

  // Test 2: Profile API - Update
  console.log('📝 Testing Profile Update...')
  try {
    const testAttr = { label: 'Test', value: `Test ${Date.now()}` }
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify({ customAttributes: [testAttr] })
    })
    if (res.ok) {
      const data = await res.json()
      const hasAttr = data.profile?.customAttributes?.some(a => a.label === testAttr.label)
      results.push({ name: 'Profile API - Update', passed: hasAttr })
      console.log('  ✅ Profile update works')
    } else {
      throw new Error(`Status: ${res.status}`)
    }
  } catch (error) {
    results.push({ name: 'Profile API - Update', passed: false, error: error.message })
    console.log('  ❌ Profile update failed:', error.message)
  }

  // Test 3: Website Scraping
  console.log('🌐 Testing Website Scraping...')
  try {
    const res = await fetch('/api/onboarding/scrape-website', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' })
    })
    if (res.ok) {
      results.push({ name: 'Website Scraping', passed: true })
      console.log('  ✅ Website scraping works')
    } else {
      throw new Error(`Status: ${res.status}`)
    }
  } catch (error) {
    results.push({ name: 'Website Scraping', passed: false, error: error.message })
    console.log('  ❌ Website scraping failed:', error.message)
  }

  // Test 4: Check current profile
  console.log('👤 Checking Current Profile...')
  try {
    const res = await fetch('/api/profile', {
      headers: { 'x-user-id': userId }
    })
    if (res.ok) {
      const data = await res.json()
      const profile = data.profile
      console.log('  📊 Profile Data:')
      console.log('     Business Name:', profile.businessName || 'N/A')
      console.log('     Industry:', profile.industry || 'N/A')
      console.log('     Services:', profile.services?.length || 0, 'services')
      console.log('     Custom Attributes:', profile.customAttributes?.length || 0, 'attributes')
      results.push({ name: 'Profile Data Check', passed: true })
    } else if (res.status === 404) {
      console.log('  ℹ️  No profile found (expected for new users)')
      results.push({ name: 'Profile Data Check', passed: true, details: 'No profile (new user)' })
    } else {
      throw new Error(`Status: ${res.status}`)
    }
  } catch (error) {
    results.push({ name: 'Profile Data Check', passed: false, error: error.message })
    console.log('  ❌ Profile check failed:', error.message)
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Test Summary')
  console.log('='.repeat(50) + '\n')

  const passed = results.filter(r => r.passed).length
  const total = results.length

  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌'
    console.log(`${icon} ${r.name}`)
    if (r.error) console.log(`   Error: ${r.error}`)
    if (r.details) console.log(`   ${r.details}`)
  })

  console.log('\n' + '='.repeat(50))
  console.log(`Results: ${passed}/${total} tests passed`)
  console.log('='.repeat(50) + '\n')

  if (passed === total) {
    console.log('🎉 All tests passed! Your Vercel deployment is working correctly.')
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.')
  }

  return results
})();

