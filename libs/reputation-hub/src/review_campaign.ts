/**
 * Review Campaign Handler
 * Creates review request campaigns with review gating flow
 */

import { supabaseAdmin } from '@/lib/supabase'
import { ReviewPlatform, ReputationSettings } from './types'
import { fetchContactsForEmailBroadcast, fetchContactsForSmsBroadcast } from '@/libs/communication-hub/src/contact_adapter'
import { createHmac } from 'crypto'

const TOKEN_SECRET = process.env.REVIEW_CAMPAIGN_SECRET || process.env.CRON_SECRET || 'default-secret-key'

/**
 * Generates a secure token for feedback page URL
 */
export function generateFeedbackToken(contactId: string): string {
  return createHmac('sha256', TOKEN_SECRET)
    .update(contactId)
    .digest('hex')
}

/**
 * Generates feedback page URL for a contact
 */
export async function generateFeedbackUrl(
  userId: string,
  contactId: string,
  platform: ReviewPlatform
): Promise<string> {
  // Get user's website subdomain
  const { data: websiteData } = await supabaseAdmin
    .from('websites')
    .select('subdomain, published_domain')
    .eq('user_id', userId)
    .single()

  if (!websiteData) {
    throw new Error('User website not found. Please publish your website first.')
  }

  // Use published_domain if available, otherwise use subdomain
  const baseDomain = websiteData.published_domain || websiteData.subdomain
  if (!baseDomain) {
    throw new Error('Website domain not found. Please publish your website first.')
  }

  // Ensure protocol
  const baseUrl = baseDomain.startsWith('http') ? baseDomain : `https://${baseDomain}`
  
  // Generate secure token
  const token = generateFeedbackToken(contactId)
  
  // Build feedback URL
  const feedbackUrl = `${baseUrl}/feedback?platform=${platform}&cid=${contactId}&tok=${token}`
  
  return feedbackUrl
}

/**
 * Creates a review request campaign
 */
export async function createReviewRequestCampaign(
  userId: string,
  platform: ReviewPlatform,
  tags: string[],
  messageTemplate: string,
  channel: 'email' | 'sms'
): Promise<string> {
  // Validate platform review link exists
  const { data: settingsData } = await supabaseAdmin
    .from('reputation_settings')
    .select('direct_review_links')
    .eq('user_id', userId)
    .single()

  if (!settingsData) {
    throw new Error('Reputation settings not found. Please configure your review links first.')
  }

  const reviewLinks = settingsData.direct_review_links || []
  const platformLink = reviewLinks.find((link: any) => link.platform === platform)
  
  if (!platformLink || !platformLink.url) {
    throw new Error(`Review link for ${platform} not found. Please add it in Reputation Settings.`)
  }

  // Fetch contacts for audience
  const contacts = channel === 'email'
    ? await fetchContactsForEmailBroadcast(userId, tags)
    : await fetchContactsForSmsBroadcast(userId, tags)

  if (contacts.length === 0) {
    throw new Error('No contacts found matching the selected criteria.')
  }

  // Create broadcast with type 'review_request'
  // Store platform in audience_id format: tags:tag1,tag2|platform:google
  // The message template will be stored, and URLs will be generated per-contact during sending
  const audienceId = `tags:${tags.join(',')}|platform:${platform}`
  
  // Store the message template (URL will be appended during sending)
  const contentVersions = [{
    variant: 'A' as const,
    subject: channel === 'email' ? 'We\'d love your feedback!' : '',
    body: messageTemplate // URL will be appended per-contact during sending
  }]
  
  const { data: broadcast, error: broadcastError } = await supabaseAdmin
    .from('broadcasts')
    .insert({
      user_id: userId,
      audience_id: audienceId,
      channel: channel,
      content: contentVersions,
      type: 'review_request',
      status: 'scheduled', // Will be sent immediately by scheduler
      total_recipients: contacts.length,
      sent_count: 0,
      failed_count: 0
    })
    .select()
    .single()

  if (broadcastError) {
    throw new Error(`Failed to create broadcast: ${broadcastError.message}`)
  }

  // Log review_request activity events for each contact
  const activityEvents = contacts.map(contact => ({
    user_id: userId,
    contact_id: contact.id,
    event_type: 'review_request',
    content: `Sent review request for ${platform.charAt(0).toUpperCase() + platform.slice(1)}.`
  }))

  if (activityEvents.length > 0) {
    const { error: activityError } = await supabaseAdmin
      .from('activity_events')
      .insert(activityEvents)

    if (activityError) {
      console.error('Error logging review request activity events:', activityError)
      // Don't fail the campaign if activity logging fails
    }
  }

  return broadcast.id
}

