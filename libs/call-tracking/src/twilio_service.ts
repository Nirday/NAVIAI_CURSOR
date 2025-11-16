/**
 * Twilio Service for Call Tracking
 * Handles phone number provisioning, call management, and webhook processing
 */

import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const phoneNumberPool = process.env.TWILIO_PHONE_NUMBER_POOL?.split(',') || []

if (!accountSid || !authToken) {
  console.warn('Twilio credentials not configured. Call tracking features will be disabled.')
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null

export interface TwilioPhoneNumber {
  phoneNumber: string
  phoneNumberSid: string
  friendlyName?: string
  capabilities: {
    voice: boolean
    sms: boolean
    mms: boolean
  }
}

export interface CallDetails {
  callSid: string
  from: string
  to: string
  status: 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'failed' | 'no-answer'
  duration?: number // in seconds
  direction: 'inbound' | 'outbound'
  startTime: Date
  endTime?: Date
}

/**
 * Provision a new phone number for a user
 * Attempts to get a number from the pool, or purchases a new one
 */
export async function provisionPhoneNumber(
  userId: string,
  areaCode?: string
): Promise<TwilioPhoneNumber> {
  if (!client) {
    throw new Error('Twilio client not initialized. Please configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.')
  }

  try {
    // First, try to get a number from our pool
    if (phoneNumberPool.length > 0) {
      const availableNumber = phoneNumberPool[0] // Simple: use first available
      // In production, you'd check if this number is already assigned
      
      return {
        phoneNumber: availableNumber,
        phoneNumberSid: '', // Would need to fetch from Twilio
        capabilities: {
          voice: true,
          sms: true,
          mms: false
        }
      }
    }

    // If no pool, search for available numbers
    const searchOptions: any = {
      voiceEnabled: true,
      smsEnabled: true,
      limit: 1
    }

    if (areaCode) {
      searchOptions.areaCode = areaCode
    }

    const availableNumbers = await client.availablePhoneNumbers('US')
      .local
      .list(searchOptions)

    if (availableNumbers.length === 0) {
      throw new Error('No available phone numbers found')
    }

    const selectedNumber = availableNumbers[0]

    // Purchase the number
    const purchasedNumber = await client.incomingPhoneNumbers.create({
      phoneNumber: selectedNumber.phoneNumber,
      friendlyName: `Navi AI - User ${userId}`,
      voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/call-tracking/webhook`,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/call-tracking/webhook`
    })

    return {
      phoneNumber: purchasedNumber.phoneNumber,
      phoneNumberSid: purchasedNumber.sid,
      friendlyName: purchasedNumber.friendlyName || undefined,
      capabilities: {
        voice: purchasedNumber.capabilities?.voice || false,
        sms: purchasedNumber.capabilities?.sms || false,
        mms: purchasedNumber.capabilities?.mms || false
      }
    }
  } catch (error: any) {
    console.error('[Twilio] Error provisioning phone number:', error)
    throw new Error(`Failed to provision phone number: ${error.message}`)
  }
}

/**
 * Release a phone number (when user cancels or downgrades)
 */
export async function releasePhoneNumber(phoneNumberSid: string): Promise<void> {
  if (!client) {
    throw new Error('Twilio client not initialized')
  }

  try {
    await client.incomingPhoneNumbers(phoneNumberSid).remove()
  } catch (error: any) {
    console.error('[Twilio] Error releasing phone number:', error)
    throw new Error(`Failed to release phone number: ${error.message}`)
  }
}

/**
 * Get call details from Twilio
 */
export async function getCallDetails(callSid: string): Promise<CallDetails | null> {
  if (!client) {
    return null
  }

  try {
    const call = await client.calls(callSid).fetch()
    
    return {
      callSid: call.sid,
      from: call.from || '',
      to: call.to || '',
      status: mapTwilioStatus(call.status),
      duration: call.duration ? parseInt(call.duration) : undefined,
      direction: call.direction === 'inbound' ? 'inbound' : 'outbound',
      startTime: call.dateCreated || new Date(),
      endTime: call.dateUpdated || undefined
    }
  } catch (error: any) {
    console.error('[Twilio] Error fetching call details:', error)
    return null
  }
}

/**
 * Map Twilio call status to our internal status
 */
function mapTwilioStatus(twilioStatus: string): CallDetails['status'] {
  const statusMap: Record<string, CallDetails['status']> = {
    'queued': 'initiated',
    'ringing': 'ringing',
    'in-progress': 'in-progress',
    'completed': 'completed',
    'busy': 'busy',
    'failed': 'failed',
    'no-answer': 'no-answer',
    'canceled': 'failed'
  }
  
  return statusMap[twilioStatus] || 'failed'
}

/**
 * Validate Twilio webhook signature
 */
export function validateWebhookSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  if (!authToken) {
    return false
  }

  try {
    return twilio.validateRequest(authToken, signature, url, params)
  } catch (error) {
    console.error('[Twilio] Webhook signature validation failed:', error)
    return false
  }
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '')
  
  // Format as (XXX) XXX-XXXX
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  
  // Format as +X (XXX) XXX-XXXX for international
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  
  return phoneNumber // Return as-is if format is unexpected
}

