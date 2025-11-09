import { NextRequest, NextResponse } from 'next/server'
import { handleNewLeadAdded } from '@/libs/communication-hub/src/engine'

/**
 * New Lead Handler
 * POST /api/communication/automation/new-lead
 * 
 * This endpoint is called when a new lead is added (via action queue from Module 7)
 * Enrolls the contact in all active automation sequences with 'new_lead_added' trigger
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, contactId } = body
    
    if (!userId || !contactId) {
      return NextResponse.json(
        { error: 'userId and contactId are required' },
        { status: 400 }
      )
    }
    
    // Handle new lead event
    await handleNewLeadAdded(userId, contactId)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[New Lead Handler] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to handle new lead' },
      { status: 500 }
    )
  }
}

