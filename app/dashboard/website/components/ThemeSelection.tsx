'use client'

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, MapPin, Phone, Shield, Star } from 'lucide-react'

// Business Profile Interface
interface BusinessProfile {
  businessName?: string
  industry?: string
  location?: {
    city?: string
    state?: string
  }
  contactInfo?: {
    phone?: string
  }
  services?: Array<{ name: string }>
}

// Strategy Data with CMO-Level Copywriting
interface Strategy {
  id: string
  title: string
  why: string
  seoImpact: string
  idealCustomer: string
  tradeOff: string
  colors: {
    primary: string
    secondary: string
    accent: string
  }
  fontStyle: 'sans' | 'serif'
}

const STRATEGIES: Strategy[] = [
  {
    id: 'emergency-response',
    title: 'Strategy 1: The High-Velocity Capture',
    why: 'For urgent service businesses, trust is established in seconds. This layout strips away distractions to focus entirely on immediate conversion, leveraging a sticky "Call Now" button that follows the user. Every pixel is engineered to reduce friction between problem and solution.',
    seoImpact: 'Structure optimized for "Near Me" mobile searches. Service area embedded in schema markup. Fast load times (under 2s) improve mobile ranking signals.',
    idealCustomer: 'The busy homeowner with an urgent problem. They\'re on mobile, they\'re stressed, and they need you NOW—not after scrolling through your portfolio.',
    tradeOff: 'This is aggressive. It prioritizes leads over brand storytelling. Choose this if your phone ringing is the only metric that matters.',
    colors: {
      primary: '#FFFFFF',
      secondary: '#F97316',
      accent: '#EF4444'
    },
    fontStyle: 'sans'
  },
  {
    id: 'local-showroom',
    title: 'Strategy 2: The Premium Positioning',
    why: 'Luxury isn\'t a price point—it\'s a perception. This layout uses full-bleed imagery and elegant typography to justify premium pricing. Your "Before & After" portfolio becomes the hero, allowing visual proof to do the selling. Every interaction reinforces exclusivity.',
    seoImpact: 'Image-heavy structure ranks well for visual search queries. Schema markup emphasizes service quality and premium positioning. Slower load times offset by higher conversion value.',
    idealCustomer: 'The discerning client who researches extensively. They\'re comparing you to 3-5 competitors and need visual proof that you\'re worth the premium.',
    tradeOff: 'Requires REAL high-quality photography. Stock photos will destroy trust. Contact info is intentionally subtle—you\'re filtering for serious buyers only.',
    colors: {
      primary: '#1F2937',
      secondary: '#111827',
      accent: '#D4AF37'
    },
    fontStyle: 'serif'
  },
  {
    id: 'community-pillar',
    title: 'Strategy 3: The Trust Authority',
    why: 'For professional services, credibility is currency. This layout builds trust through content density—"Meet the Team" sections, detailed FAQs, and local community involvement. It answers questions before customers call, reducing nuisance inquiries and positioning you as the neighborhood expert.',
    seoImpact: 'Text-rich structure dominates "Service + City" keyword rankings. FAQ schema markup captures featured snippets. Local business schema with team members improves E-E-A-T signals.',
    idealCustomer: 'The cautious researcher who reads everything. They\'re comparing credentials, reading reviews, and need to feel confident before picking up the phone.',
    tradeOff: 'Requires significant content creation (staff bios, company history, detailed service pages). Can feel corporate if not personalized. Less visual impact means slower emotional connection.',
    colors: {
      primary: '#1E3A8A',
      secondary: '#1E40AF',
      accent: '#3B82F6'
    },
    fontStyle: 'sans'
  },
  {
    id: 'neighborhood-menu',
    title: 'Strategy 4: The Transactional Streamline',
    why: 'For businesses with inventory or menus, speed of transaction is everything. This layout puts products front and center, reducing phone time and enabling self-service ordering. Every element is designed to convert browsers into buyers in under 30 seconds.',
    seoImpact: 'Product schema markup improves visibility in Google Shopping and local inventory ads. Category-based structure ranks for specific product searches. Fast checkout flow reduces bounce rate.',
    idealCustomer: 'The convenience-seeker who knows what they want. They\'re browsing on lunch break or before heading to your location. Speed and clarity beat storytelling.',
    tradeOff: 'Requires daily inventory updates—nothing kills trust faster than "Out of Stock" on popular items. Transactional feel makes brand storytelling difficult. High-res product photos are non-negotiable.',
    colors: {
      primary: '#FFFFFF',
      secondary: '#10B981',
      accent: '#059669'
    },
    fontStyle: 'sans'
  },
  {
    id: 'town-square',
    title: 'Strategy 5: The Community Hub',
    why: 'For businesses built on repeat visits, engagement is revenue. This layout prioritizes events, weekly specials, and social proof to build a loyal community. It transforms one-time customers into members who check your site weekly for updates.',
    seoImpact: 'Event schema markup captures "Events Near Me" searches. Fresh content from calendar updates signals active business to Google. Social media integration improves engagement signals.',
    idealCustomer: 'The local regular who wants to stay connected. They\'re checking for weekly specials, upcoming events, or community updates. They\'re not just buying—they\'re joining.',
    tradeOff: 'Looks "dead" if Event Calendar is empty. High maintenance—needs weekly updates to stay relevant. Can distract from primary conversion goals if not managed carefully.',
    colors: {
      primary: '#FFFFFF',
      secondary: '#7C3AED',
      accent: '#6D28D9'
    },
    fontStyle: 'sans'
  }
]

