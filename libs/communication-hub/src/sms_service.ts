/**
 * SMS Service
 * Handles sending SMS via Twilio
 */

import twilio from 'twilio'

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

/**
 * Sends an SMS via Twilio
 * 
 * @param to - Recipient phone number (E.164 format)
 * @param message - SMS message content
 * @param from - Sender phone number (defaults to env var)
 * @returns Promise resolving to the message SID
 */
export async function sendSMS(
  to: string,
  message: string,
  from: string = process.env.TWILIO_PHONE_NUMBER || ''
): Promise<string> {
  try {
    if (!from) {
      throw new Error('Twilio phone number not configured')
    }

    const messageData = await twilioClient.messages.create({
      body: message,
      from: from,
      to: to
    })

    return messageData.sid
  } catch (error) {
    console.error('Error sending SMS:', error)
    throw new Error(`Failed to send SMS: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

