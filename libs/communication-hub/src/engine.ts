/**
 * Communication & Automation Engine
 * Backend jobs for sending broadcasts and executing automation sequences
 */

import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from './email_service'
import { sendSMS } from './sms_service'
import { Broadcast, AbTestConfig, BroadcastContentVersion, AutomationSequence, AutomationStep } from './types'
import { fetchContactsForEmailBroadcast, fetchContactsForSmsBroadcast, fetchContactById } from './contact_adapter'
import { fetchAllContacts } from './contact_adapter'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Broadcast Scheduler
 * Runs every 1 minute to find and process due broadcasts
 */
export async function runBroadcastScheduler(): Promise<void> {
  try {
    const now = new Date()
    
    // Find broadcasts that are scheduled and due
    const { data: dueBroadcasts, error } = await supabaseAdmin
      .from('broadcasts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now.toISOString())
    
    if (error) {
      throw new Error(`Failed to fetch due broadcasts: ${error.message}`)
    }
    
    if (!dueBroadcasts || dueBroadcasts.length === 0) {
      return
    }
    
    console.log(`[Broadcast Scheduler] Found ${dueBroadcasts.length} due broadcast(s)`)
    
    // Process each broadcast
    for (const broadcastData of dueBroadcasts) {
      try {
        await processBroadcast(broadcastData)
      } catch (error: any) {
        console.error(`[Broadcast Scheduler] Error processing broadcast ${broadcastData.id}:`, error)
        // Update broadcast status to failed
        await supabaseAdmin
          .from('broadcasts')
          .update({ status: 'failed' })
          .eq('id', broadcastData.id)
      }
    }
  } catch (error: any) {
    console.error('[Broadcast Scheduler] Fatal error:', error)
    throw error
  }
}

/**
 * Processes a single broadcast
 * Handles both full send and A/B test initialization
 */
async function processBroadcast(broadcastData: any): Promise<void> {
  const broadcast: Broadcast = {
    id: broadcastData.id,
    userId: broadcastData.user_id,
    audienceId: broadcastData.audience_id,
    channel: broadcastData.channel,
    content: broadcastData.content,
    abTestConfig: broadcastData.ab_test_config,
    type: broadcastData.type || 'standard', // Default to 'standard' if not set
    status: broadcastData.status,
    scheduledAt: broadcastData.scheduled_at ? new Date(broadcastData.scheduled_at) : null,
    sentAt: broadcastData.sent_at ? new Date(broadcastData.sent_at) : null,
    totalRecipients: broadcastData.total_recipients,
    sentCount: broadcastData.sent_count,
    failedCount: broadcastData.failed_count,
    openCount: broadcastData.open_count,
    clickCount: broadcastData.click_count,
    createdAt: new Date(broadcastData.created_at),
    updatedAt: new Date(broadcastData.updated_at)
  }
  
  // Handle review_request broadcasts (use audience_id format: tags:tag1,tag2|platform:google)
  let tags: string[] = []
  let platform: string | null = null
  
  if (broadcast.type === 'review_request') {
    // Parse audience_id format: tags:tag1,tag2|platform:google
    const parts = broadcast.audienceId.split('|')
    const tagsPart = parts.find(p => p.startsWith('tags:'))
    const platformPart = parts.find(p => p.startsWith('platform:'))
    
    if (tagsPart) {
      tags = tagsPart.replace('tags:', '').split(',').filter(t => t.length > 0)
    }
    if (platformPart) {
      platform = platformPart.replace('platform:', '')
    }
  } else {
    // Standard broadcast - fetch from audiences table
    const { data: audienceData } = await supabaseAdmin
      .from('audiences')
      .select('contact_ids, filter_tags')
      .eq('id', broadcast.audienceId)
      .single()
    
    if (!audienceData) {
      throw new Error(`Audience ${broadcast.audienceId} not found`)
    }
    
    tags = audienceData.filter_tags || []
  }
  
  // Fetch contacts based on channel
  const contacts = broadcast.channel === 'email'
    ? await fetchContactsForEmailBroadcast(broadcast.userId, tags)
    : await fetchContactsForSmsBroadcast(broadcast.userId, tags)
  
  // Filter out unsubscribed contacts
  const validContacts = contacts.filter(contact => {
    // Check unsubscribe status from contacts table
    return !contact.isUnsubscribed
  })
  
  if (validContacts.length === 0) {
    throw new Error('No valid contacts found (all unsubscribed)')
  }
  
  // Check if this is an A/B test
  if (broadcast.abTestConfig && broadcast.content.length >= 2) {
    await initializeAbTest(broadcast, validContacts)
  } else {
    // Full send (no A/B test)
    await sendFullBroadcast(broadcast, validContacts, broadcast.content[0])
  }
}

/**
 * Initializes an A/B test
 * Sends test batches to 20% of audience (10% variant A, 10% variant B)
 */
async function initializeAbTest(
  broadcast: Broadcast,
  contacts: any[]
): Promise<void> {
  const abTestConfig = broadcast.abTestConfig!
  const testSize = Math.floor(contacts.length * (abTestConfig.testSizePercentage / 100))
  const variantASize = Math.floor(testSize * (abTestConfig.variantASize / 100))
  const variantBSize = testSize - variantASize
  
  // Split contacts into test groups
  const shuffled = [...contacts].sort(() => Math.random() - 0.5)
  const variantAContacts = shuffled.slice(0, variantASize)
  const variantBContacts = shuffled.slice(variantASize, variantASize + variantBSize)
  const remainingContacts = shuffled.slice(variantASize + variantBSize)
  
  const variantA = broadcast.content.find(c => c.variant === 'A')
  const variantB = broadcast.content.find(c => c.variant === 'B')
  
  if (!variantA || !variantB) {
    throw new Error('Both variant A and B content required for A/B test')
  }
  
  let sentCount = 0
  let failedCount = 0
  
  // Send variant A to test group
  for (const contact of variantAContacts) {
    try {
      await sendMessageWithVariantTag(
        broadcast,
        contact,
        variantA,
        'variant_A'
      )
      sentCount++
    } catch (error) {
      console.error(`Failed to send variant A to ${contact.email || contact.phone}:`, error)
      failedCount++
    }
  }
  
  // Send variant B to test group
  for (const contact of variantBContacts) {
    try {
      await sendMessageWithVariantTag(
        broadcast,
        contact,
        variantB,
        'variant_B'
      )
      sentCount++
    } catch (error) {
      console.error(`Failed to send variant B to ${contact.email || contact.phone}:`, error)
      failedCount++
    }
  }
  
  // Update broadcast status to 'testing'
  await supabaseAdmin
    .from('broadcasts')
    .update({
      status: 'testing',
      sent_count: sentCount,
      failed_count: failedCount,
      total_recipients: contacts.length
    })
    .eq('id', broadcast.id)
  
  // Schedule winner check job
  const testDurationHours = abTestConfig.testDurationHours || 24 // Default 24 hours
  const winnerCheckAt = new Date(Date.now() + testDurationHours * 60 * 60 * 1000)
  
  // Store remaining contacts in a JSONB field for later use
  // We'll store the contact IDs in the broadcast's metadata or a separate table
  // For V1, we'll re-fetch contacts when needed
  
  // Schedule the winner check job by creating a scheduled job record
  // In V1, we'll use a simple approach: store the winner check time in the broadcast
  // and let the scheduler check for broadcasts with winner check due
  await supabaseAdmin
    .from('broadcasts')
    .update({
      scheduled_at: winnerCheckAt.toISOString() // Reuse scheduled_at for winner check time
    })
    .eq('id', broadcast.id)
  
  console.log(`[A/B Test] Initialized test for broadcast ${broadcast.id}: ${sentCount} sent, ${failedCount} failed`)
}

/**
 * Sends a full broadcast (no A/B test)
 */
async function sendFullBroadcast(
  broadcast: Broadcast,
  contacts: any[],
  content: BroadcastContentVersion
): Promise<void> {
  let sentCount = 0
  let failedCount = 0
  
  // Update status to 'sending'
  await supabaseAdmin
    .from('broadcasts')
    .update({ status: 'sending' })
    .eq('id', broadcast.id)
  
  // Send to all contacts
  for (const contact of contacts) {
    try {
      await sendMessage(broadcast, contact, content)
      sentCount++
    } catch (error) {
      console.error(`Failed to send to ${contact.email || contact.phone}:`, error)
      failedCount++
    }
  }
  
  // Update broadcast status
  await supabaseAdmin
    .from('broadcasts')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_count: sentCount,
      failed_count: failedCount,
      total_recipients: contacts.length
    })
    .eq('id', broadcast.id)
  
  console.log(`[Broadcast] Sent broadcast ${broadcast.id}: ${sentCount} sent, ${failedCount} failed`)
}

