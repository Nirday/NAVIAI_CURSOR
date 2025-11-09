#!/usr/bin/env tsx
/**
 * Check Missing API Endpoints
 * Compares documented APIs with existing route files
 */

import { existsSync } from 'fs'
import { join } from 'path'
import { glob } from 'glob'

interface DocumentedAPI {
  module: string
  method: string
  path: string
  description: string
}

// Documented APIs from READMEs
const documentedAPIs: DocumentedAPI[] = [
  // Module 1: Chat Core
  { module: 'Module 1', method: 'POST', path: '/api/chat/send', description: 'Send a message to the orchestrator' },
  { module: 'Module 1', method: 'GET', path: '/api/chat/messages', description: 'Retrieve chat history' },
  { module: 'Module 1', method: 'GET', path: '/api/suggestions', description: 'Get proactive suggestions' },
  
  // Module 2: Website Builder
  { module: 'Module 2', method: 'GET', path: '/api/website/me', description: 'Get user\'s website' },
  { module: 'Module 2', method: 'POST', path: '/api/website/save', description: 'Save website changes' },
  { module: 'Module 2', method: 'POST', path: '/api/website/publish', description: 'Publish website' },
  { module: 'Module 2', method: 'POST', path: '/api/website/unpublish', description: 'Unpublish website' },
  { module: 'Module 2', method: 'GET', path: '/api/analytics/summary', description: 'Get analytics summary' },
  
  // Module 3: Content Engine
  { module: 'Module 3', method: 'GET', path: '/api/content/posts', description: 'List blog posts' },
  { module: 'Module 3', method: 'POST', path: '/api/content/posts', description: 'Create new blog post' },
  { module: 'Module 3', method: 'POST', path: '/api/content/approve', description: 'Approve blog post' },
  { module: 'Module 3', method: 'POST', path: '/api/content/request-changes', description: 'Request revisions' },
  { module: 'Module 3', method: 'POST', path: '/api/content/resend-approval', description: 'Resend approval notification' },
  
  // Module 4: SEO Growth Engine
  { module: 'Module 4', method: 'GET', path: '/api/seo/audit-report', description: 'Get latest audit report' },
  { module: 'Module 4', method: 'GET', path: '/api/seo/issues', description: 'List SEO issues' },
  { module: 'Module 4', method: 'POST', path: '/api/seo/fix', description: 'Apply automated fix' },
  { module: 'Module 4', method: 'GET', path: '/api/seo/keyword-performance', description: 'Get keyword rankings' },
  { module: 'Module 4', method: 'GET', path: '/api/seo/monthly-report', description: 'Get monthly performance report' },
  
  // Module 5: Social Media Growth Hub
  { module: 'Module 5', method: 'GET', path: '/api/social/posts', description: 'List social posts' },
  { module: 'Module 5', method: 'POST', path: '/api/social/posts', description: 'Create/schedule post' },
  { module: 'Module 5', method: 'GET', path: '/api/social/conversations', description: 'List conversations' },
  { module: 'Module 5', method: 'GET', path: '/api/social/conversations/[id]/messages', description: 'Get conversation messages' },
  { module: 'Module 5', method: 'POST', path: '/api/social/conversations/[id]/suggest-reply', description: 'Get AI reply suggestion' },
  { module: 'Module 5', method: 'POST', path: '/api/social/conversations/[id]/reply', description: 'Send reply' },
  { module: 'Module 5', method: 'GET', path: '/api/social/ideas', description: 'Get content ideas' },
  { module: 'Module 5', method: 'POST', path: '/api/social/generate-ideas', description: 'Generate new ideas' },
  
  // Module 6: Communication Hub
  { module: 'Module 6', method: 'POST', path: '/api/communication/broadcasts', description: 'Create broadcast' },
  { module: 'Module 6', method: 'GET', path: '/api/communication/broadcasts', description: 'List broadcasts' },
  { module: 'Module 6', method: 'POST', path: '/api/communication/generate-content', description: 'Generate AI content' },
  { module: 'Module 6', method: 'POST', path: '/api/communication/automation', description: 'Create automation sequence' },
  { module: 'Module 6', method: 'GET', path: '/api/communication/analytics/broadcasts', description: 'Broadcast analytics' },
  { module: 'Module 6', method: 'GET', path: '/api/communication/analytics/automations', description: 'Automation analytics' },
  
  // Module 7: Contact Hub
  { module: 'Module 7', method: 'GET', path: '/api/contacts', description: 'List contacts (searchable, sortable)' },
  { module: 'Module 7', method: 'POST', path: '/api/contacts', description: 'Create manual contact' },
  { module: 'Module 7', method: 'GET', path: '/api/contacts/[id]', description: 'Get contact details' },
  { module: 'Module 7', method: 'PUT', path: '/api/contacts/[id]', description: 'Update contact' },
  { module: 'Module 7', method: 'POST', path: '/api/contacts/[id]/tags', description: 'Manage tags' },
  { module: 'Module 7', method: 'POST', path: '/api/contacts/[id]/send-message', description: 'Send email/SMS' },
  { module: 'Module 7', method: 'POST', path: '/api/contacts/[id]/ai-summary', description: 'Generate AI summary' },
  { module: 'Module 7', method: 'POST', path: '/api/leads/submit', description: 'Submit new lead' },
  
  // Module 8: Reputation Hub
  { module: 'Module 8', method: 'GET', path: '/api/reputation/reviews', description: 'List reviews (filterable)' },
  { module: 'Module 8', method: 'POST', path: '/api/reputation/reviews/[id]/suggest', description: 'Generate AI response' },
  { module: 'Module 8', method: 'POST', path: '/api/reputation/reviews/[id]/reply', description: 'Manual reply' },
  { module: 'Module 8', method: 'POST', path: '/api/reputation/approve', description: 'Approve response' },
  { module: 'Module 8', method: 'POST', path: '/api/reputation/request-changes', description: 'Request changes' },
  { module: 'Module 8', method: 'POST', path: '/api/reputation/reviews/[id]/showcase', description: 'Showcase review' },
  { module: 'Module 8', method: 'GET', path: '/api/reputation/dashboard', description: 'Dashboard metrics' },
  { module: 'Module 8', method: 'POST', path: '/api/reputation/campaigns', description: 'Create review campaign' },
  
  // Module 9: Billing Hub
  { module: 'Module 9', method: 'GET', path: '/api/billing/subscription', description: 'Get user\'s subscription' },
  { module: 'Module 9', method: 'POST', path: '/api/billing/create-checkout-session', description: 'Create checkout session' },
  { module: 'Module 9', method: 'POST', path: '/api/billing/portal', description: 'Create Customer Portal session' },
  { module: 'Module 9', method: 'GET', path: '/api/billing/products', description: 'List one-time products' },
  { module: 'Module 9', method: 'POST', path: '/api/billing/webhook', description: 'Stripe webhook handler' },
  
  // Module 10: Admin Center
  { module: 'Module 10', method: 'GET', path: '/api/admin/users', description: 'List users (paginated, searchable)' },
  { module: 'Module 10', method: 'GET', path: '/api/admin/users/[userId]', description: 'Get user details' },
  { module: 'Module 10', method: 'POST', path: '/api/admin/users/[userId]/password-reset', description: 'Send password reset' },
  { module: 'Module 10', method: 'GET', path: '/api/admin/users/[userId]/activity', description: 'Get user activity log' },
  { module: 'Module 10', method: 'POST', path: '/api/admin/users/[userId]/impersonate', description: 'Impersonate user' },
  { module: 'Module 10', method: 'GET', path: '/api/admin/feature-flags', description: 'List all flags' },
  { module: 'Module 10', method: 'POST', path: '/api/admin/feature-flags/[flagId]/toggle', description: 'Toggle flag' },
  { module: 'Module 10', method: 'GET', path: '/api/admin/system-health/metrics', description: 'Get system metrics' },
  { module: 'Module 10', method: 'GET', path: '/api/admin/system-health/jobs', description: 'Get job status' },
  { module: 'Module 10', method: 'GET', path: '/api/admin/system-health/errors', description: 'Get recent errors (Sentry)' },
  { module: 'Module 10', method: 'GET', path: '/api/admin/admins', description: 'List admins and pending invites' },
  { module: 'Module 10', method: 'POST', path: '/api/admin/admins/invite', description: 'Send admin invite' },
  { module: 'Module 10', method: 'POST', path: '/api/admin/admins/[userId]/remove', description: 'Remove admin access' },
  { module: 'Module 10', method: 'POST', path: '/api/admin/invites/[id]/revoke', description: 'Revoke invite' },
  { module: 'Module 10', method: 'POST', path: '/api/admin/invites/accept', description: 'Accept invite' },
  { module: 'Module 10', method: 'GET', path: '/api/admin/platform-settings', description: 'List settings' },
  { module: 'Module 10', method: 'POST', path: '/api/admin/platform-settings', description: 'Update settings' },
  { module: 'Module 10', method: 'GET', path: '/api/admin/broadcasts/recipient-count', description: 'Get recipient count' },
  { module: 'Module 10', method: 'POST', path: '/api/admin/broadcasts/send', description: 'Send broadcast' },
]

