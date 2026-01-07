'use client'

import { useState, useEffect } from 'react'

interface WebsiteModelsShowcaseProps {
  businessData: any
  onSelectModel: (modelId: string) => void
}

interface WebsiteModel {
  id: string
  name: string
  tagline: string
  icon: string
  gradient: string
  heroStyle: string
  description: string
  bestFor: string
  pros: string[]
  cons: string[]
  solves: string[]
  previewElements: {
    headline: string
    subheadline: string
    cta: string
    features: string[]
  }
  images?: {
    label: string
    alt: string
    description: string
  }[]
  seoPlan?: {
    title: string
    description: string
    og: string
    twitter: string
    schema: string[]
    localActions: string[]
  }
}

// Industry-specific design configurations
const getIndustryConfig = (industry: string, businessData?: any) => {
  const industryLower = industry?.toLowerCase() || ''
  const businessName = businessData?.businessName?.toLowerCase() || ''
  const services = (businessData?.services || []).map((s: any) => 
    (typeof s === 'string' ? s : s.name || '').toLowerCase()
  ).join(' ')
  const description = businessData?.description?.toLowerCase() || ''
  const allText = `${industryLower} ${businessName} ${services} ${description}`
  
  // CHAUFFEUR / LIMO / EXECUTIVE TRANSPORT (luxury, events, corporate)
  if (allText.includes('limo') || allText.includes('chauffeur') || allText.includes('executive') || 
      allText.includes('wedding') || allText.includes('prom') || allText.includes('black car') ||
      allText.includes('town car') || allText.includes('party bus') || allText.includes('charter')) {
    return {
      type: 'chauffeur',
      subtype: allText.includes('party bus') || allText.includes('charter') ? 'party_bus' : 
               allText.includes('wedding') ? 'wedding_limo' :
               allText.includes('corporate') || allText.includes('executive') ? 'executive_transport' : 'luxury_limo',
      heroImage: 'Professional chauffeur opening door of black Mercedes S-Class at night, city lights reflecting',
      imageAlt: 'Luxury chauffeur service',
      colors: { primary: 'slate-900', accent: 'amber-500', bg: 'black' },
      vibes: ['White-Glove Service', 'Punctuality', 'Discretion', 'Luxury'],
      ctaStyle: 'gold-bordered',
      ctaText: 'Reserve Your Ride',
      sections: ['Fleet Gallery', 'Service Areas', 'Corporate Accounts', 'Special Occasions'],
      typography: 'serif elegant',
      heroElements: ['Professional chauffeur', 'Luxury vehicle exterior at night', 'Red carpet/VIP entrance'],
      trustBadges: ['Licensed & Insured', '24/7 Dispatch', 'Background-Checked Chauffeurs']
    }
  }
  
  // CAR RENTAL (self-drive, budget/economy)
  if (allText.includes('rental') || allText.includes('rent a car') || allText.includes('self-drive')) {
    return {
      type: 'car_rental',
      heroImage: 'Row of clean rental cars in a bright lot, customer receiving keys',
      imageAlt: 'Car rental fleet',
      colors: { primary: 'blue-600', accent: 'green-500', bg: 'white' },
      vibes: ['Convenience', 'Value', 'Freedom'],
      ctaStyle: 'bold',
      ctaText: 'Get a Quote',
      sections: ['Vehicle Selection', 'Pricing', 'Locations', 'FAQ'],
      typography: 'clean modern',
      heroElements: ['Car keys handoff', 'Fleet lineup', 'Happy customer driving'],
      trustBadges: ['No Hidden Fees', 'Free Cancellation', '24/7 Roadside']
    }
  }
  
  // CAR DEALERSHIP (sales)
  if (allText.includes('dealership') || allText.includes('car sales') || allText.includes('auto sales') ||
      allText.includes('buy a car') || allText.includes('pre-owned')) {
    return {
      type: 'car_dealership',
      heroImage: 'Shiny new car in showroom with dramatic lighting',
      imageAlt: 'Auto dealership showroom',
      colors: { primary: 'red-700', accent: 'gray-800', bg: 'white' },
      vibes: ['Selection', 'Deals', 'Financing'],
      ctaStyle: 'bold',
      ctaText: 'Browse Inventory',
      sections: ['New Inventory', 'Pre-Owned', 'Financing', 'Trade-In'],
      typography: 'bold modern',
      heroElements: ['Showroom floor', 'Featured vehicle', 'Sales team'],
      trustBadges: ['Certified Pre-Owned', 'Easy Financing', 'Trade-In Welcome']
    }
  }
  
  // CORPORATE SHUTTLE / EMPLOYEE TRANSPORT
  if (allText.includes('shuttle') || allText.includes('employee transport') || allText.includes('commuter') ||
      allText.includes('campus') || allText.includes('inter-office')) {
    return {
      type: 'corporate_shuttle',
      heroImage: 'Modern executive coach bus outside tech campus, employees boarding',
      imageAlt: 'Corporate shuttle service',
      colors: { primary: 'indigo-700', accent: 'cyan-500', bg: 'slate-50' },
      vibes: ['Efficiency', 'Productivity', 'Sustainability'],
      ctaStyle: 'modern',
      ctaText: 'Request Proposal',
      sections: ['Fleet Options', 'Route Planning', 'Corporate Programs', 'Sustainability'],
      typography: 'clean corporate',
      heroElements: ['Executive coach exterior', 'Employees with laptops on bus', 'Tech campus'],
      trustBadges: ['WiFi Equipped', 'Track & Trace', 'Carbon Offset']
    }
  }
  if (industryLower.includes('chiro') || industryLower.includes('health') || industryLower.includes('medical') || industryLower.includes('wellness')) {
    return {
      type: 'healthcare',
      heroImage: 'calm wellness space, natural light',
      colors: { primary: 'teal-700', accent: 'emerald-500', bg: 'white' },
      vibes: ['Trust', 'Healing', 'Professional'],
      ctaStyle: 'soft-rounded',
      sections: ['Services', 'Meet the Doctor', 'Patient Stories', 'Insurance Info'],
      typography: 'clean modern'
    }
  }
  if (industryLower.includes('restaurant') || industryLower.includes('food') || industryLower.includes('cafe') || industryLower.includes('bar')) {
    return {
      type: 'restaurant',
      heroImage: 'appetizing food photography',
      colors: { primary: 'red-800', accent: 'orange-500', bg: 'cream' },
      vibes: ['Appetizing', 'Warm', 'Inviting'],
      ctaStyle: 'bold',
      sections: ['Menu', 'Gallery', 'Reservations', 'Location & Hours'],
      typography: 'warm friendly'
    }
  }
  if (industryLower.includes('law') || industryLower.includes('attorney') || industryLower.includes('legal')) {
    return {
      type: 'legal',
      heroImage: 'professional office, courthouse',
      colors: { primary: 'navy-900', accent: 'gold-600', bg: 'white' },
      vibes: ['Authority', 'Trust', 'Expertise'],
      ctaStyle: 'classic',
      sections: ['Practice Areas', 'Attorney Profiles', 'Case Results', 'Free Consultation'],
      typography: 'traditional serif'
    }
  }
  if (industryLower.includes('real estate') || industryLower.includes('realtor') || industryLower.includes('property')) {
    return {
      type: 'realestate',
      heroImage: 'beautiful home exterior',
      colors: { primary: 'blue-800', accent: 'green-600', bg: 'white' },
      vibes: ['Dream Home', 'Trust', 'Local Expert'],
      ctaStyle: 'modern',
      sections: ['Listings', 'Search', 'Agent Bio', 'Market Reports'],
      typography: 'clean professional'
    }
  }
  // Default for service businesses
  return {
    type: 'service',
    heroImage: 'professional service setting',
    colors: { primary: 'blue-700', accent: 'indigo-500', bg: 'white' },
    vibes: ['Professional', 'Reliable', 'Expert'],
    ctaStyle: 'modern',
    sections: ['Services', 'About', 'Testimonials', 'Contact'],
    typography: 'clean modern'
  }
}

