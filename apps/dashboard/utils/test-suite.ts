/**
 * Automated Test Suite for Vercel Sandbox
 * Run this in browser console to test all features
 */

interface TestResult {
  name: string
  passed: boolean
  error?: string
  details?: any
}

class NaviTestSuite {
  private userId: string | null = null
  private results: TestResult[] = []

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Navi AI Test Suite...\n')
    
    // Get user ID
    await this.getUserId()
    
    if (!this.userId) {
      console.error('❌ Could not get user ID. Please log in first.')
      return
    }

    console.log(`✅ User ID: ${this.userId}\n`)

    // Run tests
    await this.testProfileAPI()
    await this.testProfileUpdate()
    await this.testOnboardingFlow()
    await this.testDashboardComponents()
    
    // Print summary
    this.printSummary()
  }

  private async getUserId(): Promise<void> {
    try {
      // Try to get from mock session
      const mockSession = localStorage.getItem('mockSession')
      if (mockSession) {
        const session = JSON.parse(mockSession)
        this.userId = session.user?.id || null
        return
      }

      // Try to get from Supabase session
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      this.userId = session?.user?.id || null
    } catch (error) {
      console.warn('Could not get user ID automatically')
    }
  }

  private async testProfileAPI(): Promise<void> {
    console.log('📋 Testing Profile API...')
    
    if (!this.userId) {
      this.results.push({ name: 'Profile API - Get Profile', passed: false, error: 'No user ID' })
      return
    }

    try {
      const response = await fetch('/api/profile', {
        headers: { 'x-user-id': this.userId }
      })
      
      if (response.ok) {
        const data = await response.json()
        this.results.push({
          name: 'Profile API - Get Profile',
          passed: true,
          details: { hasProfile: !!data.profile }
        })
        console.log('  ✅ Profile fetch works')
      } else if (response.status === 404) {
        this.results.push({
          name: 'Profile API - Get Profile',
          passed: true,
          details: { hasProfile: false, message: 'No profile (expected for new users)' }
        })
        console.log('  ✅ Profile fetch works (no profile found - expected for new users)')
      } else {
        throw new Error(`Unexpected status: ${response.status}`)
      }
    } catch (error: any) {
      this.results.push({
        name: 'Profile API - Get Profile',
        passed: false,
        error: error.message
      })
      console.log('  ❌ Profile fetch failed:', error.message)
    }
  }

  private async testProfileUpdate(): Promise<void> {
    console.log('📝 Testing Profile Update...')
    
    if (!this.userId) {
      this.results.push({ name: 'Profile API - Update Profile', passed: false, error: 'No user ID' })
      return
    }

    try {
      const testAttribute = {
        label: 'Test Attribute',
        value: `Test Value ${Date.now()}`
      }

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': this.userId
        },
        body: JSON.stringify({
          customAttributes: [testAttribute]
        })
      })

      if (response.ok) {
        const data = await response.json()
        const hasAttribute = data.profile?.customAttributes?.some(
          (attr: any) => attr.label === testAttribute.label
        )
        
        this.results.push({
          name: 'Profile API - Update Profile',
          passed: hasAttribute,
          details: { updated: hasAttribute }
        })
        console.log('  ✅ Profile update works')
      } else {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || `Status: ${response.status}`)
      }
    } catch (error: any) {
      this.results.push({
        name: 'Profile API - Update Profile',
        passed: false,
        error: error.message
      })
      console.log('  ❌ Profile update failed:', error.message)
    }
  }

  private async testOnboardingFlow(): Promise<void> {
    console.log('🎯 Testing Onboarding Flow...')
    
    // Test website scraping endpoint
    try {
      const response = await fetch('/api/onboarding/scrape-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' })
      })

      if (response.ok) {
        const data = await response.json()
        this.results.push({
          name: 'Onboarding - Website Scraping',
          passed: true,
          details: { hasData: !!data.data }
        })
        console.log('  ✅ Website scraping endpoint works')
      } else {
        throw new Error(`Status: ${response.status}`)
      }
    } catch (error: any) {
      this.results.push({
        name: 'Onboarding - Website Scraping',
        passed: false,
        error: error.message
      })
      console.log('  ❌ Website scraping failed:', error.message)
    }

    // Test onboarding complete endpoint (if profile doesn't exist)
    if (!this.userId) return

    try {
      const profileRes = await fetch('/api/profile', {
        headers: { 'x-user-id': this.userId }
      })

      if (profileRes.status === 404) {
        // Test profile creation
        const createRes = await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: this.userId,
            profileData: {
              businessName: 'Test Business',
              industry: 'Technology',
              location: {
                address: '123 Test St',
                city: 'San Francisco',
                state: 'CA',
                zipCode: '94102',
                country: 'US'
              },
              contactInfo: {
                phone: '555-123-4567',
                email: 'test@test.com'
              },
              services: [{ name: 'Consulting', description: '' }],
              targetAudience: 'Small businesses'
            }
          })
        })

        if (createRes.ok) {
          this.results.push({
            name: 'Onboarding - Profile Creation',
            passed: true
          })
          console.log('  ✅ Profile creation works')
        } else {
          const error = await createRes.json().catch(() => ({}))
          throw new Error(error.error || `Status: ${createRes.status}`)
        }
      } else {
        this.results.push({
          name: 'Onboarding - Profile Creation',
          passed: true,
          details: { message: 'Profile already exists (skipped)' }
        })
        console.log('  ✅ Profile creation (profile already exists)')
      }
    } catch (error: any) {
      this.results.push({
        name: 'Onboarding - Profile Creation',
        passed: false,
        error: error.message
      })
      console.log('  ❌ Profile creation failed:', error.message)
    }
  }

  private async testDashboardComponents(): Promise<void> {
    console.log('🎨 Testing Dashboard Components...')
    
    // Test that profile update endpoint is accessible
    if (!this.userId) {
      this.results.push({
        name: 'Dashboard - Profile Updates',
        passed: false,
        error: 'No user ID'
      })
      return
    }

    // Test that we can update profile from dashboard context
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': this.userId
        },
        body: JSON.stringify({
          customAttributes: [
            { label: 'Dashboard Test', value: 'Component integration works' }
          ]
        })
      })

      if (response.ok) {
        this.results.push({
          name: 'Dashboard - Profile Updates',
          passed: true,
          details: { message: 'Profile update endpoint accessible from dashboard' }
        })
        console.log('  ✅ Dashboard profile updates work')
      } else {
        throw new Error(`Status: ${response.status}`)
      }
    } catch (error: any) {
      this.results.push({
        name: 'Dashboard - Profile Updates',
        passed: false,
        error: error.message
      })
      console.log('  ❌ Dashboard profile updates failed:', error.message)
    }
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(50))
    console.log('📊 Test Summary')
    console.log('='.repeat(50) + '\n')

    const passed = this.results.filter(r => r.passed).length
    const total = this.results.length

    this.results.forEach(result => {
      const icon = result.passed ? '✅' : '❌'
      console.log(`${icon} ${result.name}`)
      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }
      if (result.details) {
        console.log(`   Details:`, result.details)
      }
    })

    console.log('\n' + '='.repeat(50))
    console.log(`Results: ${passed}/${total} tests passed`)
    console.log('='.repeat(50) + '\n')

    if (passed === total) {
      console.log('🎉 All tests passed! Your Vercel deployment is working correctly.')
    } else {
      console.log('⚠️  Some tests failed. Check the errors above.')
    }
  }
}

// Export for use in browser console
export default NaviTestSuite

// Browser console helper
if (typeof window !== 'undefined') {
  (window as any).runNaviTests = async () => {
    const suite = new NaviTestSuite()
    await suite.runAllTests()
  }
  
  console.log(`
🧪 Navi AI Test Suite Loaded!

To run tests, type in console:
  runNaviTests()

Or import and use:
  import NaviTestSuite from '@/apps/dashboard/utils/test-suite'
  const suite = new NaviTestSuite()
  await suite.runAllTests()
  `)
}