// Convert path to file path
function pathToFilePath(path: string): string {
  // Remove /api prefix
  let filePath = path.replace(/^\/api/, '')
  
  // Handle dynamic segments [id] -> [id]
  // Convert to Next.js route file structure
  const parts = filePath.split('/').filter(p => p)
  
  if (parts.length === 0) return 'app/api/route.ts'
  
  // Build file path
  let routePath = 'app/api'
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (part.startsWith('[') && part.endsWith(']')) {
      // Dynamic segment
      routePath += `/${part}`
    } else {
      routePath += `/${part}`
    }
  }
  
  routePath += '/route.ts'
  return routePath
}

// Check if API route exists
function checkAPIExists(api: DocumentedAPI): { exists: boolean; filePath: string; actualMethod?: string } {
  const filePath = pathToFilePath(api.path)
  const fullPath = join(process.cwd(), filePath)
  
  if (!existsSync(fullPath)) {
    return { exists: false, filePath }
  }
  
  // Try to read the file to check if it exports the correct method
  try {
    const fs = require('fs')
    const content = fs.readFileSync(fullPath, 'utf-8')
    
    // Check if the method is exported
    const methodPattern = new RegExp(`export\\s+(async\\s+)?function\\s+${api.method}`, 'i')
    if (methodPattern.test(content)) {
      return { exists: true, filePath, actualMethod: api.method }
    }
    
    // Check for any HTTP method export
    const anyMethodPattern = /export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)/i
    const match = content.match(anyMethodPattern)
    if (match) {
      return { exists: true, filePath, actualMethod: match[2] }
    }
    
    return { exists: false, filePath }
  } catch (error) {
    return { exists: false, filePath }
  }
}

