import { NextRequest, NextResponse } from 'next/server'

type ModelId =
  | 'brand_authority'
  | 'direct_response'
  | 'education_first'
  | 'hybrid_commerce'
  | 'community_pillar'

interface BuildDraftArgs {
  businessProfile: any
  websiteAnalysis?: any
  modelId: ModelId
}

const fallback = (value: any, alt: string) =>
  value && typeof value === 'string' && value.trim().length > 0 ? value : alt

const first = (arr: any[], alt: string) =>
  Array.isArray(arr) && arr.length > 0 ? arr[0] : alt

const safeArray = (arr: any) => (Array.isArray(arr) ? arr : [])

function buildSeo(business: any, modelId: ModelId) {
  const name = fallback(business?.businessName, 'Your Business')
  const city =
    fallback(
      business?.contact?.city ||
        business?.location?.city ||
        business?.contactInfo?.city,
      'Your City'
    )
  const primaryService = first(
    safeArray(business?.services).map((s: any) =>
      typeof s === 'string' ? s : s?.name || ''
    ),
    business?.industry || 'Services'
  )

  const baseTitle = `${primaryService} in ${city} | ${name}`
  const baseDesc = `${fallback(
    business?.tagline,
    `Premium ${primaryService.toLowerCase()} in ${city}.`
  )} Book today.`

  const titleByModel: Record<ModelId, string> = {
    brand_authority: baseTitle,
    direct_response: `Book ${primaryService} in ${city} Today | ${name}`,
    education_first: `${primaryService} Guides in ${city} | ${name}`,
    hybrid_commerce: `${primaryService} & Products in ${city} | ${name}`,
    community_pillar: `${city} ${primaryService} Trusted by Locals | ${name}`
  }

  const descByModel: Record<ModelId, string> = {
    brand_authority: `${primaryService} for discerning clients in ${city}. White-glove service, trusted by locals.`,
    direct_response: `Instant booking for ${primaryService} in ${city}. 24/7 scheduling, fast confirmation.`,
    education_first: `Learn everything about ${primaryService} in ${city}. Guides, FAQs, and next steps.`,
    hybrid_commerce: `Book ${primaryService} and shop products in ${city}. Subscriptions, bundles, gift cards.`,
    community_pillar: `${primaryService} loved in ${city}. ${name} is top-rated locally—see stories and events.`
  }

  return {
    title: titleByModel[modelId] || baseTitle,
    description: descByModel[modelId] || baseDesc,
    ogTitle: `${name} — ${primaryService} in ${city}`,
    ogDescription: descByModel[modelId] || baseDesc,
    twitterTitle: titleByModel[modelId] || baseTitle,
    twitterDescription: descByModel[modelId] || baseDesc,
    schema: [
      'LocalBusiness',
      'Service',
      'FAQ',
      modelId === 'community_pillar' ? 'Event' : undefined,
      modelId === 'hybrid_commerce' ? 'Product' : undefined
    ].filter(Boolean)
  }
}

function buildImages(business: any, modelId: ModelId) {
  const city =
    business?.contact?.city ||
    business?.location?.city ||
    business?.contactInfo?.city ||
    'your city'
  const industry = business?.industry || 'business'
  const fleet = safeArray(business?.fleet || business?.assets)

  if (modelId === 'brand_authority') {
    return [
      {
        label: 'Hero',
        alt: 'Professional hero image representing premium service',
        description: `Cinematic hero showing ${industry} for ${city}.`
      },
      {
        label: 'Proof',
        alt: 'Credentials and client logos',
        description: 'Badges/logos for trust (licenses, notable clients).'
      },
      fleet[0]
        ? {
            label: 'Flagship',
            alt: typeof fleet[0] === 'string' ? fleet[0] : fleet[0].name || 'Flagship asset',
            description: 'Show the most premium asset/vehicle.'
          }
        : undefined
    ].filter(Boolean)
  }

  if (modelId === 'direct_response') {
    return [
      {
        label: 'Hero',
        alt: 'Action shot for service with clear CTA overlay',
        description: 'High-conversion hero with CTA and contact.'
      },
      {
        label: 'Trust',
        alt: 'Ratings and reviews badge',
        description: 'Google stars or testimonials snippet.'
      }
    ]
  }

  if (modelId === 'education_first') {
    return [
      {
        label: 'Hero',
        alt: 'Expert explaining service in approachable manner',
        description: 'Warm, educational hero image.'
      },
      {
        label: 'Content',
        alt: 'Blog/article thumbnails',
        description: 'Guide/FAQ cards for SEO.'
      }
    ]
  }

  if (modelId === 'hybrid_commerce') {
    return [
      {
        label: 'Hero',
        alt: 'Service + product split visual',
        description: 'Service action plus product hero.'
      },
      {
        label: 'Products',
        alt: 'Featured products grid',
        description: 'Gift cards, bundles with pricing.'
      }
    ]
  }

  return [
    {
      label: 'Hero',
      alt: 'Happy local customers/community',
      description: 'Collage of local customers for trust.'
    },
    {
      label: 'Events',
      alt: 'Community event photo',
      description: 'Workshops or local meetups.'
    }
  ]
}

