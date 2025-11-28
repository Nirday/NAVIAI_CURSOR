# Vercel Sandbox Testing Guide

Complete guide to test all features in your Vercel deployment.

## 🚀 Quick Start

1. **Access your Vercel deployment:**
   - Go to your Vercel dashboard
   - Find your project's deployment URL (e.g., `https://your-project.vercel.app`)
   - Or use the preview URL from a recent commit

2. **Open Browser DevTools:**
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Go to **Console** tab to see logs
   - Go to **Network** tab to monitor API calls

## 📋 Testing Checklist

### Phase 1: Authentication & Login

#### ✅ Test Login Flow
1. Navigate to `/login`
2. **Test Demo Credentials:**
   - Email: `demo@naviai.com`
   - Password: `demo123`
3. **Expected:**
   - Login succeeds
   - Redirects to `/dashboard`
   - No flickering or redirect loops
   - Session persists on page refresh

#### ✅ Test Mock Mode (if enabled)
- Check browser console for: `🔧 Using mock Supabase client`
- Login should work without real Supabase credentials

**How to verify:**
```javascript
// In browser console:
localStorage.getItem('mockSession') // Should return session data
```

---

### Phase 2: Onboarding Flow (First-Time User)

#### ✅ Test Website Check (Phase -1)
1. **Scenario A: User has website**
   - Answer: `https://example.com` or any URL
   - **Expected:**
     - Shows "Jackpot! 🕵️‍♀️ I'm scanning..."
     - Extracts business data
     - Jumps to Review phase
     - Shows summary with extracted data

2. **Scenario B: User has no website**
   - Answer: `no` or `not yet`
   - **Expected:**
     - Says "No problem at all! Let's build it together..."
     - Proceeds to Phase 0 (Discovery)

#### ✅ Test Discovery Phase (Phase 0)
- **Question:** "To kick things off, in a few words—what exactly does your business do?"
- **Test Inputs:**
  - `chiropractor` → Should detect as Appointment Pro
  - `pizza shop` → Should detect as Brick & Mortar
  - `mobile plumber` → Should detect as Service on Wheels
- **Expected:**
  - Never reveals archetype to user
  - Says "Awesome. Let's get you set up."
  - Proceeds to Phase 1

#### ✅ Test Storefront Phase (Phase 1)

**Business Name:**
- Input: `back in balance` (lowercase)
- **Expected:** Asks "Should I capitalize that as 'Back In Balance'?"
- Confirm: `yes`
- **Expected:** Proceeds to location

**Location (Brick & Mortar/Appointment Pro):**
- Input: `los altos` (just city)
- **Expected:** Asks "Los Altos is the city, but I need the street and number too!"
- Input: `949 Sherwood Ave`
- **Expected:** Asks for state
- Input: `CA` or `california`
- **Expected:** Proceeds to phone/email

**Location (Service on Wheels):**
- Input: `San Francisco, Oakland, Berkeley`
- **Expected:** Accepts area list, proceeds to phone/email

**Phone & Email (Combined):**
- Input: `123-456-7890 and test@test.com`
- **Expected:** Extracts both, validates format
- **Test Email Typo:**
  - Input: `test@test.vom`
  - **Expected:** Catches typo, suggests `test@test.com`
- **Test Partial Input:**
  - Input: `123-456-7890` (only phone)
  - **Expected:** Asks for email separately

**Social Links:**
- Input: `https://instagram.com/mybusiness` or `no`
- **Expected:** Accepts URLs or "no", proceeds to Review

#### ✅ Test Review Phase (After Storefront)
- **Shows Summary:**
  - Name, Address, Phone, Email, Socials
- **Test Confirmation:**
  - Input: `its good` or `yes` or `looks good`
  - **Expected:** Proceeds to Phase 2 (Menu)
- **Test Correction:**
  - Input: `email is wrong`
  - **Expected:** Asks what to change

#### ✅ Test Menu Phase (Phase 2)

**Services:**
- Input: `consulting` (vague)
- **Expected:** Asks "Nice! What specifically? Do you do financial consulting, IT, HR?"
- Input: `IT consulting, cloud migration, cybersecurity`
- **Expected:** Accepts, proceeds to Target Audience

**Target Audience:**
- Input: `Small business owners`
- **Expected:** Proceeds to Owner & Vibe

**Owner & Vibe:**
- Input: `Bob` (just first name)
- **Expected:** Asks "Hi Bob! Do you have a last name?"
- Input: `Bob Smith, Friendly & Professional`
- **Expected:** Extracts both, proceeds to Final Review

