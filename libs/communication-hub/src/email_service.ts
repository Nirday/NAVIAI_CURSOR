/**
 * Email Service
 * Handles sending emails via Resend
 */

import { Resend } from 'resend'

// Lazy initialization to avoid errors when API key is not set
let resend: Resend | null = null
function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resend = new Resend(apiKey)
  }
  return resend
}

/**
 * Sends an email via Resend
 * 
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param html - HTML email content
 * @param from - Sender email (defaults to env var or noreply)
 * @returns Promise resolving to the email ID
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  from: string = process.env.RESEND_FROM_EMAIL || 'noreply@naviai.com'
): Promise<string> {
  try {
    const { data, error } = await getResend().emails.send({
      from: from,
      to: [to],
      subject: subject,
      html: html
    })

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`)
    }

    return data?.id || 'unknown'
  } catch (error) {
    console.error('Error sending email:', error)
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

