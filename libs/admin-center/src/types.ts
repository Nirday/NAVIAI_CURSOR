/**
 * Admin Control Center Types
 * Core data structures for admin functionality
 */

export type UserRole = 'user' | 'admin' | 'super_admin'

/**
 * Feature Flag
 * Simple on/off toggle for V1 (global flags only)
 */
export interface FeatureFlag {
  flagId: string
  description: string
  isEnabled: boolean
}

/**
 * Admin Audit Log
 * Logs all critical admin actions
 */
export interface AdminAuditLog {
  id: string
  adminUserId: string
  action: string // e.g., 'feature_flag_toggled', 'user_impersonated', 'settings_updated'
  details: Record<string, any> // Flexible JSONB field for context
  createdAt: Date
}

/**
 * Admin Invite
 * Secure, single-use invite tokens for admin access
 */
export interface AdminInvite {
  id: string
  email: string
  token: string // Secure, single-use invite token (UUID)
  invitedBy: string // User ID of the super admin who sent the invite
  roleToAssign: 'admin' | 'super_admin' // Role to assign when invite is accepted
  status: 'pending' | 'accepted' | 'expired'
  expiresAt: Date // 24 hours from creation
  createdAt: Date
  acceptedAt?: Date
}

/**
 * Job Run Log
 * Tracks all background job executions
 */
export interface JobRunLog {
  id: string
  jobName: string // e.g., 'runContentScheduler', 'runSeoAudit'
  status: 'success' | 'failed'
  startedAt: Date
  completedAt?: Date
  errorMessage?: string
  details?: Record<string, any> // e.g., { usersProcessed: 150 }
}

/**
 * Platform Setting
 * Global configuration settings (Super Admin only)
 */
export interface PlatformSetting {
  id: string
  key: string // e.g., 'defaultTrialLengthDays', 'maxFileUploadSize'
  value: string // Store value as string, parse as needed
  description: string
  isEditableByAdmin: boolean // Whether this setting can be edited by admins
  updatedAt: Date
  updatedBy?: string // User ID of admin who last updated
}