export default function WebsiteModelsShowcase({ businessData, onSelectModel }: WebsiteModelsShowcaseProps) {
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [expandedModel, setExpandedModel] = useState<string | null>(null)
  const [modelImages, setModelImages] = useState<{ [key: string]: { hero?: string, product?: string, article?: string, customer?: string[] } }>({})
  const [loadingImages, setLoadingImages] = useState<{ [key: string]: boolean }>({})
  
  const businessName = businessData?.businessName || 'Your Business'
  const city = businessData?.contact?.city || businessData?.location?.city || 'your city'
  const industry = businessData?.industry || 'your industry'
  const services = businessData?.services?.slice(0, 3).map((s: any) => typeof s === 'string' ? s : s.name) || []
  const fleet = businessData?.fleet || businessData?.assets || []
  const credentials = businessData?.credentials || []
  const years = businessData?.history?.yearsInBusiness || businessData?.yearsInBusiness || ''
  const phone = businessData?.contact?.phone || businessData?.contactInfo?.phone || ''
  const hasBooking = businessData?.websiteAnalysis?.conversion?.hasOnlineBooking
  const hasBlog = businessData?.websiteAnalysis?.content?.hasBlog
  const hasReviews = businessData?.websiteAnalysis?.trust?.hasReviews
  const reviewScore = businessData?.websiteAnalysis?.trust?.reviewScore || '4.9'
  
  // Get industry-specific config
  const industryConfig = getIndustryConfig(industry, businessData)
  
  // Identify their specific gaps/problems
  const problems = []
  if (!hasBooking) problems.push('no-booking')
  if (!hasBlog) problems.push('no-seo')
  if (!hasReviews) problems.push('no-reviews')
  if (businessData?.websiteAnalysis?.conversion?.bookingFriction === 'High') problems.push('high-friction')

  // Fetch images when model is expanded
  useEffect(() => {
    if (!expandedModel) return

    const fetchImages = async () => {
      // Skip if already loaded
      if (modelImages[expandedModel]) return

      setLoadingImages(prev => ({ ...prev, [expandedModel]: true }))

      try {
        const industryType = industryConfig.type || 'service'
        const servicesParam = services.join(',')

        // Fetch hero image
        const heroRes = await fetch(
          `/api/images/search?industryType=${industryType}&modelId=${expandedModel}&businessName=${encodeURIComponent(businessName)}&services=${encodeURIComponent(servicesParam)}&type=hero&count=1`
        )
        const heroData = await heroRes.json()

        // Fetch additional images based on model
        let productImg = null
        let articleImg = null
        let customerImgs: string[] = []

        if (expandedModel === 'hybrid_commerce') {
          const productRes = await fetch(
            `/api/images/search?industryType=${industryType}&modelId=${expandedModel}&type=product&count=1`
          )
          const productData = await productRes.json()
          productImg = productData.images?.[0]?.url
        }

        if (expandedModel === 'education_first') {
          const articleRes = await fetch(
            `/api/images/search?industryType=${industryType}&modelId=${expandedModel}&type=article&count=1`
          )
          const articleData = await articleRes.json()
          articleImg = articleData.images?.[0]?.url
        }

        if (expandedModel === 'community_pillar') {
          const customerRes = await fetch(
            `/api/images/search?industryType=${industryType}&modelId=${expandedModel}&type=customer&count=6`
          )
          const customerData = await customerRes.json()
          customerImgs = customerData.images?.map((img: any) => img.url) || []
        }

        setModelImages(prev => ({
          ...prev,
          [expandedModel]: {
            hero: heroData.images?.[0]?.url,
            product: productImg,
            article: articleImg,
            customer: customerImgs
          }
        }))
      } catch (error) {
        console.error('Error fetching images:', error)
      } finally {
        setLoadingImages(prev => ({ ...prev, [expandedModel]: false }))
      }
    }

    fetchImages()
  }, [expandedModel, industryConfig.type, businessName, services, modelImages])
  
  const models: WebsiteModel[] = [
    {
      id: 'brand_authority',
      name: 'The "Brand Authority" Model',
      tagline: 'Premium Positioning — Justify Higher Fees',
      icon: '💎',
      gradient: 'from-slate-900 via-slate-800 to-amber-900',
      heroStyle: 'Cinematic, elegant, minimal',
      description: `Positions ${businessName} as the most premium option in ${city}. Uses psychology to justify higher fees and attract clients who value expertise over price.`,
      bestFor: 'Businesses with strong credentials, years of experience, or premium offerings that deserve top-tier pricing.',
      pros: [
        'Commands higher prices without pushback',
        'Attracts quality clients who value expertise',
        'Builds long-term brand equity',
        'Less price competition'
      ],
      cons: [
        'Slower lead volume initially',
        'Requires strong credentials to back claims',
        'Not ideal for price-sensitive markets'
      ],
      solves: [
        '❌ "Customers always ask for discounts" → Premium positioning removes price objections',
        '❌ "Competing with cheaper options" → Differentiates on expertise, not price',
        '❌ "Not recognized as an expert" → Philosophy section establishes thought leadership'
      ],
      previewElements: {
        headline: `Excellence in ${industry}`,
        subheadline: `Where expertise meets exceptional service`,
        cta: 'Request Concierge Appointment',
        features: ['Philosophy Section', 'Credentials Showcase', 'Cinematic Hero Video', 'Minimal Design']
      },
      images: [
        {
          label: 'Hero',
          alt: industryConfig.imageAlt || 'Premium hero image',
          description: industryConfig.heroImage || 'Cinematic hero shot with subject in action'
        },
        {
          label: 'Proof',
          alt: 'Credentials and client logos',
          description: 'Badges/logos for trust (e.g., corporate clients, licenses)'
        }
      ],
      seoPlan: {
        title: `${services[0] || industry} in ${city} | ${businessName}`,
        description: `Premium ${industry.toLowerCase()} in ${city}. ${years || 'Over 10 years'} of expertise. Book a concierge appointment today.`,
        og: `${businessName} — ${industry} in ${city}`,
        twitter: `${businessName}: premium ${industry.toLowerCase()} in ${city}`,
        schema: [
          'LocalBusiness (name, address, phone, geo, openingHours)',
          'Service schema for top services with city keywords',
          'Review/Rating schema if ratings available'
        ],
        localActions: [
          'H1: Premium {Service} in {City}',
          'Meta description: include city + primary service + CTA',
          'Include NAP + map link above the fold',
          'Internal links: Services, Fleet/Work, Contact/Book'
        ]
      }
    },
    {
      id: 'direct_response',
      name: 'The "Direct Response" Model',
      tagline: 'Lead Capture Machine — Fill Your Calendar',
      icon: '⚡',
      gradient: 'from-blue-600 via-blue-700 to-indigo-800',
      heroStyle: 'Bold, urgent, conversion-focused',
      description: `A conversion machine designed to capture leads NOW. Assumes visitors need your service and want to book instantly.`,
      bestFor: 'Service businesses where customers are actively searching for immediate solutions (emergencies, events, appointments).',
      pros: [
        'Highest conversion rate',
        'Captures leads 24/7 with AI booking',
        'Great for immediate-need services',
        'Clear ROI tracking'
      ],
      cons: [
        'Less brand building',
        'Can feel "salesy" to some',
        'Requires continuous traffic'
      ],
      solves: [
        '❌ "Missing calls = lost business" → AI booking bot captures leads 24/7',
        '❌ "Website visitors don\'t convert" → Every element drives to booking',
        '❌ "Calendar has empty slots" → Urgency messaging fills gaps fast'
      ],
      previewElements: {
        headline: `${services[0] || 'Need Help'}? Book Today.`,
        subheadline: `Instant online booking • Available 24/7`,
        cta: 'Check Availability Now',
        features: ['Instant Booking Widget', 'Trust Badges', 'AI Chat Bot', 'Urgency Indicators']
      },
      images: [
        {
          label: 'Hero',
          alt: industryConfig.type === 'chauffeur' ? 'Chauffeur opening vehicle door' : 'Team delivering service',
          description: industryConfig.type === 'chauffeur'
            ? 'Black car with chauffeur at curbside for airport or corporate pickup'
            : 'Service hero shot showing the core offer'
        },
        {
          label: 'Proof',
          alt: '5-star reviews screenshot',
          description: 'Screenshot of Google rating/reviews for trust'
        }
      ],
      seoPlan: {
        title: `Book ${services[0] || industry} in ${city} Today | ${businessName}`,
        description: `Instant booking for ${services[0] || industry.toLowerCase()} in ${city}. ${years || 'Trusted locally'}. 24/7 scheduling.`,
        og: `${businessName} — Book Now in ${city}`,
        twitter: `Book ${services[0] || industry} fast in ${city} with ${businessName}`,
        schema: [
          'LocalBusiness with geo + phone',
          'Service schema for main service + city',
          'FAQ schema for booking, pricing, arrival time'
        ],
        localActions: [
          'H1: Book {Service} in {City} Now',
          'Meta: include “instant booking”, city, phone',
          'Above-fold CTA with phone + online booking',
          'Embed review stars near CTA for trust'
        ]
      }
    },
    {
      id: 'education_first',
      name: 'The "Education First" Model',
      tagline: 'SEO Dominance — Own Google Rankings',
      icon: '🎓',
      gradient: 'from-emerald-700 via-teal-700 to-cyan-800',
      heroStyle: 'Warm, informative, trustworthy',
      description: `Plays the long game. Builds a content fortress around your services to dominate Google search results and establish expertise.`,
      bestFor: 'Complex services that require explanation, or markets where customers research extensively before buying.',
      pros: [
        'Free organic traffic from Google',
        'Establishes you as the expert',
        'Compounds over time',
        'Pre-qualifies leads through education'
      ],
      cons: [
        'Takes 3-6 months to see results',
        'Requires ongoing content creation',
        'Not for immediate lead needs'
      ],
      solves: [
        '❌ "Not showing up on Google" → Blog content ranks for local searches',
        '❌ "Customers don\'t understand our service" → Educational content pre-sells',
        '❌ "Paying too much for ads" → Organic traffic reduces ad dependency'
      ],
      previewElements: {
        headline: `Understanding ${industry}`,
        subheadline: `Your guide to making informed decisions`,
        cta: 'Take the Free Assessment',
        features: ['Knowledge Hub', 'FAQ Section', 'Blog Articles', 'Lead Magnets']
      },
      images: [
        {
          label: 'Hero',
          alt: 'Friendly expert explaining service',
          description: 'Warm, approachable image that matches educational tone'
        },
        {
          label: 'Content',
          alt: 'Blog/article preview',
          description: 'Cards for guides and FAQs to earn SEO clicks'
        }
      ],
      seoPlan: {
        title: `${industry} Guides in ${city} | ${businessName}`,
        description: `Deep-dive guides on ${services.slice(0, 2).join(', ') || industry} for ${city}. Learn, compare, and book with confidence.`,
        og: `${businessName} — Learn about ${industry} in ${city}`,
        twitter: `Guides and FAQs for ${industry} in ${city} by ${businessName}`,
        schema: [
          'LocalBusiness',
          'Service schema per service with city keyword',
          'FAQ schema (top 5 questions)',
          'Article schema for pillar posts'
        ],
        localActions: [
          'H1: Learn {Service} in {City}',
          'Internal links: pillar → service pages → booking',
          'FAQ block with JSON-LD',
          'Add city keywords in H2s and meta'
        ]
      }
    },
    {
      id: 'hybrid_commerce',
      name: 'The "Hybrid Commerce" Model',
      tagline: 'Service + Products — Diversify Revenue',
      icon: '🛒',
      gradient: 'from-purple-700 via-violet-700 to-fuchsia-800',
      heroStyle: 'Modern, shopify-style, versatile',
      description: `Treats ${businessName} as both a service provider AND a store. Sell your time AND products for multiple revenue streams.`,
      bestFor: 'Businesses that can sell products alongside services (supplements, merchandise, equipment, gift cards).',
      pros: [
        'Multiple revenue streams',
        'Passive income from products',
        'Higher customer lifetime value',
        'Gift card sales for cash flow'
      ],
      cons: [
        'More complex to manage',
        'Inventory/fulfillment needed',
        'Requires product sourcing'
      ],
      solves: [
        '❌ "Income only when I work" → Products sell while you sleep',
        '❌ "Customers buy elsewhere" → Capture product sales you\'re losing',
        '❌ "Seasonal slowdowns hurt" → Product sales smooth revenue'
      ],
      previewElements: {
        headline: `Book Services • Shop Products`,
        subheadline: `Everything you need in one place`,
        cta: 'Browse & Book',
        features: ['Service Booking', 'Product Shop', 'Gift Cards', 'Subscriptions']
      },
      images: [
        {
          label: 'Hero',
          alt: 'Service hero + product grid',
          description: 'Split hero showing service action and product highlights'
        },
        {
          label: 'Shop',
          alt: 'Featured products with prices',
          description: 'Product cards (gift cards, bundles) with clear pricing'
        }
      ],
      seoPlan: {
        title: `${services[0] || industry} & Products in ${city} | ${businessName}`,
        description: `Book ${services[0] || industry.toLowerCase()} and shop products in ${city}. Subscriptions, bundles, gift cards available.`,
        og: `${businessName} — Services + Shop in ${city}`,
        twitter: `Book services and shop products in ${city} with ${businessName}`,
        schema: [
          'LocalBusiness',
          'Service schema + Offer for booking',
          'Product schema (gift cards, bundles)',
          'FAQ schema for shipping/booking'
        ],
        localActions: [
          'H1: Book & Shop in {City}',
          'Meta: mention products + services + city',
          'Internal links between services ↔ products',
          'Include pickup/shipping policies with FAQ schema'
        ]
      }
    },
    {
      id: 'community_pillar',
      name: 'The "Community Pillar" Model',
      tagline: 'Referral Engine — Word of Mouth on Steroids',
      icon: '🏘️',
      gradient: 'from-orange-600 via-amber-600 to-yellow-600',
      heroStyle: 'Warm, social, community-focused',
      description: `Creates a digital living room. Focuses on social proof, events, and community trust to drive referrals and repeat business.`,
      bestFor: 'Local businesses where word-of-mouth is key, family-oriented services, or community-based businesses.',
      pros: [
        'Strongest referral generation',
        'High customer loyalty',
        'Great for local SEO',
        'Builds genuine community'
      ],
      cons: [
        'Needs active social presence',
        'Requires event planning',
        'Slower initial growth'
      ],
      solves: [
        '❌ "Referrals are inconsistent" → Systematizes word-of-mouth',
        '❌ "No repeat customers" → Community events drive loyalty',
        '❌ "Invisible in local community" → Becomes the go-to local expert'
      ],
      previewElements: {
        headline: `${city}'s Favorite ${industry} Team`,
        subheadline: `Trusted by families since ${businessData?.history?.foundedYear || '2000'}`,
        cta: 'Join Our Community',
        features: ['Customer Stories', 'Events Calendar', 'Instagram Feed', 'Referral Program']
      },
      images: [
        {
          label: 'Hero',
          alt: 'Happy local customers/community',
          description: 'Collage of local customers/patients/families as social proof'
        },
        {
          label: 'Events',
          alt: 'Community event photo',
          description: 'Workshops or local events to drive referrals'
        }
      ],
      seoPlan: {
        title: `${city} ${industry} Trusted by Locals | ${businessName}`,
        description: `Local favorite ${industry.toLowerCase()} in ${city}. ${reviewScore}★ rated. Join the community, see events, and book today.`,
        og: `${businessName} — ${industry} trusted in ${city}`,
        twitter: `Top-rated ${industry} in ${city}. ${businessName} (${reviewScore}★). Join our community.`,
        schema: [
          'LocalBusiness with aggregateRating',
          'Event schema for upcoming events',
          'FAQ schema for process/policies',
          'Service schema with city keywords'
        ],
        localActions: [
          'H1: {City}’s Favorite {Service/Industry}',
          'Show rating near CTA with review schema',
          'Event/Workshop calendar with schema',
          'Local landmarks/areas served in copy'
        ]
      }
    }
  ]

  const handleSelect = (modelId: string) => {
    setSelectedModel(modelId)
  }

  const handleConfirm = () => {
    if (selectedModel) {
      onSelectModel(selectedModel)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">🎨 Choose Your Digital Headquarters</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Based on {businessName}'s profile, I've designed 5 strategic website models. 
          Each solves different business challenges. Click to explore.
        </p>
      </div>
      
      {/* Models Grid */}
      <div className="space-y-6">
        {models.map((model) => (
          <div 
            key={model.id}
            className={`bg-white rounded-2xl shadow-lg border-2 transition-all overflow-hidden ${
              selectedModel === model.id 
                ? 'border-blue-500 ring-4 ring-blue-100' 
                : 'border-gray-100 hover:border-gray-300'
            }`}
          >
            {/* Model Header - Always Visible */}
            <div 
              className="cursor-pointer"
              onClick={() => setExpandedModel(expandedModel === model.id ? null : model.id)}
            >
              <div className={`bg-gradient-to-r ${model.gradient} p-6 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{model.icon}</span>
                    <div>
                      <h3 className="text-xl font-bold">{model.name}</h3>
                      <p className="text-white/80">{model.tagline}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedModel === model.id && (
                      <span className="bg-white text-blue-600 px-3 py-1 rounded-full text-sm font-semibold">
                        ✓ Selected
                      </span>
                    )}
                    <span className="text-white/60 text-2xl">
                      {expandedModel === model.id ? '−' : '+'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Preview Strip - Always Visible */}
              <div className="p-4 bg-gray-50 border-b border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {model.previewElements.features.map((feature, i) => (
                    <span key={i} className="bg-white px-3 py-1 rounded-full text-sm text-gray-600 border border-gray-200">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Expanded Content */}
            {expandedModel === model.id && (
              <div className="p-6">
                {/* REALISTIC Website Preview Mockup */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3">👀 Website Preview — {businessName}</h4>
                  
                  {/* Browser Window Frame */}
                  <div className="bg-gray-800 rounded-t-xl">
                    {/* Browser Chrome */}
                    <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-700">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <div className="flex-1 bg-gray-700 rounded-lg px-4 py-1.5 text-sm text-gray-300 flex items-center gap-2">
                        <span className="text-green-400">🔒</span>
                        {businessData?.contactInfo?.website || `www.${businessName.toLowerCase().replace(/\s+/g, '')}.com`}
                      </div>
                    </div>
                  </div>
                  
                  {/* Website Content - Industry Specific */}
                  <div className="border-2 border-t-0 border-gray-300 rounded-b-xl overflow-hidden bg-white">
                    
                    {/* Navigation Bar */}
                    <div className={`px-6 py-4 flex items-center justify-between ${
                      model.id === 'brand_authority' ? 'bg-slate-900 text-white' :
                      model.id === 'direct_response' ? 'bg-white border-b-2 border-blue-500' :
                      model.id === 'education_first' ? 'bg-white border-b border-gray-200' :
                      model.id === 'hybrid_commerce' ? 'bg-white border-b border-gray-200' :
                      'bg-amber-50 border-b border-amber-200'
                    }`}>
                      <div className="font-bold text-lg">
                        {model.id === 'brand_authority' && <span className="text-amber-400">{businessName}</span>}
                        {model.id === 'direct_response' && <span className="text-blue-600">{businessName}</span>}
                        {model.id === 'education_first' && <span className="text-emerald-700">{businessName}</span>}
                        {model.id === 'hybrid_commerce' && <span className="text-purple-700">{businessName}</span>}
                        {model.id === 'community_pillar' && <span className="text-orange-700">{businessName}</span>}
                      </div>
                      <div className="hidden sm:flex items-center gap-6 text-sm">
                        {industryConfig.sections.slice(0, 4).map((section, i) => (
                          <span key={i} className={
                            model.id === 'brand_authority' ? 'text-white/70 hover:text-amber-400' :
                            model.id === 'direct_response' ? 'text-gray-600 hover:text-blue-600' :
                            model.id === 'education_first' ? 'text-gray-600 hover:text-emerald-600' :
                            model.id === 'hybrid_commerce' ? 'text-gray-600 hover:text-purple-600' :
                            'text-gray-700 hover:text-orange-600'
                          }>{section}</span>
                        ))}
                      </div>
                      <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                        model.id === 'brand_authority' ? 'border border-amber-400 text-amber-400' :
                        model.id === 'direct_response' ? 'bg-blue-600 text-white animate-pulse' :
                        model.id === 'education_first' ? 'bg-emerald-600 text-white' :
                        model.id === 'hybrid_commerce' ? 'bg-purple-600 text-white' :
                        'bg-orange-500 text-white'
                      }`}>
                        {model.id === 'direct_response' ? `📞 ${phone || 'Book Now'}` : model.previewElements.cta.split(' ').slice(0, 2).join(' ')}
                      </div>
                    </div>
                    
                    {/* Hero Section - Model Specific */}
                    <div className={`relative ${
                      model.id === 'brand_authority' ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white min-h-[320px]' :
                      model.id === 'direct_response' ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white min-h-[280px]' :
                      model.id === 'education_first' ? 'bg-gradient-to-br from-emerald-50 to-teal-50 text-gray-800 min-h-[280px]' :
                      model.id === 'hybrid_commerce' ? 'bg-gradient-to-br from-purple-50 via-white to-fuchsia-50 min-h-[280px]' :
                      'bg-gradient-to-br from-orange-50 to-amber-50 min-h-[280px]'
                    }`}>
                      
                      {/* Brand Authority - Cinematic Luxury */}
                      {model.id === 'brand_authority' && (
                        <div className="relative min-h-[320px]">
                          {/* Hero Image - Full Background */}
                          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black">
                            {modelImages[model.id]?.hero ? (
                              <img
                                src={modelImages[model.id].hero}
                                alt={industryConfig.imageAlt || 'Professional service image'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to placeholder on error
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  target.parentElement?.classList.add('bg-gradient-to-br', 'from-slate-800', 'via-slate-900', 'to-black')
                                }}
                              />
                            ) : loadingImages[model.id] ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <div className="text-center text-white/40">
                                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30 mx-auto mb-4"></div>
                                  <p className="text-sm">Loading image...</p>
                                </div>
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <div className="text-center text-white/40">
                                  <div className="text-6xl mb-4">📷</div>
                                  <p className="text-sm font-medium">{industryConfig.heroImage || 'Hero Image'}</p>
                                  <p className="text-xs mt-2 opacity-60">1920x1080px • Alt: {industryConfig.imageAlt || 'Professional service image'}</p>
                                </div>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40"></div>
                          </div>
                          
                          {/* Content Overlay */}
                          <div className="relative z-10 p-8 md:p-12 flex flex-col items-center justify-center min-h-[320px] text-center">
                            <p className="text-amber-400 uppercase tracking-[0.3em] text-xs mb-4">{city} • Since {businessData?.history?.foundedYear || years.replace(/[^0-9]/g, '').slice(-4) || '1999'}</p>
                            <h1 className="text-4xl md:text-5xl font-serif mb-4 tracking-tight">
                            {industryConfig.type === 'chauffeur' ? (
                              industryConfig.subtype === 'party_bus' ? 'Unforgettable Group Experiences' :
                              industryConfig.subtype === 'wedding_limo' ? 'Your Perfect Day, Perfected' :
                              industryConfig.subtype === 'executive_transport' ? 'Executive Travel, Elevated' :
                              'Excellence in Motion'
                            ) : 
                             industryConfig.type === 'healthcare' ? 'The Art of Wellness' :
                             industryConfig.type === 'restaurant' ? 'A Culinary Experience' :
                             industryConfig.type === 'car_rental' ? 'Freedom Awaits' :
                             industryConfig.type === 'corporate_shuttle' ? 'Commuting, Reimagined' :
                             'Where Excellence Meets Expertise'}
                          </h1>
                          <p className="text-white/60 text-lg max-w-xl mb-8">
                            {industryConfig.type === 'chauffeur' ? (
                              industryConfig.subtype === 'party_bus' 
                                ? `${fleet.length || 'Multiple'} party buses & charter vehicles for Bay Area celebrations, wine tours, and corporate events.`
                                : industryConfig.subtype === 'executive_transport'
                                ? `White-glove chauffeur service for ${city}'s executives. ${fleet[0]?.name || fleet[0] || 'Mercedes S-Class'}, ${fleet[1]?.name || fleet[1] || 'BMW 7-Series'} & more.`
                                : `Professional chauffeur service with ${fleet[0]?.name || fleet[0] || 'luxury sedans'}, SUVs, and executive coaches. Serving ${city} for ${years || 'over a decade'}.`
                            ) : industryConfig.type === 'corporate_shuttle' 
                              ? `WiFi-equipped executive coaches for employee commutes. Reduce parking costs, boost productivity.`
                              : `Trusted by ${city} for ${years || 'years'}.`}
                          </p>
                          
                          {/* Visual elements for chauffeur */}
                          {industryConfig.type === 'chauffeur' && (
                            <div className="flex items-center gap-6 mb-6 text-white/40 text-xs">
                              <span className="flex items-center gap-1">🚗 {fleet.length || '10'}+ Vehicles</span>
                              <span className="flex items-center gap-1">👔 Professional Chauffeurs</span>
                              <span className="flex items-center gap-1">🕐 24/7 Service</span>
                            </div>
                          )}
                          
                          <button className="border-2 border-amber-400 text-amber-400 px-8 py-3 hover:bg-amber-400 hover:text-slate-900 transition-all tracking-wider text-sm">
                            {industryConfig.ctaText || 'REQUEST CONCIERGE SERVICE'}
                          </button>
                          {credentials.length > 0 && (
                            <div className="mt-8 flex items-center gap-4 text-white/40 text-xs">
                              <span>Trusted by</span>
                              {credentials.slice(0, 2).map((cred: string, i: number) => (
                                <span key={i} className="border border-white/20 px-3 py-1 rounded">{cred}</span>
                              ))}
                            </div>
                          )}
                          </div>
                        </div>
                      )}
                      
                      {/* Direct Response - Conversion Focused */}
                      {model.id === 'direct_response' && (
                        <div className="p-6 md:p-10 grid md:grid-cols-2 gap-8 items-center relative">
                          {/* Left Side - Image */}
                          <div className="relative h-64 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600">
                            {modelImages[model.id]?.hero ? (
                              <img
                                src={modelImages[model.id].hero}
                                alt={industryConfig.type === 'chauffeur' ? 'Fleet Vehicle' : 'Service Action'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                }}
                              />
                            ) : loadingImages[model.id] ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30"></div>
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="text-center text-white/60">
                                  <div className="text-5xl mb-2">📷</div>
                                  <p className="text-sm font-medium">{industryConfig.type === 'chauffeur' ? 'Fleet Vehicle' : 'Service Action'}</p>
                                  <p className="text-xs mt-1 opacity-60">1200x800px</p>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <div className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
                              {industryConfig.type === 'chauffeur' 
                                ? '🚗 PEAK SEASON — Reserve your ride now'
                                : `🔥 BOOKING FAST — ${Math.floor(Math.random() * 3) + 2} slots left today`}
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-4">
                              {industryConfig.type === 'chauffeur' ? (
                                <>
                                  {industryConfig.subtype === 'party_bus' ? 'Party Bus for Your Event?' :
                                   industryConfig.subtype === 'executive_transport' ? 'Airport Transfer?' :
                                   'Need a Ride?'}<br/>
                                  <span className="text-yellow-300">Get an Instant Quote.</span>
                                </>
                              ) : (
                                <>
                                  {services[0] || 'Need Service'}?<br/>
                                  <span className="text-yellow-300">Book in 60 Seconds.</span>
                                </>
                              )}
                            </h1>
                            <p className="text-white/80 mb-6">
                              {industryConfig.type === 'chauffeur' 
                                ? '✓ Instant confirmation • ✓ All-inclusive pricing • ✓ Meet & greet included'
                                : '✓ Same-day availability • ✓ Verified reviews • ✓ Instant confirmation'}
                            </p>
                            
                            {/* Chauffeur-specific trust signals */}
                            {industryConfig.type === 'chauffeur' && (
                              <div className="flex flex-wrap gap-3 mb-6">
                                {industryConfig.trustBadges?.map((badge: string, i: number) => (
                                  <span key={i} className="bg-white/10 text-white/80 text-xs px-3 py-1.5 rounded-full">
                                    ✓ {badge}
                                  </span>
                                ))}
                              </div>
                            )}
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                              <button className="bg-yellow-400 text-yellow-900 px-6 py-4 rounded-xl font-bold text-lg shadow-lg">
                                {industryConfig.type === 'chauffeur' ? 'Get Instant Quote →' : 'Check Availability →'}
                              </button>
                              <button className="border-2 border-white/50 text-white px-6 py-4 rounded-xl">
                                📞 {phone || 'Call Now'}
                              </button>
                            </div>
                          </div>
                          
                          {/* Booking Widget */}
                          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
                            <div className="text-center mb-4">
                              <p className="text-white/60 text-sm">⭐⭐⭐⭐⭐ {reviewScore}/5 ({Math.floor(Math.random() * 200) + 50}+ reviews)</p>
                            </div>
                            <div className="space-y-3">
                              {industryConfig.type === 'chauffeur' ? (
                                <>
                                  <div className="bg-white/10 rounded-lg p-3">
                                    <label className="text-xs text-white/60">Service Type</label>
                                    <p className="text-white">{services[0] || 'Airport Transfer'} ▼</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/10 rounded-lg p-3">
                                      <label className="text-xs text-white/60">Pickup</label>
                                      <p className="text-white text-sm">SFO Airport</p>
                                    </div>
                                    <div className="bg-white/10 rounded-lg p-3">
                                      <label className="text-xs text-white/60">Dropoff</label>
                                      <p className="text-white text-sm">{city}</p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/10 rounded-lg p-3">
                                      <label className="text-xs text-white/60">Date</label>
                                      <p className="text-white text-sm">Select ▼</p>
                                    </div>
                                    <div className="bg-white/10 rounded-lg p-3">
                                      <label className="text-xs text-white/60">Passengers</label>
                                      <p className="text-white text-sm">1-4 ▼</p>
                                    </div>
                                  </div>
                                  <button className="w-full bg-green-500 text-white py-4 rounded-xl font-bold">
                                    Get Price — No Card Required
                                  </button>
                                </>
                              ) : (
                                <>
                                  <div className="bg-white/10 rounded-lg p-3">
                                    <label className="text-xs text-white/60">Select Service</label>
                                    <p className="text-white">{services[0] || 'Service'} ▼</p>
                                  </div>
                                  <div className="bg-white/10 rounded-lg p-3">
                                    <label className="text-xs text-white/60">Date & Time</label>
                                    <p className="text-white">Pick a date ▼</p>
                                  </div>
                                  <button className="w-full bg-green-500 text-white py-4 rounded-xl font-bold">
                                    Book Now — It&apos;s Free to Reserve
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Education First - Knowledge Hub */}
                      {model.id === 'education_first' && (
                        <div className="p-8 md:p-12">
                          <div className="max-w-3xl">
                            {/* Hero Image */}
                            <div className="relative h-48 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-100 mb-6">
                              {modelImages[model.id]?.hero ? (
                                <img
                                  src={modelImages[model.id].hero}
                                  alt="Friendly expert explaining service"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                  }}
                                />
                              ) : loadingImages[model.id] ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600/30"></div>
                                </div>
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="text-center text-emerald-600/60">
                                    <div className="text-5xl mb-2">📷</div>
                                    <p className="text-sm font-medium">Warm, Approachable Expert</p>
                                    <p className="text-xs mt-1 opacity-60">1200x600px • Alt: Friendly expert explaining service</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <p className="text-emerald-600 font-medium mb-3">Your Trusted {industry} Resource</p>
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                              Understanding {services[0] || 'Your Options'}:<br/>
                              <span className="text-emerald-600">A Complete Guide</span>
                            </h1>
                            <p className="text-gray-600 text-lg mb-6">
                              Making informed decisions about {industry.toLowerCase()} starts with knowledge. 
                              Explore our comprehensive resources.
                            </p>
                            <div className="flex flex-wrap gap-3 mb-8">
                              <button className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold">
                                Take Free Assessment
                              </button>
                              <button className="border border-emerald-600 text-emerald-600 px-6 py-3 rounded-lg">
                                Browse Articles
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              {services.slice(0, 3).map((svc: string, i: number) => (
                                <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                                  {/* Article Image */}
                                  <div className="relative h-24 rounded mb-3 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                                    {modelImages[model.id]?.article ? (
                                      <img
                                        src={modelImages[model.id].article}
                                        alt={`${svc} guide`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement
                                          target.style.display = 'none'
                                        }}
                                      />
                                    ) : (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center text-gray-400 text-xs">
                                          <span className="text-2xl">📖</span>
                                          <p className="text-xs mt-1">600x400px</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-sm font-medium text-gray-700">{svc}</p>
                                  <p className="text-xs text-emerald-600">Read guide →</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Hybrid Commerce - Service + Shop */}
                      {model.id === 'hybrid_commerce' && (
                        <div className="p-6 md:p-10">
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Services Side */}
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-100">
                              <div className="text-purple-600 text-sm font-semibold mb-3">📅 BOOK A SERVICE</div>
                              <h2 className="text-2xl font-bold text-gray-800 mb-4">Our Services</h2>
                              <div className="space-y-3">
                                {services.slice(0, 3).map((svc: string, i: number) => (
                                  <div key={i} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                                    <span className="font-medium">{svc}</span>
                                    <button className="bg-purple-600 text-white text-sm px-4 py-2 rounded-lg">Book</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Shop Side */}
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-fuchsia-100">
                              <div className="text-fuchsia-600 text-sm font-semibold mb-3">🛒 SHOP PRODUCTS</div>
                              <h2 className="text-2xl font-bold text-gray-800 mb-4">Featured Items</h2>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-fuchsia-50 rounded-lg p-3 text-center">
                                  {/* Product Image */}
                                  <div className="relative h-24 rounded mb-2 bg-gradient-to-br from-fuchsia-100 to-pink-100 overflow-hidden">
                                    {modelImages[model.id]?.product ? (
                                      <img
                                        src={modelImages[model.id].product}
                                        alt="Gift card product"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement
                                          target.style.display = 'none'
                                        }}
                                      />
                                    ) : (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center text-fuchsia-400 text-xs">
                                          <span className="text-2xl">🎁</span>
                                          <p className="text-xs mt-1">400x400px</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-sm font-medium">Gift Cards</p>
                                  <p className="text-xs text-fuchsia-600">From $50</p>
                                </div>
                                <div className="bg-fuchsia-50 rounded-lg p-3 text-center">
                                  {/* Product Image */}
                                  <div className="relative h-24 rounded mb-2 bg-gradient-to-br from-fuchsia-100 to-pink-100 overflow-hidden">
                                    {modelImages[model.id]?.product ? (
                                      <img
                                        src={modelImages[model.id].product}
                                        alt="Package product"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement
                                          target.style.display = 'none'
                                        }}
                                      />
                                    ) : (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center text-fuchsia-400 text-xs">
                                          <span className="text-2xl">📦</span>
                                          <p className="text-xs mt-1">400x400px</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-sm font-medium">Packages</p>
                                  <p className="text-xs text-fuchsia-600">Save 20%</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Community Pillar - Local Trust */}
                      {model.id === 'community_pillar' && (
                        <div className="p-8 md:p-12 text-center">
                          {/* Customer Photo Collage */}
                          <div className="grid grid-cols-3 gap-2 mb-6 max-w-2xl mx-auto">
                            {[1, 2, 3, 4, 5, 6].map((i) => {
                              const customerImgs = modelImages[model.id]?.customer || []
                              const imgUrl = customerImgs[i - 1]
                              return (
                                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-orange-100 to-amber-100">
                                  {imgUrl ? (
                                    <img
                                      src={imgUrl}
                                      alt={`Happy customer ${i}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                      }}
                                    />
                                  ) : loadingImages[model.id] ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-orange-100/50">
                                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-400/30"></div>
                                    </div>
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="text-center text-orange-400/60 text-xs">
                                        <span className="text-xl">👥</span>
                                        <p className="text-xs mt-1">400x400px</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          
                          <div className="bg-orange-500 text-white text-sm font-bold px-4 py-2 rounded-full inline-block mb-4">
                            🏆 Voted #{1} {industry} in {city}
                          </div>
                          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                            {city}&apos;s Favorite<br/>
                            <span className="text-orange-600">{industry} Team</span>
                          </h1>
                          <p className="text-gray-600 text-lg mb-6 max-w-xl mx-auto">
                            Trusted by local families for {years || 'over a decade'}. 
                            Join our community of happy customers.
                          </p>
                          
                          {/* Social Proof Strip */}
                          <div className="flex items-center justify-center gap-8 mb-8">
                            <div className="text-center">
                              <div className="text-3xl font-bold text-orange-600">{Math.floor(Math.random() * 500) + 200}+</div>
                              <div className="text-sm text-gray-500">Happy Families</div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-orange-600">{reviewScore}★</div>
                              <div className="text-sm text-gray-500">Google Rating</div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-orange-600">{years || '10+'}</div>
                              <div className="text-sm text-gray-500">Years Serving {city}</div>
                            </div>
                          </div>
                          
                          <button className="bg-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg">
                            Join Our Community →
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Below Fold Preview - Additional Sections with Images */}
                    <div className="p-6 bg-gray-50 border-t">
                      <div className="mb-4">
                        <span className="font-medium text-gray-700 text-sm">Below the fold:</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {model.images?.map((img: any, i: number) => (
                          <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="relative h-24 rounded mb-2 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                              <div className="text-center text-gray-400 text-xs">
                                <span className="text-2xl">📷</span>
                                <p className="text-xs mt-1">{img.label}</p>
                              </div>
                            </div>
                            <p className="text-xs font-medium text-gray-700">{img.alt}</p>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{img.description}</p>
                          </div>
                        ))}
                        {!model.images && model.previewElements.features.map((feature, i) => (
                          <span key={i} className="bg-white px-3 py-1 rounded-full border border-gray-200 text-sm text-gray-600">{feature}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Description */}
                <div className="mb-6">
                  <p className="text-gray-700 leading-relaxed">{model.description}</p>
                  <p className="text-sm text-gray-500 mt-2"><strong>Best For:</strong> {model.bestFor}</p>
                </div>

                {/* Images / Media Plan */}
                {model.images && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <span>🖼️</span> Image & Media Plan (with alt text for SEO)
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {model.images.map((img, i) => (
                        <div key={i} className="border border-gray-200 rounded-xl p-3 bg-white">
                          <div className="text-xs font-semibold text-gray-500 mb-1">{img.label}</div>
                          <div className="bg-gray-100 rounded-lg h-24 flex items-center justify-center text-gray-400 text-sm mb-2">
                            {img.alt}
                          </div>
                          <p className="text-sm text-gray-700">{img.description}</p>
                          <p className="text-xs text-gray-500 mt-1">Alt: {img.alt}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Pros & Cons Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Pros */}
                  <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                      <span className="text-lg">✅</span> Pros
                    </h4>
                    <ul className="space-y-2">
                      {model.pros.map((pro, i) => (
                        <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">•</span>
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Cons */}
                  <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                      <span className="text-lg">⚠️</span> Cons
                    </h4>
                    <ul className="space-y-2">
                      {model.cons.map((con, i) => (
                        <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">•</span>
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {/* How It Solves Your Challenges */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 mb-6">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <span className="text-lg">🎯</span> How This Solves Your Challenges
                  </h4>
                  <ul className="space-y-2">
                    {model.solves.map((solve, i) => (
                      <li key={i} className="text-sm text-blue-700">
                        {solve}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* SEO Blueprint */}
                {model.seoPlan && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span>🧭</span> SEO Blueprint (Hyper-Local)
                    </h4>
                    <div className="text-sm text-gray-700">
                      <div><strong>Title:</strong> {model.seoPlan.title}</div>
                      <div><strong>Meta Description:</strong> {model.seoPlan.description}</div>
                      <div className="mt-2 text-gray-600"><strong>Open Graph:</strong> {model.seoPlan.og}</div>
                      <div className="text-gray-600"><strong>Twitter:</strong> {model.seoPlan.twitter}</div>
                    </div>
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-gray-500 mb-1">Schema to add:</div>
                      <div className="flex flex-wrap gap-2">
                        {model.seoPlan.schema.map((s, i) => (
                          <span key={i} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-lg border border-gray-200">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-gray-500 mb-1">Local SEO actions:</div>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {model.seoPlan.localActions.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                {/* Select Button */}
                <button
                  onClick={() => handleSelect(model.id)}
                  className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                    selectedModel === model.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {selectedModel === model.id ? '✓ Selected' : `Select ${model.name.split('"')[1]}`}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Bottom CTA */}
      {selectedModel && (
        <div className="sticky bottom-4 mt-8 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">
              Ready to build with {models.find(m => m.id === selectedModel)?.name.split('"')[1]}?
            </p>
            <p className="text-sm text-gray-500">Click confirm to start designing your website</p>
          </div>
          <button
            onClick={handleConfirm}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
          >
            Confirm & Continue →
          </button>
        </div>
      )}
    </div>
  )
}

