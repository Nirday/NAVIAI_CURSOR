/**
 * Admin Control Center Data Access
 * Functions for interacting with admin-related database tables
 */

import { supabaseAdmin } from '@/lib/supabase'
import {
  UserRole,
  FeatureFlag,
  AdminAuditLog,
  AdminInvite,
  JobRunLog,
  PlatformSetting
} from './types'

// Re-export types for convenience
export type { UserRole, FeatureFlag, AdminAuditLog, AdminInvite, JobRunLog, PlatformSetting }

/**
 * User Profiles
 */

export async function getUserRole(userId: string): Promise<UserRole> {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    // Default to 'user' if profile doesn't exist
    return 'user'
  }

  return data.role as UserRole
}

export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  // Upsert user profile
  const { error } = await supabaseAdmin
    .from('user_profiles')
    .upsert({
      user_id: userId,
      role: role,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })

  if (error) {
    throw new Error(`Failed to set user role: ${error.message}`)
  }

  // Update JWT custom claim via Supabase Admin API
  // Note: This requires Supabase Admin API access
  try {
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (userData?.user) {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        app_metadata: {
          ...userData.user.app_metadata,
          role: role
        }
      })
    }
  } catch (error: any) {
    console.error('Failed to update JWT role claim:', error)
    // Don't throw - role is still set in database
  }
}

export async function createUserProfile(userId: string, role: UserRole = 'user'): Promise<void> {
  const { error } = await supabaseAdmin
    .from('user_profiles')
    .insert({
      user_id: userId,
      role: role
    })

  if (error) {
    throw new Error(`Failed to create user profile: ${error.message}`)
  }
}

/**
 * Feature Flags
 */

export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const { data, error } = await supabaseAdmin
    .from('feature_flags')
    .select('*')
    .order('flag_id')

  if (error) {
    throw new Error(`Failed to fetch feature flags: ${error.message}`)
  }

  return data.map(row => ({
    flagId: row.flag_id,
    description: row.description,
    isEnabled: row.is_enabled
  }))
}

export async function getFeatureFlag(flagId: string): Promise<FeatureFlag | null> {
  const { data, error } = await supabaseAdmin
    .from('feature_flags')
    .select('*')
    .eq('flag_id', flagId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch feature flag: ${error.message}`)
  }

  return {
    flagId: data.flag_id,
    description: data.description,
    isEnabled: data.is_enabled
  }
}

export async function toggleFeatureFlag(flagId: string, isEnabled: boolean): Promise<void> {
  const { error } = await supabaseAdmin
    .from('feature_flags')
    .update({
      is_enabled: isEnabled,
      updated_at: new Date().toISOString()
    })
    .eq('flag_id', flagId)

  if (error) {
    throw new Error(`Failed to toggle feature flag: ${error.message}`)
  }
}

export async function createFeatureFlag(flag: Omit<FeatureFlag, 'id'>): Promise<void> {
  const { error } = await supabaseAdmin
    .from('feature_flags')
    .insert({
      flag_id: flag.flagId,
      description: flag.description,
      is_enabled: flag.isEnabled
    })

  if (error) {
    throw new Error(`Failed to create feature flag: ${error.message}`)
  }
}

/**
 * Admin Audit Logs
 */

export async function createAuditLog(
  adminUserId: string,
  action: string,
  details: Record<string, any>
): Promise<AdminAuditLog> {
  const { data, error } = await supabaseAdmin
    .from('admin_audit_logs')
    .insert({
      admin_user_id: adminUserId,
      action: action,
      details: details
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create audit log: ${error.message}`)
  }

  return {
    id: data.id,
    adminUserId: data.admin_user_id,
    action: data.action,
    details: data.details,
    createdAt: new Date(data.created_at)
  }
}

export async function getAuditLogs(limit: number = 100): Promise<AdminAuditLog[]> {
  const { data, error } = await supabaseAdmin
    .from('admin_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`)
  }

  return data.map(row => ({
    id: row.id,
    adminUserId: row.admin_user_id,
    action: row.action,
    details: row.details,
    createdAt: new Date(row.created_at)
  }))
}

/**
 * Admin Invites
 */

