import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { AutomationSequence, AutomationStep } from '@/libs/communication-hub/src/types'


export const dynamic = 'force-dynamic'
/**
 * GET /api/communication/automation/sequences/[id]
 * Fetches a single automation sequence
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch sequence
    const { data: sequence, error: seqError } = await supabaseAdmin
      .from('automation_sequences')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    
    if (seqError || !sequence) {
      return NextResponse.json(
        { error: 'Sequence not found' },
        { status: 404 }
      )
    }

    // Fetch steps
    const { data: steps, error: stepsError } = await supabaseAdmin
      .from('automation_steps')
      .select('*')
      .eq('sequence_id', id)
      .order('step_order', { ascending: true })
    
    if (stepsError) {
      throw new Error(`Failed to fetch steps: ${stepsError.message}`)
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
    console.error('Error fetching sequence:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch sequence' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/communication/automation/sequences/[id]
 * Updates an automation sequence
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { name, description, steps, isActive } = body

    // Verify sequence belongs to user
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('automation_sequences')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    
    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Sequence not found' },
        { status: 404 }
      )
    }

    // Update sequence metadata if provided
    if (name !== undefined || description !== undefined || isActive !== undefined) {
      const updateData: any = {}
      if (name !== undefined) updateData.name = name.trim()
      if (description !== undefined) updateData.description = description?.trim() || null
      if (isActive !== undefined) updateData.is_active = isActive

      const { error: updateError } = await supabaseAdmin
        .from('automation_sequences')
        .update(updateData)
        .eq('id', id)

      if (updateError) {
        throw new Error(`Failed to update sequence: ${updateError.message}`)
      }
    }

    // Update steps if provided
    if (steps && Array.isArray(steps)) {
      // Validate steps (same validation as POST)
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

      // Delete all existing steps
      await supabaseAdmin
        .from('automation_steps')
        .delete()
        .eq('sequence_id', id)

      // Insert new steps
      const stepsToInsert = steps.map((step: any, index: number) => ({
        sequence_id: id,
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
        throw new Error(`Failed to update steps: ${stepsError.message}`)
      }
    }

    // Fetch updated sequence
    const { data: sequence } = await supabaseAdmin
      .from('automation_sequences')
      .select('*')
      .eq('id', id)
      .single()

    const { data: updatedSteps } = await supabaseAdmin
      .from('automation_steps')
      .select('*')
      .eq('sequence_id', id)
      .order('step_order', { ascending: true })

    const formattedSteps: AutomationStep[] = (updatedSteps || []).map(step => ({
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
    console.error('Error updating sequence:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update sequence' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/communication/automation/sequences/[id]
 * Deletes an automation sequence
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify sequence belongs to user
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('automation_sequences')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    
    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Sequence not found' },
        { status: 404 }
      )
    }

    // Delete sequence (steps will be deleted via CASCADE)
    const { error: deleteError } = await supabaseAdmin
      .from('automation_sequences')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw new Error(`Failed to delete sequence: ${deleteError.message}`)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting sequence:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to delete sequence' },
      { status: 500 }
    )
  }
}

