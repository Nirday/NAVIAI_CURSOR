# Missing API Endpoints

## Actually Missing (Need to Create)

1. **POST /api/social/conversations/[id]/reply**
   - Module: Module 5 (Social Media Growth Hub)
   - Description: Send reply to social conversation
   - Expected: `app/api/social/conversations/[id]/reply/route.ts`
   - Status: ❌ Missing

2. **POST /api/reputation/reviews/[id]/reply**
   - Module: Module 8 (AI Reputation Management Hub)
   - Description: Manual reply to review
   - Expected: `app/api/reputation/reviews/[id]/reply/route.ts`
   - Status: ❌ Missing

## Exists with Different Paths (Documentation Mismatch)

3. **POST /api/reputation/reviews/[id]/suggest**
   - Documented: `/api/reputation/reviews/[id]/suggest`
   - Actual: `/api/reputation/reviews/[id]/generate-response`
   - Status: ✅ Exists (different path)

4. **POST /api/reputation/campaigns**
   - Documented: `/api/reputation/campaigns`
   - Actual: `/api/reputation/campaigns/create`
   - Status: ✅ Exists (different path)

5. **POST /api/contacts/[id]/ai-summary**
   - Documented: `/api/contacts/[id]/ai-summary`
   - Actual: `/api/contacts/[id]/summary`
   - Status: ✅ Exists (different path)

6. **POST /api/communication/automation**
   - Documented: `/api/communication/automation`
   - Actual: `/api/communication/automation/sequences` (POST)
   - Status: ✅ Exists (different path)

7. **GET /api/communication/analytics/automations**
   - Documented: `/api/communication/analytics/automations`
   - Actual: `/api/communication/analytics/sequences`
   - Status: ✅ Exists (different path)