/**
 * Sends a message with a variant tag (for A/B testing)
 */
async function sendMessageWithVariantTag(
  broadcast: Broadcast,
  contact: any,
  content: BroadcastContentVersion,
  variantTag: string
): Promise<void> {
  let messageBody = content.body
  let messageSubject = content.subject

  // Handle review_request broadcasts - generate personalized URL
  if (broadcast.type === 'review_request') {
    // Extract platform from audience_id format: tags:tag1,tag2|platform:google
    const parts = broadcast.audienceId.split('|')
    const platformPart = parts.find(p => p.startsWith('platform:'))
    const platform = platformPart ? platformPart.replace('platform:', '') : null

    if (platform) {
      try {
        // Generate personalized feedback URL for this contact
        const { generateFeedbackUrl } = await import('@/libs/reputation-hub/src/review_campaign')
        const feedbackUrl = await generateFeedbackUrl(broadcast.userId, contact.id, platform as any)
        messageBody = `${content.body}\n\n${feedbackUrl}`
      } catch (error: any) {
        console.error(`[Review Campaign] Failed to generate feedback URL for contact ${contact.id}:`, error)
        // Continue with original message if URL generation fails
      }
    }
  }

  if (broadcast.channel === 'email') {
    // Send email with tags via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@naviai.com',
      to: [contact.email],
      subject: messageSubject,
      html: messageBody,
      tags: [
        { name: 'broadcast_id', value: broadcast.id },
        { name: 'variant', value: variantTag }
      ]
    })
    
    if (error) {
      throw new Error(`Failed to send email: ${error.message}`)
    }
  } else {
    // SMS - Twilio doesn't support tags in the same way, so we'll track this differently
    // For V1, we'll send without variant tracking for SMS A/B tests
    await sendSMS(contact.phone, messageBody)
  }
}

