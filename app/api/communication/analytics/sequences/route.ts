import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { AutomationSequence } from '@/libs/communication-hub/src/types'


export const dynamic = 'force-dynamic'
/**
 * GET /api/communication/analytics/sequences
 * Fetches all automation sequences for the authenticated user
 */
export async function GET() {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch sequences with steps
    const { data: sequences, error: seqError } = await supabaseAdmin
      .from('automation_sequences')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (seqError) {
      throw new Error(`Failed to fetch sequences: ${seqError.message}`)
    }

    const sequencesWithSteps: AutomationSequence[] = []
    
    for (const seq of sequences || []) {
      const { data: steps, error: stepsError } = await supabaseAdmin
        .from('automation_steps')
        .select('*')
        .eq('sequence_id', seq.id)
        .order('step_order', { ascending: true })
      
      if (stepsError) {
        console.error(`Failed to fetch steps for sequence ${seq.id}:`, stepsError)
        continue
      }

      const formattedSteps = (steps || []).map(step => ({
        id: step.id,
        sequenceId: step.sequence_id,
        order: step.step_order,
        action: step.action,
        subject: step.subject,
        body: step.body,
        waitDays: step.wait_days,
        executedAt: step.executed_at ? new Date(step.executed_at) : null,
        createdAt: new Date(step.created_at)
      }))

      sequencesWithSteps.push({
        id: seq.id,
        userId: seq.user_id,
        name: seq.name,
        description: seq.description,
        triggerType: seq.trigger_type,
        steps: formattedSteps,
        isActive: seq.is_active,
        totalExecutions: seq.total_executions,
        createdAt: new Date(seq.created_at),
        updatedAt: new Date(seq.updated_at)
      })
    }

    return NextResponse.json({ sequences: sequencesWithSteps })
  } catch (error: any) {
    console.error('Error fetching sequences:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch sequences' },
      { status: 500 }
    )
  }
}

