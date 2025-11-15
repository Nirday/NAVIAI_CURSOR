/**
 * Contact Adapter
 * Read-only access to contacts from Module 7 (Contact Hub)
 * This module does NOT manage contacts directly
 */

import { supabaseAdmin } from '@/lib/supabase'
import { Contact } from '@/libs/contact-hub/src/types'

/**
 * Fetches contacts for an email broadcast
 * Only returns contacts that have a non-null email field
 * 
 * @param userId - User ID to filter contacts
 * @param tags - Optional array of tags to filter by (OR logic: contact must have any of these tags)
 * @returns Array of contacts with email addresses
 */
export async function fetchContactsForEmailBroadcast(
  userId: string,
  tags?: string[]
): Promise<Contact[]> {
  try {
    let query = supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .not('email', 'is', null) // Only contacts with email
    
    // Apply tag filtering with OR logic
    if (tags && tags.length > 0) {
      // PostgreSQL array overlap operator (&&) checks if arrays have any elements in common
      // This implements OR logic: contact must have any of the specified tags
      query = query.contains('tags', tags) as any
    }
    
    const { data, error } = await query
    
    if (error) {
      throw new Error(`Failed to fetch contacts: ${error.message}`)
    }
    
    // Map database rows to Contact interface
    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      tags: row.tags || [],
      isUnsubscribed: row.is_unsubscribed || false,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }))
  } catch (error: any) {
    console.error('[Contact Adapter] Error fetching contacts for email broadcast:', error)
    throw error
  }
}

/**
 * Fetches contacts for an SMS broadcast
 * Only returns contacts that have a non-null phone field
 * 
 * @param userId - User ID to filter contacts
 * @param tags - Optional array of tags to filter by (OR logic: contact must have any of these tags)
 * @returns Array of contacts with phone numbers
 */
export async function fetchContactsForSmsBroadcast(
  userId: string,
  tags?: string[]
): Promise<Contact[]> {
  try {
    let query = supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .not('phone', 'is', null) // Only contacts with phone
    
    const { data, error } = await query
    
    if (error) {
      throw new Error(`Failed to fetch contacts: ${error.message}`)
    }
    
    // Map database rows to Contact interface
    let contacts = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      tags: row.tags || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }))
    
    // Apply tag filtering with OR logic (contact must have any of the specified tags)
    if (tags && tags.length > 0) {
      contacts = contacts.filter((contact: any) => 
        tags.some((tag: string) => contact.tags.includes(tag))
      )
    }
    
    return contacts
  } catch (error: any) {
    console.error('[Contact Adapter] Error fetching contacts for SMS broadcast:', error)
    throw error
  }
}

/**
 * Fetches all contacts for a user (regardless of channel)
 * Useful for general contact listing or audience creation
 * 
 * @param userId - User ID to filter contacts
 * @param tags - Optional array of tags to filter by (OR logic: contact must have any of these tags)
 * @returns Array of all contacts
 */
export async function fetchAllContacts(
  userId: string,
  tags?: string[]
): Promise<Contact[]> {
  try {
    let query = supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
    
    const { data, error } = await query
    
    if (error) {
      throw new Error(`Failed to fetch contacts: ${error.message}`)
    }
    
    // Map database rows to Contact interface
    let contacts = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      tags: row.tags || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }))
    
    // Apply tag filtering with OR logic (contact must have any of the specified tags)
    if (tags && tags.length > 0) {
      contacts = contacts.filter((contact: any) => 
        tags.some((tag: string) => contact.tags.includes(tag))
      )
    }
    
    return contacts
  } catch (error: any) {
    console.error('[Contact Adapter] Error fetching all contacts:', error)
    throw error
  }
}

/**
 * Fetches a single contact by ID
 * 
 * @param userId - User ID to verify ownership
 * @param contactId - Contact ID to fetch
 * @returns Contact or null if not found
 */
export async function fetchContactById(
  userId: string,
  contactId: string
): Promise<Contact | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('user_id', userId)
      .single()
    
    if (error || !data) {
      return null
    }
    
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      tags: data.tags || [],
      isUnsubscribed: data.is_unsubscribed || false,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  } catch (error: any) {
    console.error('[Contact Adapter] Error fetching contact by ID:', error)
    return null
  }
}

