import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { sendApprovalNotification } from '../../../../libs/content-engine/src/approval_workflow'
import { BlogPost } from '../../../../libs/content-engine/src/types'
import { BusinessProfile } from '../../../../libs/chat-core/src/types'

/**
 * POST /api/content/resend-approval
 * Resends approval notification for a pending post
 */
export async function POST(req: NextRequest) {
  const hdrs = headers()
  const userId = hdrs.get('x-user-id')
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { postId } = body

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    // Fetch the post
    const { data: postData, error: postError } = await supabaseAdmin
      .from('blog_posts')
      .select('*')
      .eq('id', postId)
      .eq('user_id', userId)
      .single()

    if (postError || !postData) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    if (postData.status !== 'pending_approval') {
      return NextResponse.json(
        { error: 'Post is not pending approval' },
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

    const profile: BusinessProfile = {
      userId: profileData.user_id,
      businessName: profileData.business_name,
      industry: profileData.industry,
      location: profileData.location as any,
      contactInfo: profileData.contact_info as any,
      services: profileData.services as any,
      hours: profileData.hours as any,
      brandVoice: profileData.brand_voice as any,
      targetAudience: profileData.target_audience || '',
      customAttributes: profileData.custom_attributes as any,
      createdAt: new Date(profileData.created_at),
      updatedAt: new Date(profileData.updated_at)
    }

    const post: BlogPost = {
      id: postData.id,
      userId: postData.user_id,
      title: postData.title,
      slug: postData.slug,
      contentMarkdown: postData.content_markdown,
      seoMetadata: postData.seo_metadata as any,
      focusKeyword: postData.focus_keyword,
      brandedGraphicUrl: postData.branded_graphic_url,
      repurposedAssets: postData.repurposed_assets as any,
      status: postData.status as any,
      approvalToken: postData.approval_token,
      scheduledAt: postData.scheduled_at ? new Date(postData.scheduled_at) : null,
      publishedAt: postData.published_at ? new Date(postData.published_at) : null,
      createdAt: new Date(postData.created_at),
      updatedAt: new Date(postData.updated_at)
    }

    // Resend approval notification
    await sendApprovalNotification(post, profile)

    return NextResponse.json({ success: true, message: 'Approval notification resent successfully' })
  } catch (error: any) {
    console.error('Error resending approval notification:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to resend approval notification' },
      { status: 500 }
    )
  }
}

