'use client'

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, MapPin, Phone, Shield, Star, Calendar } from 'lucide-react'

// ScrapedData Interface - The Data Architecture
interface ScrapedData {
  businessName: string
  phone: string
  city: string
  navLinks: string[]
  industryKeyword: string
  aboutSnippet: string
}

// Business Profile Interface (for backward compatibility)
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

// Image Engine - Maps industry keywords to high-quality Unsplash URLs
function getIndustryImage(keyword: string): string {
  const normalizedKeyword = keyword.toLowerCase()
  
  if (normalizedKeyword.includes('limo') || normalizedKeyword.includes('transport') || normalizedKeyword.includes('car') || normalizedKeyword.includes('shuttle')) {
    return 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80'
  }
  
  if (normalizedKeyword.includes('plumb') || normalizedKeyword.includes('home') || normalizedKeyword.includes('repair') || normalizedKeyword.includes('contractor')) {
    return 'https://images.unsplash.com/photo-1581578731117-104f2a86372d?auto=format&fit=crop&w=800&q=80'
  }
  
  if (normalizedKeyword.includes('restaurant') || normalizedKeyword.includes('food') || normalizedKeyword.includes('dining') || normalizedKeyword.includes('cafe')) {
    return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'
  }
  
  if (normalizedKeyword.includes('medical') || normalizedKeyword.includes('health') || normalizedKeyword.includes('doctor') || normalizedKeyword.includes('clinic')) {
    return 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=800&q=80'
  }
  
  if (normalizedKeyword.includes('legal') || normalizedKeyword.includes('law') || normalizedKeyword.includes('attorney')) {
    return 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800&q=80'
  }
  
  // Default: Modern office or abstract gradient
  return 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'
}

