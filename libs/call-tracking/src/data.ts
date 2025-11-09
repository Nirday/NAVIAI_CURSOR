/**
 * Call Tracking Data Layer
 * Handles database operations for call tracking
 */

import { supabaseAdmin } from '@/lib/supabase'

export interface CallTrackingNumber {
  id: string
  userId: string
  twilioPhoneNumber: string
  twilioPhoneNumberSid: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Get call tracking number for a user
 */
export async function getCallTrackingNumber(userId: string): Promise<CallTrackingNumber | null> {
  const { data, error } = await supabaseAdmin
    .from('call_tracking_numbers')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw new Error(`Failed to fetch call tracking number: ${error.message}`)
  }

  return {
    id: data.id,
    userId: data.user_id,
    twilioPhoneNumber: data.twilio_phone_number,
    twilioPhoneNumberSid: data.twilio_phone_number_sid,
    isActive: data.is_active,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  }
}

/**
 * Create a call tracking number record
 */
export async function createCallTrackingNumber(
  userId: string,
  twilioPhoneNumber: string,
  twilioPhoneNumberSid: string
): Promise<CallTrackingNumber> {
  const { data, error } = await supabaseAdmin
    .from('call_tracking_numbers')
    .insert({
      user_id: userId,
      twilio_phone_number: twilioPhoneNumber,
      twilio_phone_number_sid: twilioPhoneNumberSid,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create call tracking number: ${error.message}`)
  }

  return {
    id: data.id,
    userId: data.user_id,
    twilioPhoneNumber: data.twilio_phone_number,
    twilioPhoneNumberSid: data.twilio_phone_number_sid,
    isActive: data.is_active,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  }
}

/**
 * Deactivate a call tracking number
 */
export async function deactivateCallTrackingNumber(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('call_tracking_numbers')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) {
    throw new Error(`Failed to deactivate call tracking number: ${error.message}`)
  }
}

/**
 * Get user ID from Twilio phone number
 */
export async function getUserIdFromPhoneNumber(phoneNumber: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('call_tracking_numbers')
    .select('user_id')
    .eq('twilio_phone_number', phoneNumber)
    .eq('is_active', true)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to find user for phone number: ${error.message}`)
  }

  return data.user_id
}

