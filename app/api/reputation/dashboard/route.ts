import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { ReputationTheme } from '@/libs/reputation-hub/src/types'


export const dynamic = 'force-dynamic'
/**
 * GET /api/reputation/dashboard
 * Fetches dashboard data for the Reputation Hub
 */
export async function GET(req: NextRequest) {
  const hdrs = await headers()
  const userId = hdrs.get('x-user-id')

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch all reviews for metrics
    const { data: reviewsData, error: reviewsError } = await supabaseAdmin
      .from('reviews')
      .select('rating, status, reviewed_at')
      .eq('user_id', userId)

    if (reviewsError) {
      throw new Error(`Failed to fetch reviews: ${reviewsError.message}`)
    }

    const reviews = reviewsData || []

    // Calculate key metrics
    const totalReviews = reviews.length
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0

    // Response rate: percentage of reviews with status 'response_sent'
    const respondedCount = reviews.filter((r: any) => r.status === 'response_sent').length
    const responseRate = totalReviews > 0
      ? (respondedCount / totalReviews) * 100
      : 0

    // Rating distribution (1-5 stars)
    const ratingDistribution = {
      1: reviews.filter((r: any) => r.rating === 1).length,
      2: reviews.filter((r: any) => r.rating === 2).length,
      3: reviews.filter((r: any) => r.rating === 3).length,
      4: reviews.filter((r: any) => r.rating === 4).length,
      5: reviews.filter((r: any) => r.rating === 5).length
    }

    // Fetch themes
    const { data: themesData, error: themesError } = await supabaseAdmin
      .from('reputation_themes')
      .select('*')
      .eq('user_id', userId)
      .order('count', { ascending: true }) // Order by rank (1 = most important)

    if (themesError) {
      throw new Error(`Failed to fetch themes: ${themesError.message}`)
    }

    const themes: ReputationTheme[] = (themesData || []).map((t: any) => ({
      id: t.id,
      userId: t.user_id,
      type: t.type,
      theme: t.theme,
      count: t.count,
      createdAt: new Date(t.created_at)
    }))

    const positiveThemes = themes.filter((t: any) => t.type === 'positive')
    const negativeThemes = themes.filter((t: any) => t.type === 'negative')

    // Calculate rating trend (last 90 days, grouped by week)
    const now = new Date()
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    // Filter reviews from last 90 days
    const recentReviews = reviews.filter((r: any) => {
      const reviewedAt = new Date(r.reviewed_at)
      return reviewedAt >= ninetyDaysAgo
    })

    // Group by week
    const weeklyData: Record<string, { reviews: number[]; weekStart: Date }> = {}

    recentReviews.forEach((r: any) => {
      const reviewedAt = new Date(r.reviewed_at)
      // Get start of week (Monday)
      const weekStart = new Date(reviewedAt)
      const dayOfWeek = weekStart.getDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Adjust to Monday
      weekStart.setDate(weekStart.getDate() + diff)
      weekStart.setHours(0, 0, 0, 0)

      const weekKey = weekStart.toISOString().split('T')[0] // YYYY-MM-DD

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          reviews: [],
          weekStart
        }
      }

      weeklyData[weekKey].reviews.push(r.rating)
    })

    // Calculate average rating per week
    const ratingTrend = Object.entries(weeklyData)
      .map(([weekKey, data]) => {
        const avgRating = data.reviews.length > 0
          ? data.reviews.reduce((sum, r) => sum + r, 0) / data.reviews.length
          : 0

        return {
          week: weekKey,
          weekStart: data.weekStart.toISOString(),
          averageRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
          reviewCount: data.reviews.length
        }
      })
      .sort((a, b) => a.week.localeCompare(b.week)) // Sort by week (chronological)

    return NextResponse.json({
      metrics: {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalReviews,
        responseRate: Math.round(responseRate * 10) / 10 // Round to 1 decimal
      },
      ratingDistribution,
      themes: {
        positive: positiveThemes,
        negative: negativeThemes
      },
      ratingTrend
    })
  } catch (error: any) {
    console.error('Error fetching reputation dashboard data:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

