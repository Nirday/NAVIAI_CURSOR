import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { AutomationSequence, AutomationStep } from '@/libs/communication-hub/src/types'


export const dynamic = 'force-dynamic'
/**
 * GET /api/communication/automation/sequences
 * Fetches all automation sequences for the authenticated user
 */
export async function GET() {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch sequences
    const { data: sequences, error: seqError } = await supabaseAdmin
      .from('automation_sequences')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (seqError) {
      throw new Error(`Failed to fetch sequences: ${seqError.message}`)
    }

    // Fetch steps for each sequence
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

      const formattedSteps: AutomationStep[] = (steps || []).map(step => ({
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

/**
 * POST /api/communication/automation/sequences
 * Creates a new automation sequence
 */
export async function POST(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, description, steps } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Sequence name is required' },
        { status: 400 }
      )
    }

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: 'At least one step is required' },
        { status: 400 }
      )
    }

    // Validate steps
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      if (!step.action || !['send_email', 'send_sms', 'wait'].includes(step.action)) {
        return NextResponse.json(
          { error: `Invalid action for step ${i + 1}` },
          { status: 400 }
        )
      }

      if (step.action === 'wait') {
        if (!step.waitDays || step.waitDays < 1) {
          return NextResponse.json(
            { error: `Wait step ${i + 1} must have at least 1 day` },
            { status: 400 }
          )
        }
      } else {
        // send_email or send_sms
        if (!step.body || typeof step.body !== 'string' || !step.body.trim()) {
          return NextResponse.json(
            { error: `Send step ${i + 1} must have body content` },
            { status: 400 }
          )
        }
        if (step.action === 'send_email' && (!step.subject || typeof step.subject !== 'string' || !step.subject.trim())) {
          return NextResponse.json(
            { error: `Email step ${i + 1} must have a subject` },
            { status: 400 }
          )
        }
      }

      // Validate no consecutive wait steps
      if (i > 0 && step.action === 'wait' && steps[i - 1].action === 'wait') {
        return NextResponse.json(
          { error: 'Cannot have consecutive wait steps' },
          { status: 400 }
        )
      }
    }

    // Create sequence
    const { data: sequence, error: seqError } = await supabaseAdmin
      .from('automation_sequences')
      .insert({
        user_id: userId,
        name: name.trim(),
        description: description?.trim() || null,
        trigger_type: 'new_lead_added',
        is_active: true,
        total_executions: 0
      })
      .select()
      .single()

    if (seqError) {
      throw new Error(`Failed to create sequence: ${seqError.message}`)
    }

    // Create steps
    const stepsToInsert = steps.map((step: any, index: number) => ({
      sequence_id: sequence.id,
      step_order: index,
      action: step.action,
      subject: step.subject || null,
      body: step.body || null,
      wait_days: step.waitDays || null
    }))

    const { error: stepsError } = await supabaseAdmin
      .from('automation_steps')
      .insert(stepsToInsert)

    if (stepsError) {
      // Clean up sequence if steps fail
      await supabaseAdmin
        .from('automation_sequences')
        .delete()
        .eq('id', sequence.id)
      
      throw new Error(`Failed to create steps: ${stepsError.message}`)
    }

    // Fetch created sequence with steps
    const { data: createdSteps } = await supabaseAdmin
      .from('automation_steps')
      .select('*')
      .eq('sequence_id', sequence.id)
      .order('step_order', { ascending: true })

    const formattedSteps: AutomationStep[] = (createdSteps || []).map(step => ({
      id: step.id,
      sequenceId: step.sequence_id,
      order: step.step_order,
      action: step.action,
      subject: step.subject,
      body: step.body,
      waitDays: step.wait_days,
      executedAt: null,
      createdAt: new Date(step.created_at)
    }))

    const formattedSequence: AutomationSequence = {
      id: sequence.id,
      userId: sequence.user_id,
      name: sequence.name,
      description: sequence.description,
      triggerType: sequence.trigger_type,
      steps: formattedSteps,
      isActive: sequence.is_active,
      totalExecutions: sequence.total_executions,
      createdAt: new Date(sequence.created_at),
      updatedAt: new Date(sequence.updated_at)
    }

    return NextResponse.json({ sequence: formattedSequence })
  } catch (error: any) {
    console.error('Error creating sequence:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create sequence' },
      { status: 500 }
    )
  }
}

