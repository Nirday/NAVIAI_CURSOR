import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { handleNewLeadAdded } from '@/libs/communication-hub/src/engine'

/**
 * Action Queue Processor
 * POST /api/action-queue/process
 * 
 * Processes pending action commands from the action_commands table
 * This is a cron job that runs frequently to process queued commands
 * 
 * Protected by CRON_SECRET environment variable
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('[Action Queue Processor] CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      )
    }
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Fetch pending commands
    const { data: commands, error: fetchError } = await supabaseAdmin
      .from('action_commands')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100) // Process up to 100 commands per run
    
    if (fetchError) {
      throw new Error(`Failed to fetch commands: ${fetchError.message}`)
    }
    
    if (!commands || commands.length === 0) {
      return NextResponse.json({ success: true, processed: 0 })
    }
    
    let processed = 0
    let failed = 0
    
    // Process each command
    for (const command of commands) {
      try {
        // Mark as processing
        await supabaseAdmin
          .from('action_commands')
          .update({ status: 'processing' })
          .eq('id', command.id)
        
        // Process based on command type
        switch (command.command_type) {
          case 'NEW_LEAD_ADDED':
            await handleNewLeadAdded(command.user_id, command.payload.contactId)
            break
          
          // Add other command types here as needed
          // case 'ADD_WEBSITE_BLOG_POST':
          //   await handleAddWebsiteBlogPost(command.user_id, command.payload)
          //   break
          
          default:
            console.warn(`[Action Queue] Unknown command type: ${command.command_type}`)
        }
        
        // Mark as completed
        await supabaseAdmin
          .from('action_commands')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', command.id)
        
        processed++
      } catch (error: any) {
        console.error(`[Action Queue] Error processing command ${command.id}:`, error)
        
        // Mark as failed
        await supabaseAdmin
          .from('action_commands')
          .update({
            status: 'failed',
            error_message: error.message || 'Unknown error'
          })
          .eq('id', command.id)
        
        failed++
      }
    }
    
    return NextResponse.json({
      success: true,
      processed,
      failed,
      total: commands.length
    })
  } catch (error: any) {
    console.error('[Action Queue Processor] Fatal error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process action queue' },
      { status: 500 }
    )
  }
}