function buildSections(business: any, analysis: any, modelId: ModelId) {
  const name = fallback(business?.businessName, 'Your Business')
  const city =
    fallback(
      business?.contact?.city ||
        business?.location?.city ||
        business?.contactInfo?.city,
      'Your City'
    )
  const services = safeArray(business?.services).map((s: any) =>
    typeof s === 'string' ? s : s?.name || ''
  )
  const fleet = safeArray(business?.fleet || business?.assets)
  const rating = analysis?.trust?.reviewScore || analysis?.trust?.rating || '4.9'
  const hasBooking = analysis?.conversion?.hasOnlineBooking

  const hero = {
    kind: 'hero',
    headline:
      modelId === 'direct_response'
        ? `Book ${services[0] || 'Your Service'} in ${city} Today`
        : modelId === 'brand_authority'
          ? `${name}: Excellence in ${city}`
          : modelId === 'education_first'
            ? `Understand ${services[0] || 'Your Options'}`
            : modelId === 'hybrid_commerce'
              ? `Book Services • Shop Products`
              : `${city}'s Favorite ${services[0] || 'Team'}`,
    subheadline:
      modelId === 'brand_authority'
        ? `${fallback(
            business?.tagline,
            `${services[0] || 'Premium service'} for discerning clients in ${city}`
          )}`
        : modelId === 'direct_response'
          ? `Instant confirmation • ${hasBooking ? 'Online booking' : 'Call to book'} • 24/7`
          : modelId === 'education_first'
            ? `Guides, FAQs, and clear next steps for ${city} visitors`
            : modelId === 'hybrid_commerce'
              ? `Everything in one place — book and buy with confidence`
              : `${rating}★ rated and trusted locally.`,
    ctaPrimary:
      modelId === 'direct_response'
        ? 'Check Availability'
        : modelId === 'brand_authority'
          ? 'Request Concierge Service'
          : modelId === 'education_first'
            ? 'Take the Free Assessment'
            : modelId === 'hybrid_commerce'
              ? 'Browse & Book'
              : 'Join Our Community',
    ctaSecondary:
      modelId === 'direct_response'
        ? 'Call Now'
        : modelId === 'brand_authority'
          ? 'View Credentials'
          : modelId === 'education_first'
            ? 'Browse Articles'
            : modelId === 'hybrid_commerce'
              ? 'View Products'
              : 'See Events'
  }

  const serviceSections = [
    {
      kind: 'services',
      title: 'Services',
      items: services.slice(0, 6).map((s) => ({
        title: s,
        description: `Local ${s.toLowerCase()} service in ${city}.`
      })),
      layout: modelId === 'direct_response' ? 'cta-grid' : 'cards'
    }
  ]

  const fleetSection =
    fleet.length > 0
      ? [
          {
            kind: 'fleet',
            title: 'Fleet / Assets',
            items: fleet.slice(0, 8).map((f: any) => ({
              title: typeof f === 'string' ? f : f?.name || 'Vehicle',
              subtitle: f?.capacity ? `${f.capacity} pax` : '',
              description: f?.amenities
                ? `Amenities: ${safeArray(f.amenities).join(', ')}`
                : ''
            }))
          }
        ]
      : []

  const trustSection = [
    {
      kind: 'socialProof',
      title: 'Proof',
      rating,
      reviewCount: analysis?.trust?.reviewCount || 120,
      badges: analysis?.trust?.badges || ['Licensed & Insured', 'Local Favorite'],
      testimonials: safeArray(analysis?.trust?.testimonials).slice(0, 3)
    }
  ]

  const faqSection =
    safeArray(business?.faqTopics).length > 0
      ? [
          {
            kind: 'faq',
            title: 'Top Questions',
            faqs: safeArray(business?.faqTopics).slice(0, 5).map((q: string) => ({
              question: q,
              answer: 'Answer tailored to your policy/offering.'
            }))
          }
        ]
      : []

  const contactSection = [
    {
      kind: 'contact',
      title: 'Contact & Service Areas',
      phone: business?.contact?.phone || business?.contactInfo?.phone,
      email: business?.contact?.email || business?.contactInfo?.email,
      address:
        business?.location?.address ||
        business?.contact?.address ||
        business?.contactInfo?.address,
      mapLink: business?.contactInfo?.mapLink,
      serviceAreas: safeArray(business?.serviceAreas || business?.locations).slice(0, 6)
    }
  ]

  return [hero, ...serviceSections, ...fleetSection, ...trustSection, ...faqSection, ...contactSection]
}

function buildDraft({ businessProfile, websiteAnalysis, modelId }: BuildDraftArgs) {
  const seo = buildSeo(businessProfile, modelId)
  const sections = buildSections(businessProfile, websiteAnalysis, modelId)
  const images = buildImages(businessProfile, modelId)

  return {
    modelId,
    businessName: businessProfile?.businessName || 'Your Business',
    city:
      businessProfile?.contact?.city ||
      businessProfile?.location?.city ||
      businessProfile?.contactInfo?.city ||
      'Your City',
    seo,
    sections,
    images,
    metadata: {
      createdAt: new Date().toISOString(),
      version: 'v1'
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { businessProfile, websiteAnalysis, modelId } = body as BuildDraftArgs

    if (!businessProfile || !modelId) {
      return NextResponse.json(
        { error: 'businessProfile and modelId are required' },
        { status: 400 }
      )
    }

    const draft = buildDraft({ businessProfile, websiteAnalysis, modelId })

    return NextResponse.json({ success: true, draft })
  } catch (error) {
    console.error('[website/draft] error', error)
    return NextResponse.json(
        { success: false, error: 'Failed to build draft' },
        { status: 500 }
      )
  }
}

