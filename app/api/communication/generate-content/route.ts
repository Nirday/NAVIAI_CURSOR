import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { generateCommunicationContent } from '@/libs/communication-hub/src/composer'
import { BusinessProfile } from '@/libs/chat-core/src/types'
import { CommunicationSettings } from '@/libs/communication-hub/src/types'


export const dynamic = 'force-dynamic'
/**
 * POST /api/communication/generate-content
 * Generates communication content (subject lines and body) using AI
 */
export async function POST(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Fetch business profile
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (profileError || !profileData) {
      return NextResponse.json(
        { error: 'Business profile not found' },
        { status: 404 }
      )
    }

    const businessProfile: BusinessProfile = {
      userId: profileData.user_id,
      businessName: profileData.business_name,
      industry: profileData.industry,
      location: profileData.location,
      contactInfo: profileData.contact_info,
      services: profileData.services,
      hours: profileData.hours || [],
      targetAudience: profileData.target_audience,
      brandVoice: profileData.brand_voice,
      customAttributes: profileData.custom_attributes || [],
      createdAt: new Date(profileData.created_at),
      updatedAt: new Date(profileData.updated_at)
    }

    // Fetch or create communication settings
    let settingsData = await supabaseAdmin
      .from('communication_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    let communicationSettings: CommunicationSettings

    if (!settingsData.data) {
      // Create default settings
      const { data: newSettings, error: createError } = await supabaseAdmin
        .from('communication_settings')
        .insert({
          user_id: userId,
          primary_cta: 'Contact us for more information'
        })
        .select()
        .single()
      
      if (createError) {
        throw new Error(`Failed to create settings: ${createError.message}`)
      }

      communicationSettings = {
        id: newSettings.id,
        userId: newSettings.user_id,
        primaryCta: newSettings.primary_cta,
        defaultFromEmail: newSettings.default_from_email,
        defaultFromName: newSettings.default_from_name,
        replyToEmail: newSettings.reply_to_email,
        createdAt: new Date(newSettings.created_at),
        updatedAt: new Date(newSettings.updated_at)
      }
    } else {
      communicationSettings = {
        id: settingsData.data.id,
        userId: settingsData.data.user_id,
        primaryCta: settingsData.data.primary_cta,
        defaultFromEmail: settingsData.data.default_from_email,
        defaultFromName: settingsData.data.default_from_name,
        replyToEmail: settingsData.data.reply_to_email,
        createdAt: new Date(settingsData.data.created_at),
        updatedAt: new Date(settingsData.data.updated_at)
      }
    }

    // Generate content
    const result = await generateCommunicationContent(
      prompt.trim(),
      businessProfile,
      communicationSettings
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error generating communication content:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to generate communication content' },
      { status: 500 }
    )
  }
}