#### ✅ Test Final Review & Save
- **Shows Complete Summary**
- **Test Confirmation:**
  - Input: `yes` or `its good`
  - **Expected:**
    - Saves profile
    - Shows "Awesome! I'm setting everything up..."
    - Redirects to `/dashboard` after 1 second
    - Dashboard is unlocked

---

### Phase 3: Dashboard Components

#### ✅ Test Profile Creation
After onboarding completes:
1. Navigate to `/dashboard`
2. **Check Profile:**
   ```javascript
   // In browser console:
   fetch('/api/profile', { headers: { 'x-user-id': 'your-user-id' } })
     .then(r => r.json())
     .then(console.log)
   ```
3. **Expected:**
   - Profile exists
   - Contains all onboarding data
   - `verified: true` (or equivalent)

#### ✅ Test Website Builder
1. Navigate to `/dashboard` → Click "Website"
2. **Test Profile Update:**
   - Edit business name or contact info
   - Click "Save & Publish"
   - **Expected:**
     - Website saves
     - Profile updates automatically (check Network tab for PATCH /api/profile)

**How to verify profile update:**
```javascript
// Before save - check profile
// After save - check profile again
// Should see updated data
```

#### ✅ Test Social Hub
1. Navigate to `/dashboard` → Click "Social"
2. **Test Connection:**
   - Connect a social platform (if OAuth is set up)
   - **Expected:**
     - Connection appears in list
     - Profile updates with social links (check Network tab)

**How to verify:**
```javascript
// Check Network tab for PATCH /api/profile
// Should include customAttributes with Social Links
```

#### ✅ Test SEO Dashboard
1. Navigate to `/dashboard` → Click "SEO"
2. **Test Settings Save:**
   - Add keywords: `chiropractic, back pain, wellness`
   - Add location: `Los Altos, CA`
   - Click "Save Settings"
   - **Expected:**
     - Settings save
     - Profile updates with SEO keywords (check Network tab)

#### ✅ Test Content Dashboard
1. Navigate to `/dashboard` → Click "Content"
2. **Test Settings:**
   - Set target platforms: `Facebook, Instagram`
   - Set primary business goal CTA
   - Click "Save"
   - **Expected:**
     - Profile updates with content strategy (check Network tab)

#### ✅ Test Reputation Dashboard
1. Navigate to `/dashboard` → Click "Reputation"
2. **If reviews exist:**
   - **Expected:**
     - Shows review metrics
     - Profile updates with positive themes from reviews (check Network tab)

---

### Phase 4: Continuous Profile Enrichment

#### ✅ Verify Profile Updates
After interacting with dashboard components:

```javascript
// In browser console - check profile after each action:
async function checkProfile() {
  const userId = 'your-user-id' // Get from localStorage or session
  const res = await fetch('/api/profile', {
    headers: { 'x-user-id': userId }
  })
  const data = await res.json()
  console.log('Current Profile:', data.profile)
  console.log('Custom Attributes:', data.profile?.customAttributes)
}

checkProfile()
```

**Expected Updates:**
- Website Editor → Business info, services, brand voice
- Social Hub → Social links in customAttributes
- SEO Dashboard → SEO keywords, location, competitors
- Content Dashboard → Content strategy, target platforms
- Reputation Dashboard → Positive themes from reviews

---

## 🔍 Debugging Tools

### Browser DevTools

**Console Tab:**
- Look for errors (red text)
- Check for warnings (yellow text)
- Look for `🔧 Using mock Supabase` message
- Check for API errors

**Network Tab:**
- Filter by `Fetch/XHR`
- Look for failed requests (red status codes)
- Check request/response payloads
- Verify PATCH `/api/profile` calls after dashboard interactions

**Application Tab:**
- Check `Local Storage` for `mockSession` (if in mock mode)
- Check `Cookies` for Supabase session

### Common Issues & Fixes

#### Issue: Onboarding not starting
**Check:**
```javascript
// In console:
fetch('/api/profile', { headers: { 'x-user-id': 'your-user-id' } })
  .then(r => r.json())
  .then(console.log)
```
- If 404 → Onboarding should start ✅
- If 200 → User already has profile, shows regular chat

#### Issue: Profile not saving
**Check Network tab:**
- Look for POST `/api/onboarding/complete`
- Check response status (should be 200)
- Check response body for errors