// Phone Number Formatting Helper
function formatPhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')
  
  // Format as: 415 • 555 • 0199
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} • ${digits.slice(3, 6)} • ${digits.slice(6)}`
  }
  
  // If already formatted or different length, return as-is
  return phone
}

// Prepare ScrapedData from BusinessProfile
function prepareScrapedData(businessProfile?: BusinessProfile): ScrapedData {
  const defaultNavLinks = ['Home', 'Services', 'About', 'Contact']
  
  return {
    businessName: businessProfile?.businessName || 'Elite Transporters',
    phone: businessProfile?.contactInfo?.phone || '(415) 555-0123',
    city: businessProfile?.location?.city || 'San Francisco',
    navLinks: businessProfile?.services?.map(s => s.name) || defaultNavLinks,
    industryKeyword: businessProfile?.industry?.toLowerCase() || businessProfile?.services?.[0]?.name?.toLowerCase() || 'limo',
    aboutSnippet: `Serving ${businessProfile?.location?.city || 'San Francisco'} and the Bay Area since 1998. We provide premium ${businessProfile?.services?.[0]?.name || businessProfile?.industry || 'transportation'} services with unmatched quality and reliability.`
  }
}

// Personalized Preview Component - Hyper-Realistic Mockups
interface PersonalizedPreviewProps {
  strategyId: string
  businessProfile?: BusinessProfile
  scrapedData?: ScrapedData
}

function PersonalizedPreview({ strategyId, businessProfile, scrapedData }: PersonalizedPreviewProps) {
  // Use scrapedData if provided, otherwise prepare from businessProfile
  const data: ScrapedData = scrapedData || prepareScrapedData(businessProfile)
  const strategy = STRATEGIES.find(s => s.id === strategyId) || STRATEGIES[0]
  const industryImage = getIndustryImage(data.industryKeyword)
  const formattedPhone = formatPhone(data.phone)
  const navLinks = data.navLinks.length > 0 ? data.navLinks : ['Home', 'Services', 'About', 'Contact']
  
  // Get current date for calendar
  const currentDate = new Date()
  const dayOfMonth = currentDate.getDate()
  const monthName = currentDate.toLocaleString('default', { month: 'short' })

  const renderPreview = () => {
    switch (strategyId) {
      case 'emergency-response':
        return (
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 to-slate-200 flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>
            {/* Sticky Header */}
            <div className="h-14 bg-white/90 backdrop-blur-sm border-b shadow-sm flex items-center justify-between px-6 sticky top-0 z-10">
              <div className="text-lg font-bold tracking-tight text-slate-900 truncate max-w-[200px]">
                {data.businessName}
              </div>
              <button className="px-4 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all">
                Call Now
              </button>
            </div>
            
            {/* Hero Section */}
            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-12">
              {/* Avatar with Industry Image */}
              <div className="relative">
                <img 
                  src={industryImage} 
                  alt={data.businessName}
                  className="w-24 h-24 rounded-full ring-4 ring-white shadow-lg object-cover"
                />
              </div>
              
              {/* Phone Number - Prominently Displayed */}
              <div className="text-xl font-bold text-slate-900">
                {formattedPhone}
              </div>
              
              <h1 className="text-3xl font-bold text-center text-slate-900 tracking-tight max-w-md">
                {data.businessName}
              </h1>
              
              <p className="text-slate-600 text-center max-w-md">
                24/7 Emergency Service • Available Now
              </p>
            </div>
            
            {/* Map Section */}
            <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 border-t flex items-center justify-center">
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-5 h-5" />
                <span>Serving {data.city} & Bay Area</span>
              </div>
            </div>
          </div>
        )

      case 'local-showroom':
        return (
          <div className="w-full h-full relative overflow-hidden" style={{ fontFamily: 'Georgia, serif' }}>
            {/* Full-Bleed Background Image */}
            <img 
              src={industryImage} 
              alt={data.businessName}
              className="absolute inset-0 w-full h-full object-cover"
            />
            
            {/* Heavy Dark Overlay */}
            <div className="absolute inset-0 bg-black/70"></div>
            
            {/* Navigation Links - Centered */}
            <div className="absolute top-8 left-0 right-0 flex justify-center gap-8 z-10">
              {navLinks.slice(0, 4).map((link, i) => (
                <a 
                  key={i}
                  href="#" 
                  className="text-white/80 uppercase tracking-widest text-xs font-light hover:text-white transition-colors"
                >
                  {link}
                </a>
              ))}
            </div>
            
            {/* Overlay Content - Centered */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 z-10">
              <h1 className="text-5xl font-serif italic mb-4 text-amber-50 drop-shadow-lg">
                {data.businessName}
              </h1>
              <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mb-4"></div>
              <p className="text-xl font-serif text-white/90">
                Premium {data.industryKeyword} in {data.city}
              </p>
            </div>
          </div>
        )

      case 'community-pillar':
        return (
          <div className="w-full h-full bg-gray-50 flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>
            {/* Header */}
            <div className="h-16 bg-white border-b shadow-md flex items-center px-8">
              <div className="text-xl font-bold text-blue-900 truncate">
                {data.businessName}
              </div>
            </div>
            
            {/* Split Layout */}
            <div className="flex-1 flex relative">
              {/* Left: Image (30%) */}
              <div className="w-[30%] relative">
                <img 
                  src={industryImage} 
                  alt={data.businessName}
                  className="w-full h-full object-cover"
                />
                
                {/* Certification Badges - Floating over boundary */}
                <div className="absolute -right-4 top-8 flex flex-col gap-2">
                  {[1, 2, 3].map(i => (
                    <div 
                      key={i}
                      className="w-8 h-8 bg-white rounded-sm shadow-md flex items-center justify-center"
                    >
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Right: Content (70%) */}
              <div className="flex-1 p-8 flex flex-col justify-center bg-white shadow-md">
                <h1 className="text-3xl font-bold mb-4 text-blue-900">
                  About {data.businessName}
                </h1>
                <p className="text-gray-700 leading-relaxed line-clamp-4 mb-6">
                  {data.aboutSnippet}
                </p>
                <div className="flex gap-4">
                  {[1, 2, 3].map(i => (
                    <div 
                      key={i}
                      className="w-12 h-12 rounded-full border-2 border-blue-600 flex items-center justify-center bg-white shadow-sm"
                    >
                      <Shield className="w-6 h-6 text-blue-600" />
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
            <div className="flex-1 p-4 grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex flex-col bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
                  {/* Thumbnail - Use industry image for first card */}
                  <div className="w-full h-32 relative">
                    {i === 1 ? (
                      <img 
                        src={industryImage} 
                        alt="Product"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${
                        i === 2 ? 'from-emerald-100 to-emerald-200' :
                        i === 3 ? 'from-blue-100 to-blue-200' :
                        'from-purple-100 to-purple-200'
                      }`}></div>
                    )}
                    
                    {/* Price Tag */}
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white px-2 py-1 rounded-full text-[10px] font-bold shadow-sm">
                      ${120 + i * 15}
                    </div>
                    
                    {/* Add to Cart Button */}
                    <div className="absolute bottom-2 left-2">
                      <button className="bg-emerald-500 text-white text-[8px] rounded-full px-2 py-0.5 font-semibold shadow-sm hover:bg-emerald-600 transition-colors">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-3">
                    <div className="h-3 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'town-square':
        return (
          <div className="w-full h-full bg-white flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>
            {/* Tab Navigation */}
            <div className="h-12 bg-gray-50 border-b flex items-center px-6 gap-6">
              {navLinks.slice(0, 4).map((link, i) => (
                <button
                  key={i}
                  className={`text-sm font-medium transition-colors ${
                    i === 0 
                      ? 'text-purple-600 border-b-2 border-purple-500 pb-2' 
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  {link}
                </button>
              ))}
            </div>
            
            {/* Main Content */}
            <div className="flex-1 flex">
              {/* Calendar Sidebar (30%) */}
              <div className="w-[30%] border-r bg-gray-50 p-4">
                {/* Calendar Icon - Page Tear Style */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
                  {/* Red Header */}
                  <div className="bg-red-500 h-8 flex items-center justify-center">
                    <span className="text-white text-xs font-bold uppercase">{monthName}</span>
                  </div>
                  {/* White Body */}
                  <div className="h-16 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">{dayOfMonth}</span>
                  </div>
                </div>
                
                {/* Mini Calendar Grid */}
                <div className="grid grid-cols-3 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                    <div 
                      key={i} 
                      className="aspect-square bg-white border rounded flex items-center justify-center text-xs shadow-sm"
                      style={{ borderColor: i === dayOfMonth ? strategy.colors.accent : '#e5e7eb' }}
                    >
                      {i}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Feed (70%) */}
              <div className="flex-1 p-6">
                <h2 className="text-2xl font-bold mb-4 text-purple-900">
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
          </div>
        )

      default:
        return <div className="w-full h-full bg-gray-200"></div>
    }
  }

  return (
    <div className="w-full h-full rounded-xl border border-white/20 shadow-2xl bg-white overflow-hidden" style={{ transform: 'scale(0.85)', transformOrigin: 'top left' }}>
      {/* Browser Chrome - Address Bar with Traffic Lights */}
      <div className="h-6 bg-gray-50 border-b flex items-center px-2 gap-1.5">
        {/* Traffic Light Dots */}
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-inner"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-inner"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-inner"></div>
        </div>
        {/* Address Bar */}
        <div className="flex-1 h-4 bg-white border border-gray-200 rounded mx-2 px-2 text-[8px] text-gray-400 flex items-center">
          {data.businessName.toLowerCase().replace(/\s+/g, '')}.com
        </div>
      </div>
      
      {/* Preview Content */}
      <div className="h-[calc(100%-1.5rem)]">
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
  scrapedData?: ScrapedData
}

export default function ThemeSelection({
  onSelect,
  onContinue,
  initialSelection,
  recommendedCategory,
  businessProfile,
  scrapedData
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
              scrapedData={scrapedData}
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
              Initialize {businessProfile?.businessName || scrapedData?.businessName || 'Elite Transporters'} with Strategy {currentIndex + 1}
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
              Initialize {businessProfile?.businessName || scrapedData?.businessName || 'Elite Transporters'} with Strategy {currentIndex + 1}
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
