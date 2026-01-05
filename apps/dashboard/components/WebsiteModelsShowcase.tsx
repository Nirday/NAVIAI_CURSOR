'use client'

import { useState } from 'react'

interface WebsiteModelsShowcaseProps {
  businessData: any
  onSelectModel: (modelId: string) => void
}

// Industry-specific design configurations
const getIndustryConfig = (industry: string) => {
  const industryLower = industry?.toLowerCase() || ''
  
  if (industryLower.includes('limo') || industryLower.includes('transport') || industryLower.includes('car')) {
    return {
      type: 'transportation',
      heroImage: 'luxury car at night, city lights',
      colors: { primary: 'slate-900', accent: 'amber-500', bg: 'black' },
      vibes: ['Luxury', 'Reliability', 'Elegance'],
      ctaStyle: 'gold-bordered',
      sections: ['Fleet Gallery', 'Service Areas Map', 'Booking Widget', 'Testimonials'],
      typography: 'serif elegant'
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
  const industryConfig = getIndustryConfig(industry)
  
  // Identify their specific gaps/problems
  const problems = []
  if (!hasBooking) problems.push('no-booking')
  if (!hasBlog) problems.push('no-seo')
  if (!hasReviews) problems.push('no-reviews')
  if (businessData?.websiteAnalysis?.conversion?.bookingFriction === 'High') problems.push('high-friction')
  
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
                        <div className="p-8 md:p-12 flex flex-col items-center justify-center min-h-[320px] text-center">
                          <p className="text-amber-400 uppercase tracking-[0.3em] text-xs mb-4">{city} • Since {businessData?.history?.foundedYear || years.replace(/[^0-9]/g, '').slice(-4) || '1999'}</p>
                          <h1 className="text-4xl md:text-5xl font-serif mb-4 tracking-tight">
                            {industryConfig.type === 'transportation' ? 'Excellence in Motion' : 
                             industryConfig.type === 'healthcare' ? 'The Art of Wellness' :
                             industryConfig.type === 'restaurant' ? 'A Culinary Experience' :
                             'Where Excellence Meets Expertise'}
                          </h1>
                          <p className="text-white/60 text-lg max-w-xl mb-8">
                            {industryConfig.type === 'transportation' 
                              ? `Serving ${city}'s most distinguished clientele with an exceptional fleet of ${fleet[0]?.name || fleet[0] || 'luxury vehicles'}.`
                              : `Trusted by ${city} for ${years || 'years'}.`}
                          </p>
                          <button className="border-2 border-amber-400 text-amber-400 px-8 py-3 hover:bg-amber-400 hover:text-slate-900 transition-all tracking-wider text-sm">
                            REQUEST CONCIERGE SERVICE
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
                      )}
                      
                      {/* Direct Response - Conversion Focused */}
                      {model.id === 'direct_response' && (
                        <div className="p-6 md:p-10 grid md:grid-cols-2 gap-8 items-center">
                          <div>
                            <div className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
                              🔥 BOOKING FAST — {Math.floor(Math.random() * 3) + 2} slots left today
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-4">
                              {services[0] || 'Need Service'}?<br/>
                              <span className="text-yellow-300">Book in 60 Seconds.</span>
                            </h1>
                            <p className="text-white/80 mb-6">
                              {industryConfig.type === 'transportation' 
                                ? '✓ Instant confirmation • ✓ Best rate guarantee • ✓ 24/7 support'
                                : '✓ Same-day availability • ✓ Verified reviews • ✓ Instant confirmation'}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <button className="bg-yellow-400 text-yellow-900 px-6 py-4 rounded-xl font-bold text-lg shadow-lg">
                                Check Availability →
                              </button>
                              <button className="border-2 border-white/50 text-white px-6 py-4 rounded-xl">
                                📞 Call Now
                              </button>
                            </div>
                          </div>
                          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
                            <div className="text-center mb-4">
                              <p className="text-white/60 text-sm">⭐⭐⭐⭐⭐ {reviewScore}/5 ({Math.floor(Math.random() * 200) + 50}+ reviews)</p>
                            </div>
                            <div className="space-y-3">
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
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Education First - Knowledge Hub */}
                      {model.id === 'education_first' && (
                        <div className="p-8 md:p-12">
                          <div className="max-w-3xl">
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
                                  <div className="text-2xl mb-2">📖</div>
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
                                  <div className="text-3xl mb-2">🎁</div>
                                  <p className="text-sm font-medium">Gift Cards</p>
                                  <p className="text-xs text-fuchsia-600">From $50</p>
                                </div>
                                <div className="bg-fuchsia-50 rounded-lg p-3 text-center">
                                  <div className="text-3xl mb-2">📦</div>
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
                    
                    {/* Below Fold Preview */}
                    <div className="p-6 bg-gray-50 border-t">
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span className="font-medium text-gray-700">Below the fold:</span>
                        {model.previewElements.features.map((feature, i) => (
                          <span key={i} className="bg-white px-3 py-1 rounded-full border border-gray-200">{feature}</span>
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