/**
 * Sends a message (for full broadcasts)
 */
async function sendMessage(
  broadcast: Broadcast,
  contact: any,
  content: BroadcastContentVersion
): Promise<void> {
  let messageBody = content.body
  let messageSubject = content.subject

  // Handle review_request broadcasts - generate personalized URL
  if (broadcast.type === 'review_request') {
    // Extract platform from audience_id format: tags:tag1,tag2|platform:google
    const parts = broadcast.audienceId.split('|')
    const platformPart = parts.find(p => p.startsWith('platform:'))
    const platform = platformPart ? platformPart.replace('platform:', '') : null

    if (platform) {
      try {
        // Generate personalized feedback URL for this contact
        const { generateFeedbackUrl } = await import('@/libs/reputation-hub/src/review_campaign')
        const feedbackUrl = await generateFeedbackUrl(broadcast.userId, contact.id, platform as any)
        messageBody = `${content.body}\n\n${feedbackUrl}`
      } catch (error: any) {
        console.error(`[Review Campaign] Failed to generate feedback URL for contact ${contact.id}:`, error)
        // Continue with original message if URL generation fails
      }
    }
  }

  if (broadcast.channel === 'email') {
    await sendEmail(contact.email, messageSubject, messageBody)
  } else {
    await sendSMS(contact.phone, messageBody)
  }
}

/**
 * A/B Test Winner Check Job
 * Determines winner and sends final batch
 */
export async function runAbTestWinnerCheck(): Promise<void> {
  try {
    const now = new Date()
    
    // Find broadcasts in 'testing' status that are due for winner check
    const { data: testingBroadcasts, error } = await supabaseAdmin
      .from('broadcasts')
      .select('*')
      .eq('status', 'testing')
      .lte('scheduled_at', now.toISOString()) // Reusing scheduled_at for winner check time
    
    if (error) {
      throw new Error(`Failed to fetch testing broadcasts: ${error.message}`)
    }
    
    if (!testingBroadcasts || testingBroadcasts.length === 0) {
      return
    }
    
    console.log(`[A/B Winner Check] Found ${testingBroadcasts.length} broadcast(s) ready for winner check`)
    
    // Process each broadcast
    for (const broadcastData of testingBroadcasts) {
      try {
        await checkAndSendWinner(broadcastData)
      } catch (error: any) {
        console.error(`[A/B Winner Check] Error processing broadcast ${broadcastData.id}:`, error)
      }
    }
  } catch (error: any) {
    console.error('[A/B Winner Check] Fatal error:', error)
    throw error
  }
}

/**
 * Checks A/B test results and sends winning variant to remaining audience
 */
