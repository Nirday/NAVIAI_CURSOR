import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/communication/analytics/sequences/[id]/funnel
 * Fetches funnel data for a specific automation sequence
 * Returns count of contacts at each step
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify sequence belongs to user
    const { data: sequence, error: seqError } = await supabaseAdmin
      .from('automation_sequences')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    
    if (seqError || !sequence) {
      return NextResponse.json(
        { error: 'Sequence not found' },
        { status: 404 }
      )
    }

    // Fetch steps for this sequence
    const { data: steps, error: stepsError } = await supabaseAdmin
      .from('automation_steps')
      .select('id, step_order, action, wait_days, subject')
      .eq('sequence_id', id)
      .order('step_order', { ascending: true })
    
    if (stepsError) {
      throw new Error(`Failed to fetch steps: ${stepsError.message}`)
    }

    // Fetch progress counts grouped by current_step_id
    const { data: progress, error: progressError } = await supabaseAdmin
      .from('automation_contact_progress')
      .select('current_step_id')
      .eq('sequence_id', id)
    
    if (progressError) {
      throw new Error(`Failed to fetch progress: ${progressError.message}`)
    }

    // Count contacts at each step
    const stepCounts: Record<string, number> = {}
    for (const p of progress || []) {
      stepCounts[p.current_step_id] = (stepCounts[p.current_step_id] || 0) + 1
    }

    // Build funnel data
    const funnelData = (steps || []).map(step => {
      const count = stepCounts[step.id] || 0
      
      // Generate step description
      let description = ''
      if (step.action === 'wait') {
        description = `Wait ${step.wait_days || 1} day${(step.wait_days || 1) > 1 ? 's' : ''}`
      } else if (step.action === 'send_email') {
        description = `Send Email${step.subject ? `: ${step.subject.substring(0, 30)}...` : ''}`
      } else if (step.action === 'send_sms') {
        description = 'Send SMS'
      }

      return {
        stepId: step.id,
        stepOrder: step.step_order,
        action: step.action,
        description,
        contactCount: count
      }
    })

    return NextResponse.json({ funnel: funnelData })
  } catch (error: any) {
    console.error('Error fetching sequence funnel:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch sequence funnel' },
      { status: 500 }
    )
  }
}