// Main check function
async function checkMissingAPIs() {
  console.log('🔍 Checking for Missing API Endpoints...\n')
  
  const missing: Array<DocumentedAPI & { filePath: string; note?: string }> = []
  const found: Array<DocumentedAPI & { filePath: string; actualMethod?: string }> = []
  
  for (const api of documentedAPIs) {
    const result = checkAPIExists(api)
    if (result.exists) {
      found.push({ ...api, filePath: result.filePath, actualMethod: result.actualMethod })
    } else {
      missing.push({ ...api, filePath: result.filePath })
    }
  }
  
  console.log(`📊 Results:\n`)
  console.log(`   ✅ Found: ${found.length}/${documentedAPIs.length}`)
  console.log(`   ❌ Missing: ${missing.length}/${documentedAPIs.length}\n`)
  
  if (missing.length > 0) {
    console.log('❌ Missing API Endpoints:\n')
    
    // Group by module
    const byModule = missing.reduce((acc, api) => {
      if (!acc[api.module]) acc[api.module] = []
      acc[api.module].push(api)
      return acc
    }, {} as Record<string, typeof missing>)
    
    for (const [module, apis] of Object.entries(byModule)) {
      console.log(`${module}:`)
      apis.forEach(api => {
        console.log(`   ${api.method} ${api.path}`)
        console.log(`      → ${api.description}`)
        console.log(`      → Expected: ${api.filePath}\n`)
      })
    }
  } else {
    console.log('🎉 All documented APIs exist!\n')
  }
  
  return missing
}

checkMissingAPIs().catch(console.error)