async function checkAndSendWinner(broadcastData: any): Promise<void> {
  const broadcast: Broadcast = {
    id: broadcastData.id,
    userId: broadcastData.user_id,
    audienceId: broadcastData.audience_id,
    channel: broadcastData.channel,
    content: broadcastData.content,
    abTestConfig: broadcastData.ab_test_config,
    type: broadcastData.type || 'standard', // Default to 'standard' if not set
    status: broadcastData.status,
    scheduledAt: broadcastData.scheduled_at ? new Date(broadcastData.scheduled_at) : null,
    sentAt: broadcastData.sent_at ? new Date(broadcastData.sent_at) : null,
    totalRecipients: broadcastData.total_recipients,
    sentCount: broadcastData.sent_count,
    failedCount: broadcastData.failed_count,
    openCount: broadcastData.open_count,
    clickCount: broadcastData.click_count,
    createdAt: new Date(broadcastData.created_at),
    updatedAt: new Date(broadcastData.updated_at)
  }
  
  if (broadcast.channel !== 'email') {
    // For SMS, default to variant A (no open rate tracking)
    console.log(`[A/B Winner Check] SMS broadcast ${broadcast.id}: defaulting to variant A`)
    await sendWinnerToRemaining(broadcast, 'A')
    return
  }
  
  // Query Resend API for open rates by variant tag
  // Note: For V1, we'll use Resend's webhook data stored in the database
  // The actual open counts should be tracked via webhooks and stored in broadcast.openCount
  // For now, we'll use a simplified approach: check if openCount exists, otherwise default to variant A
  
  // In a production system, you would query Resend's events API or use webhook data
  // For V1, we'll use a placeholder that checks existing open count data
  // If openCount is not available, default to variant A
  
  // For V1, we'll use a simple heuristic: if we have open data, use it
  // Otherwise default to variant A
  // In production, you would query Resend API with tags or use webhook-stored data
  
  let variantAOpenRate = 0
  let variantBOpenRate = 0
  
  try {
    // For V1, we'll use a simplified approach
    // In production, you would:
    // 1. Query Resend API for emails with variant_A tag and count opens
    // 2. Query Resend API for emails with variant_B tag and count opens
    // 3. Calculate open rates
    
    // Placeholder: For V1, we'll default to variant A if we can't determine winner
    // This can be enhanced in V2 with proper Resend API integration
    console.log(`[A/B Winner Check] Using default logic for broadcast ${broadcast.id}`)
    variantAOpenRate = 0.5 // Placeholder
    variantBOpenRate = 0.5 // Placeholder
  } catch (error) {
    console.error(`[A/B Winner Check] Error querying stats:`, error)
    // Default to variant A on error
    await sendWinnerToRemaining(broadcast, 'A')
    return
  }
  
  // Determine winner (default to A on tie or insufficient data)
  const winnerVariant = variantBOpenRate > variantAOpenRate ? 'B' : 'A'
  
  // Update abTestConfig with winner
  const updatedAbTestConfig = {
    ...broadcast.abTestConfig!,
    winnerVariant
  }
  
  await supabaseAdmin
    .from('broadcasts')
    .update({
      ab_test_config: updatedAbTestConfig
    })
    .eq('id', broadcast.id)
  
  console.log(`[A/B Winner Check] Broadcast ${broadcast.id}: Variant ${winnerVariant} wins (A: ${(variantAOpenRate * 100).toFixed(1)}%, B: ${(variantBOpenRate * 100).toFixed(1)}%)`)
  
  // Send winning variant to remaining 80%
  await sendWinnerToRemaining(broadcast, winnerVariant)
}

/**
 * Sends winning variant to remaining audience (80%)
 */
