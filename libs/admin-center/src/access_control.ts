/**
 * Access Control Utilities
 * Functions for checking user roles and permissions
 */

import { getUserRole, UserRole } from './data'

/**
 * Check if user has admin role
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  return role === 'admin' || role === 'super_admin'
}

/**
 * Check if user has super admin role
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  return role === 'super_admin'
}

/**
 * Check if user has a specific role
 */
export async function hasRole(userId: string, requiredRole: UserRole): Promise<boolean> {
  const role = await getUserRole(userId)
  
  // Role hierarchy: super_admin > admin > user
  if (requiredRole === 'user') {
    return true // All users have 'user' role
  }
  if (requiredRole === 'admin') {
    return role === 'admin' || role === 'super_admin'
  }
  if (requiredRole === 'super_admin') {
    return role === 'super_admin'
  }
  
  return false
}

/**
 * Require admin role (throws if not admin)
 */
export async function requireAdmin(userId: string): Promise<void> {
  const isUserAdmin = await isAdmin(userId)
  if (!isUserAdmin) {
    throw new Error('Admin access required')
  }
}

/**
 * Require super admin role (throws if not super admin)
 */
export async function requireSuperAdmin(userId: string): Promise<void> {
  const isUserSuperAdmin = await isSuperAdmin(userId)
  if (!isUserSuperAdmin) {
    throw new Error('Super admin access required')
  }
}

