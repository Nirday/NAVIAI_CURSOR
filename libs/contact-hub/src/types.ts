/**
 * Contact Hub Core Data Structures (Module 7)
 * 
 * Billing Status Tags (system-managed by Module 9):
 * - 'active_customer'
 * - 'trial_user'
 * - 'canceled_customer'
 * 
 * Users can also add custom tags (e.g., 'new_lead', 'website_inquiry', etc.)
 */

export interface Contact {
  id: string
  userId: string
  name: string
  email: string | null
  phone: string | null
  tags: string[] // Includes both system-managed billing tags and user-defined tags
  isUnsubscribed: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ActivityEvent {
  id: string
  userId: string
  contactId: string
  eventType: 'lead_capture' | 'note' | 'email_sent' | 'email_opened' | 'link_clicked' | 'sms_sent' | 'sms_opened' | 'billing_status_change' | 'review_request' | 'negative_feedback' | 'phone_call' // V1.5: Added phone_call
  content: string // Human-readable summary of the event (e.g., "Clicked a link in 'Welcome Email'")
  details?: Record<string, any> // V1.5: JSONB field for additional metadata (e.g., call duration, status)
  createdAt: Date
}

export interface LeadData {
  name: string
  email?: string
  phone?: string
  message?: string
  [key: string]: any
}

