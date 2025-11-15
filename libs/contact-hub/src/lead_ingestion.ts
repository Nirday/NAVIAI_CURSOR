/**
 * Omnichannel Lead Ingestion (Module 7, Task 7.4)
 * Automates capture and organization of new leads
 */

import { supabaseAdmin } from '@/lib/supabase'
import { Contact, ActivityEvent, LeadData } from './types'
import { dispatchActionCommand } from '../../content-engine/src/action_queue'

// Custom error classes
export class LeadIngestionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LeadIngestionError'
  }
}

/**
 * Ingests a new lead from any source (website, social, etc.)
 * @param userId - The user ID (business owner)
 * @param source - Source of the lead (e.g., 'Website Contact Form')
 * @param data - Lead data (name, email, phone, message, etc.)
 */
export async function ingestNewLead(
  userId: string,
  source: string,
  data: LeadData
): Promise<{ contact: Contact; activityEvent: ActivityEvent | null }> {
  try {
    // Validate required fields
    if (!data.name) {
      throw new LeadIngestionError('Name is required')
    }

    // De-duplicate by email (if provided)
    let contact: Contact | null = null
    
    if (data.email) {
      const { data: existingContact, error: searchError } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .eq('email', data.email)
        .single()

      if (searchError && searchError.code !== 'PGRST116') {
        throw new LeadIngestionError(`Failed to search for existing contact: ${searchError.message}`)
      }

      if (existingContact) {
        contact = {
          id: existingContact.id,
          userId: existingContact.user_id,
          name: existingContact.name,
          email: existingContact.email,
          phone: existingContact.phone,
          tags: existingContact.tags || [], // Don't add 'new_lead' tag to existing contacts
          isUnsubscribed: existingContact.is_unsubscribed || false,
          createdAt: new Date(existingContact.created_at),
          updatedAt: new Date(existingContact.updated_at)
        }

        // Update contact if new data is provided
        const updateData: any = { updated_at: new Date().toISOString() }
        if (data.name && data.name !== contact.name) updateData.name = data.name
        if (data.phone && data.phone !== contact.phone) updateData.phone = data.phone
        if (Object.keys(updateData).length > 1) {
          const { error: updateError } = await supabaseAdmin
            .from('contacts')
            .update(updateData)
            .eq('id', contact.id)

          if (updateError) {
            throw new LeadIngestionError(`Failed to update contact: ${updateError.message}`)
          }

          contact = {
            ...contact,
            ...updateData,
            updatedAt: new Date()
          }
        }

        // For existing contacts, return without creating lead_capture event
        if (!contact) {
          throw new LeadIngestionError('Contact is null after update')
        }
        return { contact, activityEvent: null as any }
      }
    }

    // Create new contact if not found
    const { data: newContact, error: createError } = await supabaseAdmin
      .from('contacts')
      .insert({
        user_id: userId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        tags: ['new_lead'], // Add 'new_lead' tag only for new contacts
        is_unsubscribed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      throw new LeadIngestionError(`Failed to create contact: ${createError.message}`)
    }

    contact = {
      id: newContact.id,
      userId: newContact.user_id,
      name: newContact.name,
      email: newContact.email,
      phone: newContact.phone,
      tags: newContact.tags || ['new_lead'],
      isUnsubscribed: newContact.is_unsubscribed || false,
      createdAt: new Date(newContact.created_at),
      updatedAt: new Date(newContact.updated_at)
    }

    // Create activity event for lead capture (only for new contacts)
    const content = `Lead captured from ${source}${data.message ? `: "${data.message.substring(0, 100)}${data.message.length > 100 ? '...' : ''}"` : ''}`
    
    const { data: activity, error: activityError } = await supabaseAdmin
      .from('activity_events')
      .insert({
        user_id: userId,
        contact_id: contact.id,
        event_type: 'lead_capture',
        content: content,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (activityError) {
      throw new LeadIngestionError(`Failed to create activity event: ${activityError.message}`)
    }

    const activityEvent: ActivityEvent = {
      id: activity.id,
      userId: activity.user_id,
      contactId: activity.contact_id,
      eventType: activity.event_type as ActivityEvent['eventType'],
      content: activity.content,
      createdAt: new Date(activity.created_at)
    }

    // Dispatch action command to trigger automation sequences
    try {
      await dispatchActionCommand(userId, 'NEW_LEAD_ADDED', {
        contactId: contact.id
      })
    } catch (error) {
      // Log error but don't fail the ingestion
      console.error(`[Lead Ingestion] Failed to dispatch NEW_LEAD_ADDED action:`, error)
    }

    return { contact, activityEvent }
  } catch (error) {
    if (error instanceof LeadIngestionError) {
      throw error
    }
    throw new LeadIngestionError(`Unexpected error ingesting lead: ${error.message}`)
  }
}

