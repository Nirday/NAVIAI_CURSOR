'use client'

import { useState } from 'react'

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
}

export default function WebsiteModelsShowcase({ businessData, onSelectModel }: WebsiteModelsShowcaseProps) {
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [expandedModel, setExpandedModel] = useState<string | null>(null)
  
  const businessName = businessData?.businessName || 'Your Business'
  const city = businessData?.contact?.city || businessData?.location?.city || 'your city'
  const industry = businessData?.industry || 'your industry'
  const services = businessData?.services?.slice(0, 3).map((s: any) => typeof s === 'string' ? s : s.name) || []
  const hasBooking = businessData?.websiteAnalysis?.conversion?.hasOnlineBooking
  const hasBlog = businessData?.websiteAnalysis?.content?.hasBlog
  
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
                {/* Website Preview Mockup */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3">👀 Website Preview</h4>
                  <div className={`bg-gradient-to-br ${model.gradient} rounded-xl p-8 text-white relative overflow-hidden`}>
                    {/* Browser Chrome */}
                    <div className="absolute top-0 left-0 right-0 bg-black/20 px-4 py-2 flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                      </div>
                      <div className="flex-1 bg-white/10 rounded px-3 py-1 text-xs text-white/60 ml-4">
                        {businessData?.contactInfo?.website || 'www.yourbusiness.com'}
                      </div>
                    </div>
                    
                    {/* Hero Content */}
                    <div className="mt-8 text-center">
                      <h2 className="text-3xl sm:text-4xl font-bold mb-3">{model.previewElements.headline}</h2>
                      <p className="text-lg text-white/80 mb-6">{model.previewElements.subheadline}</p>
                      <button className="bg-white text-gray-800 px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all">
                        {model.previewElements.cta}
                      </button>
                    </div>
                    
                    {/* Decorative Elements */}
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full"></div>
                    <div className="absolute -top-20 -left-20 w-60 h-60 bg-white/5 rounded-full"></div>
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