export async function createAdminInvite(
  email: string,
  invitedBy: string,
  token: string,
  expiresAt: Date,
  roleToAssign: 'admin' | 'super_admin' = 'admin'
): Promise<AdminInvite> {
  const { data, error } = await supabaseAdmin
    .from('admin_invites')
    .insert({
      email: email,
      token: token,
      invited_by: invitedBy,
      role_to_assign: roleToAssign,
      expires_at: expiresAt.toISOString(),
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create admin invite: ${error.message}`)
  }

  return {
    id: data.id,
    email: data.email,
    token: data.token,
    invitedBy: data.invited_by,
    roleToAssign: data.role_to_assign || 'admin',
    status: data.status,
    expiresAt: new Date(data.expires_at),
    createdAt: new Date(data.created_at),
    acceptedAt: data.accepted_at ? new Date(data.accepted_at) : undefined
  }
}

export async function getAdminInviteByToken(token: string): Promise<AdminInvite | null> {
  const { data, error } = await supabaseAdmin
    .from('admin_invites')
    .select('*')
    .eq('token', token)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch admin invite: ${error.message}`)
  }

  return {
    id: data.id,
    email: data.email,
    token: data.token,
    invitedBy: data.invited_by,
    roleToAssign: data.role_to_assign || 'admin',
    status: data.status,
    expiresAt: new Date(data.expires_at),
    createdAt: new Date(data.created_at),
    acceptedAt: data.accepted_at ? new Date(data.accepted_at) : undefined
  }
}

export async function acceptAdminInvite(token: string, userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('admin_invites')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString()
    })
    .eq('token', token)
    .eq('status', 'pending')

  if (error) {
    throw new Error(`Failed to accept admin invite: ${error.message}`)
  }
}

/**
 * Job Run Logs
 */

export async function createJobRunLog(
  jobName: string,
  status: 'success' | 'failed',
  startedAt: Date,
  completedAt?: Date,
  errorMessage?: string,
  details?: Record<string, any>
): Promise<JobRunLog> {
  const { data, error } = await supabaseAdmin
    .from('job_run_logs')
    .insert({
      job_name: jobName,
      status: status,
      started_at: startedAt.toISOString(),
      completed_at: completedAt?.toISOString(),
      error_message: errorMessage,
      details: details || null
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create job run log: ${error.message}`)
  }

  return {
    id: data.id,
    jobName: data.job_name,
    status: data.status,
    startedAt: new Date(data.started_at),
    completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
    errorMessage: data.error_message,
    details: data.details
  }
}

export async function getJobRunLogs(jobName?: string, limit: number = 50): Promise<JobRunLog[]> {
  let query = supabaseAdmin
    .from('job_run_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (jobName) {
    query = query.eq('job_name', jobName)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch job run logs: ${error.message}`)
  }

  return data.map(row => ({
    id: row.id,
    jobName: row.job_name,
    status: row.status,
    startedAt: new Date(row.started_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    errorMessage: row.error_message,
    details: row.details
  }))
}

/**
 * Platform Settings
 */

export async function getAllPlatformSettings(): Promise<PlatformSetting[]> {
  const { data, error } = await supabaseAdmin
    .from('platform_settings')
    .select('*')
    .order('key')

  if (error) {
    throw new Error(`Failed to fetch platform settings: ${error.message}`)
  }

  return data.map(row => ({
    id: row.id,
    key: row.key,
    value: row.value,
    description: row.description,
    isEditableByAdmin: row.is_editable_by_admin || false,
    updatedAt: new Date(row.updated_at),
    updatedBy: row.updated_by
  }))
}

export async function getPlatformSetting(key: string): Promise<PlatformSetting | null> {
  const { data, error } = await supabaseAdmin
    .from('platform_settings')
    .select('*')
    .eq('key', key)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch platform setting: ${error.message}`)
  }

  return {
    id: data.id,
    key: data.key,
    value: data.value,
    description: data.description,
    isEditableByAdmin: data.is_editable_by_admin || false,
    updatedAt: new Date(data.updated_at),
    updatedBy: data.updated_by
  }
}

export async function updatePlatformSetting(
  key: string,
  value: string,
  updatedBy: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('platform_settings')
    .update({
      value: value,
      updated_by: updatedBy,
      updated_at: new Date().toISOString()
    })
    .eq('key', key)

  if (error) {
    throw new Error(`Failed to update platform setting: ${error.message}`)
  }
}

export async function createPlatformSetting(
  setting: Omit<PlatformSetting, 'id' | 'updatedAt' | 'updatedBy'>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('platform_settings')
    .insert({
      key: setting.key,
      value: setting.value,
      description: setting.description,
      is_editable_by_admin: setting.isEditableByAdmin || false
    })

  if (error) {
    throw new Error(`Failed to create platform setting: ${error.message}`)
  }
}