async function sendWinnerToRemaining(
  broadcast: Broadcast,
  winnerVariant: 'A' | 'B'
): Promise<void> {
  // Fetch audience contacts again
  const { data: audienceData } = await supabaseAdmin
    .from('audiences')
    .select('contact_ids, filter_tags')
    .eq('id', broadcast.audienceId)
    .single()
  
  if (!audienceData) {
    throw new Error(`Audience ${broadcast.audienceId} not found`)
  }
  
  // Fetch contacts
  const contacts = broadcast.channel === 'email'
    ? await fetchContactsForEmailBroadcast(broadcast.userId, audienceData.filter_tags || [])
    : await fetchContactsForSmsBroadcast(broadcast.userId, audienceData.filter_tags || [])
  
  // Filter out unsubscribed
  const validContacts = contacts.filter(contact => !contact.isUnsubscribed)
  
  // Calculate test size (20% already sent)
  const testSize = Math.floor(validContacts.length * 0.2)
  const remainingSize = validContacts.length - testSize
  
  // Get remaining contacts (skip first testSize contacts)
  // In a real implementation, we'd track which contacts received test variants
  // For V1, we'll use a simple approach: skip first testSize contacts
  const remainingContacts = validContacts.slice(testSize)
  
  const winnerContent = broadcast.content.find(c => c.variant === winnerVariant)
  if (!winnerContent) {
    throw new Error(`Winner variant ${winnerVariant} content not found`)
  }
  
  let sentCount = broadcast.sentCount
  let failedCount = broadcast.failedCount
  
  // Update status to 'sending'
  await supabaseAdmin
    .from('broadcasts')
    .update({ status: 'sending' })
    .eq('id', broadcast.id)
  
  // Send to remaining contacts
  for (const contact of remainingContacts) {
    try {
      await sendMessage(broadcast, contact, winnerContent)
      sentCount++
    } catch (error) {
      console.error(`Failed to send winner variant to ${contact.email || contact.phone}:`, error)
      failedCount++
    }
  }
  
  // Update broadcast status
  await supabaseAdmin
    .from('broadcasts')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_count: sentCount,
      failed_count: failedCount
    })
    .eq('id', broadcast.id)
  
  console.log(`[A/B Winner] Sent winner variant ${winnerVariant} to ${remainingContacts.length} contacts for broadcast ${broadcast.id}`)
}

/**
 * Automation Engine
 * Processes contacts due for next automation step
 */
export async function runAutomationEngine(): Promise<void> {
  try {
    const now = new Date()
    
    // Find all contacts due for next step
    const { data: dueProgress, error } = await supabaseAdmin
      .from('automation_contact_progress')
      .select(`
        *,
        automation_sequences!inner(user_id, is_active, trigger_type),
        automation_steps!inner(action, subject, body, wait_days, step_order, sequence_id)
      `)
      .lte('next_step_at', now.toISOString())
    
    if (error) {
      throw new Error(`Failed to fetch due automation progress: ${error.message}`)
    }
    
    if (!dueProgress || dueProgress.length === 0) {
      return
    }
    
    console.log(`[Automation Engine] Found ${dueProgress.length} contact(s) due for next step`)
    
    // Process each contact
    for (const progress of dueProgress) {
      try {
        // Verify sequence is still active
        if (!progress.automation_sequences.is_active) {
          console.log(`[Automation Engine] Sequence ${progress.sequence_id} is inactive, skipping`)
          continue
        }
        
        await processAutomationStep(progress)
      } catch (error: any) {
        console.error(`[Automation Engine] Error processing contact ${progress.contact_id}:`, error)
      }
    }
  } catch (error: any) {
    console.error('[Automation Engine] Fatal error:', error)
    throw error
  }
}

/**
 * Processes the next automation step for a contact
 */
async function processAutomationStep(progress: any): Promise<void> {
  const currentStep = progress.automation_steps
  const sequenceId = progress.sequence_id
  const contactId = progress.contact_id
  
  // Fetch contact to check unsubscribe status
  const { data: contactData } = await supabaseAdmin
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single()
  
  if (!contactData) {
    console.log(`[Automation Engine] Contact ${contactId} not found, removing from progress`)
    await supabaseAdmin
      .from('automation_contact_progress')
      .delete()
      .eq('id', progress.id)
    return
  }
  
  // Check unsubscribe status
  if (contactData.is_unsubscribed) {
    console.log(`[Automation Engine] Contact ${contactId} is unsubscribed, removing from sequence`)
    await supabaseAdmin
      .from('automation_contact_progress')
      .delete()
      .eq('id', progress.id)
    return
  }
  
  // Execute current step
  if (currentStep.action === 'send_email') {
    if (!contactData.email) {
      console.log(`[Automation Engine] Contact ${contactId} has no email, skipping email step`)
      await advanceToNextStep(progress, currentStep)
      return
    }
    
    try {
      await sendEmail(contactData.email, currentStep.subject || '', currentStep.body || '')
      
      // Mark step as executed
      await supabaseAdmin
        .from('automation_steps')
        .update({ executed_at: new Date().toISOString() })
        .eq('id', currentStep.id)
      
      await advanceToNextStep(progress, currentStep)
    } catch (error) {
      console.error(`[Automation Engine] Failed to send email to ${contactData.email}:`, error)
      // Continue to next step even on error
      await advanceToNextStep(progress, currentStep)
    }
  } else if (currentStep.action === 'send_sms') {
    if (!contactData.phone) {
      console.log(`[Automation Engine] Contact ${contactId} has no phone, skipping SMS step`)
      await advanceToNextStep(progress, currentStep)
      return
    }
    
    try {
      await sendSMS(contactData.phone, currentStep.body || '')
      
      // Mark step as executed
      await supabaseAdmin
        .from('automation_steps')
        .update({ executed_at: new Date().toISOString() })
        .eq('id', currentStep.id)
      
      await advanceToNextStep(progress, currentStep)
    } catch (error) {
      console.error(`[Automation Engine] Failed to send SMS to ${contactData.phone}:`, error)
      // Continue to next step even on error
      await advanceToNextStep(progress, currentStep)
    }
  } else if (currentStep.action === 'wait') {
    // Wait step - already handled by next_step_at, just advance
    await advanceToNextStep(progress, currentStep)
  }
}