#### Issue: Profile not updating from dashboard
**Check Network tab:**
- Look for PATCH `/api/profile` calls
- Check if they're being made after dashboard actions
- Check response status (should be 200)

#### Issue: TypeScript errors in build
- Check Vercel build logs
- Look for type errors
- Fix in code and push again

---

## 🧪 Manual API Testing

### Test Profile Creation
```bash
curl -X POST https://your-app.vercel.app/api/onboarding/complete \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-123" \
  -d '{
    "userId": "test-user-123",
    "profileData": {
      "businessName": "Test Business",
      "industry": "Technology",
      "location": {
        "address": "123 Test St",
        "city": "San Francisco",
        "state": "CA",
        "zipCode": "94102",
        "country": "US"
      },
      "contactInfo": {
        "phone": "555-123-4567",
        "email": "test@test.com"
      },
      "services": [{"name": "Consulting", "description": ""}],
      "targetAudience": "Small businesses"
    }
  }'
```

### Test Profile Update
```bash
curl -X PATCH https://your-app.vercel.app/api/profile \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-123" \
  -d '{
    "customAttributes": [
      {"label": "Test Attribute", "value": "Test Value"}
    ]
  }'
```

### Test Profile Fetch
```bash
curl https://your-app.vercel.app/api/profile \
  -H "x-user-id: test-user-123"
```

---

## ✅ Success Criteria

### Onboarding Flow
- ✅ Website check works (both yes/no paths)
- ✅ All validation catches partial answers
- ✅ Email typos are caught (e.g., `.vom` → `.com`)
- ✅ Location validation works (city only → asks for address)
- ✅ Phone/email combined question works
- ✅ Review phase shows correct summary
- ✅ Profile saves successfully
- ✅ Dashboard unlocks after completion

### Dashboard Components
- ✅ Website Editor updates profile on save
- ✅ Social Hub adds social links to profile
- ✅ SEO Dashboard adds keywords to profile
- ✅ Content Dashboard adds strategy to profile
- ✅ Reputation Dashboard adds themes to profile

### Profile Enrichment
- ✅ Profile updates are non-blocking (don't break main features)
- ✅ Updates use intelligent merging (preserve existing data)
- ✅ Custom attributes accumulate over time
- ✅ All updates visible in profile API response

---

## 📊 Monitoring in Production

### Vercel Logs
1. Go to Vercel Dashboard → Your Project → Logs
2. Filter by:
   - `error` - Check for errors
   - `api/profile` - Monitor profile updates
   - `onboarding` - Monitor onboarding flow

### Real User Monitoring
- Check Vercel Analytics for:
  - Page load times
  - Error rates
  - API response times

---

## 🎯 Quick Test Script

Run this in browser console after logging in:

```javascript
async function quickTest() {
  const userId = localStorage.getItem('mockSession') 
    ? JSON.parse(localStorage.getItem('mockSession')).user.id 
    : 'your-user-id'
  
  console.log('🧪 Starting Quick Test...')
  
  // Test 1: Profile exists
  const profileRes = await fetch('/api/profile', {
    headers: { 'x-user-id': userId }
  })
  console.log('✅ Profile Check:', profileRes.status === 200 ? 'EXISTS' : 'NOT FOUND')
  
  // Test 2: Profile update works
  const updateRes = await fetch('/api/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId
    },
    body: JSON.stringify({
      customAttributes: [{ label: 'Test', value: 'Quick Test' }]
    })
  })
  console.log('✅ Profile Update:', updateRes.status === 200 ? 'WORKS' : 'FAILED')
  
  // Test 3: Check updated profile
  const updatedProfile = await profileRes.json()
  console.log('✅ Profile Data:', updatedProfile.profile)
  
  console.log('🎉 Quick Test Complete!')
}

quickTest()
```

---

## 🚨 Red Flags to Watch For

- ❌ Multiple redirect loops
- ❌ Profile not saving after onboarding
- ❌ Dashboard components not updating profile
- ❌ TypeScript errors in build logs
- ❌ API endpoints returning 500 errors
- ❌ Console errors about missing properties
- ❌ Network requests failing silently

---

## 📝 Notes

- **Mock Mode:** If `NEXT_PUBLIC_USE_MOCK_DATA=true`, some features may behave differently
- **Environment Variables:** Make sure all required env vars are set in Vercel
- **Build Time:** First build may take longer, subsequent builds are faster
- **Cache:** Clear browser cache if seeing stale data

---

Happy Testing! 🎉