// Personalized Preview Component
interface PersonalizedPreviewProps {
  strategyId: string
  businessProfile?: BusinessProfile
}

function PersonalizedPreview({ strategyId, businessProfile }: PersonalizedPreviewProps) {
  // Demo data fallback for development
  const demoData = { 
    name: "Elite Transporters", 
    city: "San Francisco", 
    service: "Luxury Private Shuttle" 
  }
  
  // Use real data if available, otherwise use demo data
  const data = {
    name: businessProfile?.businessName || demoData.name,
    city: businessProfile?.location?.city || demoData.city,
    service: businessProfile?.services?.[0]?.name || businessProfile?.industry || demoData.service,
    phone: businessProfile?.contactInfo?.phone || '(415) 555-0123'
  }
  
  const strategy = STRATEGIES.find(s => s.id === strategyId) || STRATEGIES[0]

  const renderPreview = () => {
    switch (strategyId) {
      case 'emergency-response':
        return (
          <div className="w-full h-full bg-gradient-to-br from-slate-50 to-orange-50 flex flex-col" style={{ fontFamily: strategy.fontStyle === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif' }}>
            {/* Sticky Header */}
            <div className="h-14 bg-white/80 backdrop-blur-sm border-b shadow-sm flex items-center justify-between px-6 sticky top-0 z-10">
              <div className="text-lg font-bold tracking-tight" style={{ color: strategy.colors.primary === '#FFFFFF' ? '#1F2937' : strategy.colors.primary }}>
                {data.name}
              </div>
              <div className="px-4 py-2 rounded-lg font-semibold text-white shadow-lg shadow-orange-200" style={{ backgroundColor: strategy.colors.accent }}>
                Call Now
              </div>
            </div>
            {/* Hero Section */}
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-12">
              <h1 className="text-4xl font-bold text-center tracking-tight" style={{ color: strategy.colors.primary === '#FFFFFF' ? '#1F2937' : strategy.colors.primary }}>
                {data.service} in {data.city}
              </h1>
              <div className="px-8 py-4 rounded-xl font-bold text-white text-xl shadow-lg shadow-orange-200" style={{ backgroundColor: strategy.colors.accent }}>
                {data.phone}
              </div>
              <p className="text-gray-600 text-center max-w-md">
                24/7 Emergency Service • Available Now
              </p>
            </div>
            {/* Map Section */}
            <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 border-t flex items-center justify-center">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-5 h-5" />
                <span>Serving {data.city} & Bay Area</span>
              </div>
            </div>
          </div>
        )

      case 'local-showroom':
        return (
          <div className="w-full h-full relative overflow-hidden" style={{ fontFamily: 'Georgia, serif' }}>
            {/* Full-bleed Image Background with dark luxury theme */}
            <div className="absolute inset-0 bg-slate-900"></div>
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(212,175,55,0.3) 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
            {/* Overlay Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
              <div className="text-5xl font-serif mb-4 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
                {data.name}
              </div>
              <div className="text-2xl font-serif text-white/90 mb-8">
                {data.service} in {data.city}
              </div>
              <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
            </div>
          </div>
        )

      case 'community-pillar':
        return (
          <div className="w-full h-full bg-gray-50 flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>
            {/* Header */}
            <div className="h-16 bg-white border-b shadow-md flex items-center px-8">
              <div className="text-xl font-bold" style={{ color: strategy.colors.secondary }}>
                {data.name}
              </div>
            </div>
            {/* Split Layout */}
            <div className="flex-1 flex">
              {/* Left: Image */}
              <div className="w-2/5 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-blue-400/10"></div>
                <div className="w-24 h-24 rounded-full bg-white border-4 shadow-lg flex items-center justify-center" style={{ borderColor: strategy.colors.accent }}>
                  <Shield className="w-12 h-12" style={{ color: strategy.colors.accent }} />
                </div>
              </div>
              {/* Right: Content */}
              <div className="flex-1 p-8 flex flex-col justify-center bg-white shadow-md">
                <h1 className="text-3xl font-bold mb-4" style={{ color: strategy.colors.secondary }}>
                  Meet Our Team
                </h1>
                <div className="space-y-2 mb-6">
                  <div className="h-3 bg-gray-300 rounded w-full"></div>
                  <div className="h-3 bg-gray-300 rounded w-4/5"></div>
                  <div className="h-3 bg-gray-300 rounded w-full"></div>
                  <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                </div>
                <div className="flex gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-12 h-12 rounded-full border-2 flex items-center justify-center" style={{ borderColor: strategy.colors.accent }}>
                      <Shield className="w-6 h-6" style={{ color: strategy.colors.accent }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      case 'neighborhood-menu':
        return (
          <div className="w-full h-full bg-white flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>
            {/* Search Bar */}
            <div className="h-16 bg-gray-50 border-b flex items-center px-6 gap-4">
              <div className="flex-1 h-10 bg-white border rounded-lg px-4 flex items-center text-gray-400 shadow-sm">
                Search menu items...
              </div>
            </div>
            {/* Product Grid */}
            <div className="flex-1 p-6 grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex flex-col bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="w-full h-32 bg-gradient-to-br from-emerald-100 to-emerald-200 relative">
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                      ${150 + i * 25}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'town-square':
        return (
          <div className="w-full h-full bg-white flex" style={{ fontFamily: 'system-ui, sans-serif' }}>
            {/* Calendar Sidebar */}
            <div className="w-1/3 border-r bg-gray-50 p-4 shadow-md">
              <div className="h-6 bg-gray-300 rounded mb-3"></div>
              <div className="grid grid-cols-3 gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                  <div key={i} className="aspect-square bg-white border rounded flex items-center justify-center text-xs shadow-sm" style={{ borderColor: strategy.colors.accent }}>
                    {i}
                  </div>
                ))}
              </div>
            </div>
            {/* Feed */}
            <div className="flex-1 p-6">
              <h2 className="text-2xl font-bold mb-4" style={{ color: strategy.colors.secondary }}>
                Community Updates
              </h2>
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="border-b pb-4">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      default:
        return <div className="w-full h-full bg-gray-200"></div>
    }
  }

  return (
    <div className="w-full h-full rounded-lg overflow-hidden shadow-2xl" style={{ transform: 'scale(0.85)', transformOrigin: 'top left' }}>
      {/* Browser Chrome */}
      <div className="h-8 bg-gray-800 flex items-center gap-1.5 px-3">
        <div className="w-2 h-2 rounded-full bg-red-500"></div>
        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
      </div>
      {/* Preview Content */}
      <div className="h-[calc(100%-2rem)]">
        {renderPreview()}
      </div>
    </div>
  )
}

interface ThemeSelectionProps {
  onSelect?: (themeId: string) => void
  onContinue?: (themeId: string) => void
  initialSelection?: string
  recommendedCategory?: string
  businessProfile?: BusinessProfile
}

export default function ThemeSelection({
  onSelect,
  onContinue,
  initialSelection,
  recommendedCategory,
  businessProfile
}: ThemeSelectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const currentStrategy = STRATEGIES[currentIndex]
  
  // Demo data fallback for development
  const demoData = { 
    name: "Elite Transporters", 
    city: "San Francisco", 
    service: "Luxury Private Shuttle" 
  }

  useEffect(() => {
    if (initialSelection) {
      const index = STRATEGIES.findIndex(s => s.id === initialSelection)
      if (index !== -1) setCurrentIndex(index)
    }
  }, [initialSelection])

  const handleNext = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % STRATEGIES.length)
      setIsTransitioning(false)
    }, 200)
  }

  const handlePrevious = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + STRATEGIES.length) % STRATEGIES.length)
      setIsTransitioning(false)
    }, 200)
  }

  const handleApprove = () => {
    onContinue?.(currentStrategy.id)
    onSelect?.(currentStrategy.id)
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          Strategic Website Design Proposals
        </h1>
        <p className="text-gray-600">
          Our team has prepared {STRATEGIES.length} tailored strategies for your business
        </p>
      </div>

      {/* Split-Screen Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Live Preview (60%) */}
        <div className="w-full lg:w-[60%] bg-gray-100 flex items-center justify-center p-4 lg:p-8">
          <div className={`w-full max-w-2xl transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            <PersonalizedPreview 
              strategyId={currentStrategy.id} 
              businessProfile={businessProfile}
            />
          </div>
        </div>

        {/* Right: Strategy Pitch (40%) - Desktop */}
        <div className="hidden lg:flex lg:w-[40%] bg-white/60 backdrop-blur-md border-l border-gray-200 overflow-y-auto">
          <div className={`p-8 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            {/* Strategy Number */}
            <div className="text-sm font-semibold text-gray-500 mb-2">
              Strategy {currentIndex + 1} of {STRATEGIES.length}
            </div>
            
            {/* Headline */}
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              {currentStrategy.title}
            </h2>

            {/* The 'Why' */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                The Strategy
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {currentStrategy.why}
              </p>
            </div>

            {/* SEO Impact */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wide mb-2">
                SEO Impact
              </h3>
              <p className="text-sm text-blue-800">
                {currentStrategy.seoImpact}
              </p>
            </div>

            {/* Ideal Customer */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Ideal Customer Profile
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {currentStrategy.idealCustomer}
              </p>
            </div>

            {/* Trade-Off */}
            <div className="mb-8 p-4 bg-amber-50 rounded-lg border border-amber-100">
              <h3 className="text-sm font-semibold text-amber-900 uppercase tracking-wide mb-2">
                Honest Assessment
              </h3>
              <p className="text-sm text-amber-800 italic">
                {currentStrategy.tradeOff}
              </p>
            </div>

            {/* Approve Button */}
            <button
              onClick={handleApprove}
              className="w-full px-8 py-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Initialize {businessProfile?.businessName || 'Elite Transporters'} with Strategy {currentIndex + 1}
            </button>
          </div>
        </div>

        {/* Mobile: Strategy Pitch (shown below preview) */}
        <div className="lg:hidden w-full bg-white/90 backdrop-blur-sm border-t border-gray-200 overflow-y-auto max-h-[50vh]">
          <div className={`p-6 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            <div className="text-sm font-semibold text-gray-500 mb-2">
              Strategy {currentIndex + 1} of {STRATEGIES.length}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {currentStrategy.title}
            </h2>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                The Strategy
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                {currentStrategy.why}
              </p>
            </div>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">
                SEO Impact
              </h3>
              <p className="text-xs text-blue-800">
                {currentStrategy.seoImpact}
              </p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                Ideal Customer
              </h3>
              <p className="text-gray-700 text-sm">
                {currentStrategy.idealCustomer}
              </p>
            </div>
            <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <h3 className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-1">
                Honest Assessment
              </h3>
              <p className="text-xs text-amber-800 italic">
                {currentStrategy.tradeOff}
              </p>
            </div>
            <button
              onClick={handleApprove}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-base rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Initialize {businessProfile?.businessName || 'Elite Transporters'} with Strategy {currentIndex + 1}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 px-8 py-4 flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={isTransitioning}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-semibold">Previous Strategy</span>
        </button>

        <div className="flex gap-2">
          {STRATEGIES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex 
                  ? 'bg-blue-600 w-8' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={isTransitioning}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="font-semibold">Next Strategy</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
