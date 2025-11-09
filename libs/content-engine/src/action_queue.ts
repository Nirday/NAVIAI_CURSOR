/**
 * Action Queue Service
 * Central service for dispatching commands between modules
 */

import { supabaseAdmin } from '@/lib/supabase'
import { randomUUID } from 'crypto'

export interface ActionCommand {
  id: string
  userId: string
  commandType: string
  payload: Record<string, any>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  errorMessage?: string | null
  createdAt: Date
  processedAt?: Date | null
  completedAt?: Date | null
}

/**
 * Dispatches a command to the action queue
 * Other modules will listen for and process these commands
 * 
 * @param userId - The user ID
 * @param commandType - The command type (e.g., 'ADD_WEBSITE_BLOG_POST', 'CREATE_SOCIAL_POST_DRAFT')
 * @param payload - The command payload/parameters
 * @returns Promise resolving to the created command ID
 */
export async function dispatchActionCommand(
  userId: string,
  commandType: string,
  payload: Record<string, any>
): Promise<string> {
  const commandId = randomUUID()

  const { error } = await supabaseAdmin
    .from('action_commands')
    .insert({
      id: commandId,
      user_id: userId,
      command_type: commandType,
      payload: payload,
      status: 'pending'
    })

  if (error) {
    throw new Error(`Failed to dispatch action command: ${error.message}`)
  }

  return commandId
}