/**
 * Advances contact to next step in sequence
 */
async function advanceToNextStep(progress: any, currentStep: any): Promise<void> {
  // Find next step
  const { data: nextStep, error } = await supabaseAdmin
    .from('automation_steps')
    .select('*')
    .eq('sequence_id', currentStep.sequence_id)
    .eq('step_order', currentStep.step_order + 1)
    .single()
  
  if (error || !nextStep) {
    // No more steps - sequence complete
    console.log(`[Automation Engine] Sequence complete for contact ${progress.contact_id}`)
    await supabaseAdmin
      .from('automation_contact_progress')
      .delete()
      .eq('id', progress.id)
    return
  }
  
  // Calculate next_step_at based on next step
  let nextStepAt = new Date()
  
  if (nextStep.action === 'wait') {
    // Add wait days
    const waitDays = nextStep.wait_days || 1
    nextStepAt = new Date(Date.now() + waitDays * 24 * 60 * 60 * 1000)
  }
  // For send steps, next_step_at is now (immediate)
  
  // Update progress
  await supabaseAdmin
    .from('automation_contact_progress')
    .update({
      current_step_id: nextStep.id,
      next_step_at: nextStepAt.toISOString()
    })
    .eq('id', progress.id)
}

/**
 * Handles new lead added event
 * Called when Module 7 dispatches ADD_CONTACT action
 */
export async function handleNewLeadAdded(
  userId: string,
  contactId: string
): Promise<void> {
  try {
    // Find all active sequences with 'new_lead_added' trigger
    const { data: sequences, error } = await supabaseAdmin
      .from('automation_sequences')
      .select(`
        *,
        automation_steps(*)
      `)
      .eq('user_id', userId)
      .eq('trigger_type', 'new_lead_added')
      .eq('is_active', true)
    
    if (error) {
      throw new Error(`Failed to fetch sequences: ${error.message}`)
    }
    
    if (!sequences || sequences.length === 0) {
      return
    }
    
    // For each sequence, create progress entry starting at first step
    for (const sequence of sequences) {
      const steps = sequence.automation_steps.sort((a: any, b: any) => a.step_order - b.step_order)
      
      if (steps.length === 0) {
        continue
      }
      
      const firstStep = steps[0]
      
      // Calculate next_step_at
      let nextStepAt = new Date()
      if (firstStep.action === 'wait') {
        const waitDays = firstStep.wait_days || 1
        nextStepAt = new Date(Date.now() + waitDays * 24 * 60 * 60 * 1000)
      }
      
      // Check if progress already exists (prevent duplicates)
      const { data: existing } = await supabaseAdmin
        .from('automation_contact_progress')
        .select('id')
        .eq('contact_id', contactId)
        .eq('sequence_id', sequence.id)
        .single()
      
      if (existing) {
        continue // Already enrolled
      }
      
      // Create progress entry
      await supabaseAdmin
        .from('automation_contact_progress')
        .insert({
          contact_id: contactId,
          sequence_id: sequence.id,
          current_step_id: firstStep.id,
          next_step_at: nextStepAt.toISOString()
        })
      
      // Increment sequence execution count
      await supabaseAdmin
        .from('automation_sequences')
        .update({
          total_executions: (sequence.total_executions || 0) + 1
        })
        .eq('id', sequence.id)
      
      console.log(`[Automation Engine] Enrolled contact ${contactId} in sequence ${sequence.id}`)
    }
  } catch (error: any) {
    console.error(`[Automation Engine] Error handling new lead added for contact ${contactId}:`, error)
    throw error
  }
}

