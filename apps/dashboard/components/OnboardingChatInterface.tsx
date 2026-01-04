/**
 * Onboarding Chat Interface Component
 * Conversational SMB Profile Creator
 * Replaces forms with a friendly, podcast-style interview
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface OnboardingChatInterfaceProps {
  userId: string
  className?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

type Archetype = 'BrickAndMortar' | 'ServiceOnWheels' | 'AppointmentPro' | null

interface BusinessProfileData {
  archetype: Archetype
  identity: {
    business_name: string
    address_or_area: string
    phone: string
    email: string
    website: string
    hours: string
    social_links: string[]
  }
  offering: {
    core_services: string[]
    target_audience: string
    vibe_mission: string
  }
  credibility: {
    owner_name: string
    owner_bio: string
    credentials: string[]
    years_in_business: string
  }
  logistics: {
    payment_methods: string[]
    insurance_accepted: boolean
    booking_policy: string
    specific_policy: string
  }
}

type WebsiteModel = 'brand_authority' | 'direct_response' | 'education_first' | 'hybrid_commerce' | 'community_pillar' | null

interface OnboardingState {
  phase: 'website_check' | 'discovery' | 'storefront' | 'menu' | 'locals' | 'counter' | 'proofread' | 'website_models' | 'complete'
  subStep: string
  archetype: Archetype
  data: Partial<BusinessProfileData>
  needsVerification: {
    field?: string
    value?: string
    suggestion?: string
  } | null
  fromWebsite: boolean
  scrapedData?: any // Store full scraped data for model generation
  selectedModel?: WebsiteModel
}

export default function OnboardingChatInterface({ userId, className = '' }: OnboardingChatInterfaceProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    phase: 'website_check',
    subStep: 'has_website',
    archetype: null,
    data: {},
    needsVerification: null,
    fromWebsite: false
  })
  const [isComplete, setIsComplete] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize with website check message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMsg: Message = {
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm Navi. To speed things up, do you already have a website for your business? If yes, paste the link and I'll pull the details for you!",
        timestamp: new Date()
      }
      setMessages([welcomeMsg])
    }
  }, [])

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Detect archetype from business type
  const detectArchetype = (businessType: string): Archetype => {
    const lower = businessType.toLowerCase()
    
    // Service on Wheels indicators
    if (lower.includes('mobile') || lower.includes('on wheels') || lower.includes('travel') || 
        lower.includes('plumber') || lower.includes('electrician') || lower.includes('hvac') ||
        lower.includes('landscap') || lower.includes('detail') || lower.includes('delivery') ||
        lower.includes('truck') || lower.includes('van')) {
      return 'ServiceOnWheels'
    }
    
    // Appointment Pro indicators
    if (lower.includes('salon') || lower.includes('spa') || lower.includes('therapist') ||
        lower.includes('counselor') || lower.includes('tutor') || lower.includes('coach') ||
        lower.includes('lawyer') || lower.includes('attorney') || lower.includes('consultant') ||
        lower.includes('doctor') || lower.includes('dentist') || lower.includes('chiropractor') ||
        lower.includes('appointment') || lower.includes('booking') || lower.includes('session')) {
      return 'AppointmentPro'
    }
    
    // Default to Brick & Mortar
    return 'BrickAndMortar'
  }

  // Check if location includes a state (flexible format detection)
  const hasStateInLocation = (location: string): boolean => {
    const lower = location.toLowerCase()
    
    // List of all US state abbreviations (both uppercase and lowercase patterns)
    const stateAbbreviations = [
      'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga',
      'hi', 'id', 'il', 'in', 'ia', 'ks', 'ky', 'la', 'me', 'md',
      'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj',
      'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc',
      'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy'
    ]
    
    // Check for state abbreviation patterns:
    // 1. With comma: ", ca" or ", CA"
    // 2. Without comma but with space: " ca" or " CA" (at word boundary)
    // 3. At the end of string: " ca" or " CA"
    for (const state of stateAbbreviations) {
      // Pattern 1: With comma (required space after comma)
      if (new RegExp(`[,\\s]${state}\\b`, 'i').test(lower)) {
        return true
      }
      // Pattern 2: At end of string (with or without space before)
      if (new RegExp(`\\s${state}$`, 'i').test(lower)) {
        return true
      }
    }
    
    // Also check for common state names
    const stateNames = [
      'california', 'texas', 'florida', 'new york', 'pennsylvania', 'illinois',
      'ohio', 'georgia', 'north carolina', 'michigan', 'new jersey', 'virginia',
      'washington', 'arizona', 'massachusetts', 'tennessee', 'indiana', 'missouri',
      'maryland', 'wisconsin', 'colorado', 'minnesota', 'south carolina', 'alabama',
      'louisiana', 'kentucky', 'oregon', 'oklahoma', 'connecticut', 'utah',
      'iowa', 'nevada', 'arkansas', 'mississippi', 'kansas', 'new mexico',
      'nebraska', 'west virginia', 'idaho', 'hawaii', 'new hampshire', 'maine',
      'rhode island', 'montana', 'delaware', 'south dakota', 'north dakota',
      'alaska', 'vermont', 'wyoming'
    ]
    
    for (const stateName of stateNames) {
      if (lower.includes(stateName)) {
        return true
      }
    }
    
    return false
  }

  // Eagle Eye validation - check for typos in critical fields
  const validateCriticalField = (field: string, value: string): { isValid: boolean; suggestion?: string } => {
    if (field === 'email') {
      // Check for common email typos
      if (value.includes('gmai.com') || value.includes('gmail.co')) {
        return { isValid: false, suggestion: value.replace(/gmai\.com|gmail\.co/g, 'gmail.com') }
      }
      if (value.includes('yahoo.co')) {
        return { isValid: false, suggestion: value.replace(/yahoo\.co/g, 'yahoo.com') }
      }
      // Check for invalid TLDs (common typos)
      const invalidTlds = ['.vom', '.con', '.cmo', '.ocm', '.cm', '.co']
      for (const invalidTld of invalidTlds) {
        if (value.includes(invalidTld)) {
          const corrected = value.replace(invalidTld, '.com')
          return { isValid: false, suggestion: corrected }
        }
      }
      // Check for missing @ or invalid format
      if (!value.includes('@') || !value.includes('.')) {
        return { isValid: false, suggestion: undefined }
      }
      // Check if TLD looks suspicious (too short or common typos)
      const emailParts = value.split('@')
      if (emailParts.length === 2) {
        const domain = emailParts[1]
        const tld = domain.split('.').pop()?.toLowerCase()
        const validTlds = ['com', 'org', 'net', 'edu', 'gov', 'io', 'co', 'uk', 'ca', 'au', 'de', 'fr', 'jp', 'cn']
        if (tld && tld.length < 2) {
          return { isValid: false, suggestion: value.replace(/\.\w+$/, '.com') }
        }
      }
    }
    
    if (field === 'phone') {
      // Remove non-digits
      const digits = value.replace(/\D/g, '')
      if (digits.length < 10 || digits.length > 15) {
        return { isValid: false, suggestion: undefined }
      }
    }
    
    if (field === 'business_name') {
      // Check for obvious typos (double spaces, etc.)
      if (value.includes('  ') || value.trim().length < 2) {
        return { isValid: false, suggestion: value.replace(/\s+/g, ' ').trim() }
      }
    }
    
    return { isValid: true }
  }

  // Format DEEP DIVE Calibration Report (for website scraping)
  const formatCalibrationReport = (scrapedData: any): string => {
    let report = "## 🟢 NAVI CALIBRATION REPORT\n\n"
    
    // 1. Operational Baseline
    report += "### 🏢 Operational Baseline\n"
    report += `• **Business:** ${scrapedData.businessName || 'Not found'}\n`
    if (scrapedData.tagline) report += `• **Tagline:** "${scrapedData.tagline}"\n`
    report += `• **Industry:** ${scrapedData.industry || 'Not specified'}\n`
    
    const location = [
      scrapedData.location?.address,
      scrapedData.location?.city,
      scrapedData.location?.state,
      scrapedData.location?.zipCode
    ].filter(Boolean).join(', ')
    if (location) report += `• **Headquarters:** ${location}\n`
    
    if (scrapedData.ownerName) {
      report += `• **Command:** ${scrapedData.ownerName}`
      if (scrapedData.ownerCredentials) report += ` | ${scrapedData.ownerCredentials}`
      report += "\n"
    }
    
    if (scrapedData.contactInfo?.phone || scrapedData.contactInfo?.email) {
      report += `• **Contact:** ${scrapedData.contactInfo?.phone || ''} | ${scrapedData.contactInfo?.email || ''}\n`
    }
    if (scrapedData.hours) report += `• **Hours:** ${scrapedData.hours}\n`
    if (scrapedData.yearsInBusiness) report += `• **Experience:** ${scrapedData.yearsInBusiness}\n`
    
    // 2. Service & Asset Inventory
    report += "\n### 🛠️ Service & Asset Inventory\n"
    if (scrapedData.services && scrapedData.services.length > 0) {
      report += "• **Core Services:**\n"
      scrapedData.services.slice(0, 7).forEach((s: any) => {
        const svc = typeof s === 'string' ? s : s.name
        const price = typeof s === 'object' && s.price ? ` (${s.price})` : ''
        report += `  - ${svc}${price}\n`
      })
    }
    if (scrapedData.hardAssets && scrapedData.hardAssets.length > 0) {
      report += `• **Hard Assets:** ${scrapedData.hardAssets.slice(0, 5).join(', ')}\n`
    }
    if (scrapedData.specializations && scrapedData.specializations.length > 0) {
      report += `• **Specializations:** ${scrapedData.specializations.join(', ')}\n`
    }
    
    // 3. Authority & Differentiation
    report += "\n### 🛡️ Authority & Trust Signals\n"
    if (scrapedData.credentials && scrapedData.credentials.length > 0) {
      report += `• **Credentials:** ${scrapedData.credentials.join(', ')}\n`
    }
    if (scrapedData.awards && scrapedData.awards.length > 0) {
      report += `• **Awards:** ${scrapedData.awards.join(', ')}\n`
    }
    if (scrapedData.killShot) {
      report += `• **The "Kill Shot":** ${scrapedData.killShot}\n`
    }
    
    // 4. Digital Maturity
    report += "\n### 📊 Digital Maturity\n"
    report += `• **Website Quality:** ${scrapedData.websiteQuality || 'Unknown'}\n`
    report += `• **Online Booking:** ${scrapedData.hasOnlineBooking ? '✅ Yes' : '❌ No'}\n`
    report += `• **Blog:** ${scrapedData.hasBlog ? '✅ Active' : '❌ None found'}\n`
    
    const socials = scrapedData.socialProfiles || {}
    const activeSocials = Object.entries(socials).filter(([k, v]) => v).map(([k]) => k)
    report += `• **Social Presence:** ${activeSocials.length > 0 ? activeSocials.join(', ') : 'None found'}\n`
    
    // 5. Target Market
    report += "\n### 🎯 Target Market\n"
    if (scrapedData.targetAudience) report += `• **Audience:** ${scrapedData.targetAudience}\n`
    if (scrapedData.serviceArea) report += `• **Service Area:** ${scrapedData.serviceArea}\n`
    
    // 6. Pricing
    report += "\n### 💰 Pricing Intelligence\n"
    report += `• **Model:** ${scrapedData.pricingModel || 'Not Listed'}\n`
    if (scrapedData.pricePoints && scrapedData.pricePoints.length > 0) {
      report += `• **Price Points:** ${scrapedData.pricePoints.slice(0, 5).join(', ')}\n`
    }
    
    // 7. Gap Analysis
    report += "\n### ⚠️ Gap Analysis\n"
    report += `• **Booking Friction:** ${scrapedData.bookingFriction || 'Unknown'}\n`
    if (scrapedData.contentGap) report += `• **Content Gap:** ${scrapedData.contentGap}\n`
    if (scrapedData.seoOpportunity) report += `• **SEO Opportunity:** ${scrapedData.seoOpportunity}\n`
    if (scrapedData.improvementAreas && scrapedData.improvementAreas.length > 0) {
      report += `• **Top Improvements:**\n`
      scrapedData.improvementAreas.slice(0, 3).forEach((area: string) => {
        report += `  - ${area}\n`
      })
    }
    
    // 8. Recommendation
    report += "\n---\n\n"
    
    // Determine recommendation based on gaps
    if (scrapedData.websiteQuality === 'Dated/Needs Update' || scrapedData.websiteQuality === 'Basic/Template') {
      report += "**🚀 RECOMMENDED ACTION:** Your website could use a modern refresh. I recommend starting with the **Website Builder Module** - I've already drafted a high-conversion design based on your services.\n"
    } else if (!scrapedData.hasBlog && scrapedData.contentGap) {
      report += "**🚀 RECOMMENDED ACTION:** Your services are clear but your content footprint is small. I recommend the **Content & Blog Module** - I can draft SEO-optimized articles about your services.\n"
    } else if (scrapedData.bookingFriction === 'High' || !scrapedData.hasOnlineBooking) {
      report += "**🚀 RECOMMENDED ACTION:** I detected friction in your booking process. I recommend the **CRM & Booking Module** - let me set up 24/7 automated booking.\n"
    } else {
      report += "**🚀 STATUS:** Your digital presence looks solid! Let's fine-tune your profile and get you set up.\n"
    }
    
    report += "\n---\n\n*Does this look accurate? Reply **\"looks good\"** to see website design options, or tell me what needs correcting.*"
    
    return report
  }

  // Generate the 5 Website Model Showcase
  const generateWebsiteModelsShowcase = (scrapedData: any, businessData: Partial<BusinessProfileData>): string => {
    const businessName = scrapedData?.businessName || businessData?.identity?.business_name || 'Your Business'
    const city = scrapedData?.location?.city || businessData?.identity?.address_or_area?.split(',')[1]?.trim() || 'your area'
    const industry = scrapedData?.industry || 'your industry'
    const services = scrapedData?.services?.slice(0, 3).map((s: any) => typeof s === 'string' ? s : s.name) || businessData?.offering?.core_services?.slice(0, 3) || []
    const ownerName = scrapedData?.ownerName || businessData?.credibility?.owner_name || 'you'
    const killShot = scrapedData?.killShot || scrapedData?.uniqueSellingProposition || ''
    const hasProducts = scrapedData?.productLines?.length > 0
    const targetAudience = scrapedData?.targetAudience || businessData?.offering?.target_audience || 'your customers'
    
    let showcase = "## 🎨 DIGITAL HEADQUARTERS OPTIONS\n\n"
    showcase += "*Based on my analysis of your business, I've architected 5 high-end website strategies. Each is designed to maximize a specific revenue outcome.*\n\n"
    showcase += "---\n\n"
    
    // Model 1: Brand Authority
    showcase += "### 1. 💎 THE \"BRAND AUTHORITY\" MODEL\n"
    showcase += "*Premium Positioning - Justify Higher Fees*\n\n"
    showcase += `**The Strategy:** This positions ${businessName} as the *most premium* option in ${city}. It uses psychology to justify higher fees and attract clients who value expertise over price.\n\n`
    showcase += `**Best For:** ${killShot ? `Your "${killShot}" makes you a specialist. This site sells that expertise.` : `Businesses with unique credentials or years of experience that deserve premium pricing.`}\n\n`
    showcase += "**👀 VISUAL SIMULATION:**\n"
    showcase += `- **Hero:** Full-screen cinematic video of ${ownerName} at work, overlaid with elegant serif headline: *\"Excellence in ${industry}\"*\n`
    showcase += "- **The Hook:** Minimal clutter. Single \"Request Concierge Appointment\" button (ghost style)\n"
    showcase += `- **Key Feature:** A \"Philosophy\" section establishing ${ownerName} as a thought leader\n\n`
    showcase += "---\n\n"
    
    // Model 2: Direct Response
    showcase += "### 2. ⚡ THE \"DIRECT RESPONSE\" MODEL\n"
    showcase += "*Lead Capture Machine - Fill Your Calendar*\n\n"
    showcase += `**The Strategy:** A conversion machine designed to capture leads *now*. Assumes visitors are in need and want a solution instantly.\n\n`
    showcase += `**Best For:** Capturing busy ${targetAudience} who don't have time to read bios - they want to book NOW.\n\n`
    showcase += "**👀 VISUAL SIMULATION:**\n"
    showcase += `- **Hero:** Split screen. Left: **\"${services[0] || 'Need Help'}? See Us Today.\"** Right: Sticky calendar widget\n`
    showcase += "- **The Hook:** High-contrast CTA buttons, trust badges (5-stars, awards) above the fold\n"
    showcase += "- **Key Feature:** AI Booking Bot integration - captures leads 24/7 without you lifting a finger\n\n"
    showcase += "---\n\n"
    
    // Model 3: Education First
    showcase += "### 3. 🎓 THE \"EDUCATION FIRST\" MODEL\n"
    showcase += "*SEO Dominance - Own Google Rankings*\n\n"
    showcase += `**The Strategy:** Plays the long game. Builds a content fortress around ${services.join(', ') || 'your services'} to dominate Google search results.\n\n`
    showcase += `**Best For:** Complex services that require education to sell. Clients research before they buy.\n\n`
    showcase += "**👀 VISUAL SIMULATION:**\n"
    showcase += `- **Hero:** Warm, inviting photo of your space. Headline: **\"Understanding ${industry}\"**\n`
    showcase += "- **The Hook:** Primary CTA is \"Take the Free Assessment\" (lead magnet) instead of \"Book Now\"\n"
    showcase += `- **Key Feature:** \"Knowledge Hub\" on homepage with AI-generated articles about ${services[0] || 'your expertise'}\n\n`
    showcase += "---\n\n"
    
    // Model 4: Hybrid Commerce
    showcase += "### 4. 🛒 THE \"HYBRID COMMERCE\" MODEL\n"
    showcase += "*Service + Product Sales - Diversify Revenue*\n\n"
    showcase += `**The Strategy:** Treats ${businessName} as both a service provider AND a store. Sell your time AND your products.\n\n`
    showcase += `**Best For:** ${hasProducts ? 'Perfect for you - I detected product lines you can sell online.' : 'Businesses that could add product sales (supplements, merchandise, equipment).'}\n\n`
    showcase += "**👀 VISUAL SIMULATION:**\n"
    showcase += `- **Hero:** Sleek Shopify-style grid. Block 1: \"Book ${services[0] || 'Service'}.\" Block 2: \"Shop Products.\"\n`
    showcase += "- **The Hook:** Frictionless checkout with \"Add to Cart\" buttons next to services\n"
    showcase += `- **Key Feature:** \"${ownerName}'s Picks\" carousel driving passive income while you sleep\n\n`
    showcase += "---\n\n"
    
    // Model 5: Community Pillar
    showcase += "### 5. 🏘️ THE \"COMMUNITY PILLAR\" MODEL\n"
    showcase += "*Referral Engine - Word of Mouth on Steroids*\n\n"
    showcase += `**The Strategy:** Creates a digital living room. Focuses on social proof, events, and community trust to drive referrals.\n\n`
    showcase += `**Best For:** Your focus on ${targetAudience} in ${city} relies on word-of-mouth. This amplifies it.\n\n`
    showcase += "**👀 VISUAL SIMULATION:**\n"
    showcase += `- **Hero:** High-res collage of happy customers/results. Headline: **\"${city}'s Favorite ${industry} Team\"**\n`
    showcase += "- **The Hook:** Live Instagram feed integration showing daily results\n"
    showcase += "- **Key Feature:** \"Events & Workshops\" calendar for open houses and community building\n\n"
    showcase += "---\n\n"
    
    // Strategic Recommendation
    showcase += "## 🎯 MY RECOMMENDATION\n\n"
    
    // Determine best fit based on data
    let recommendedModel = 2 // Default to Direct Response
    let reason = ""
    
    if (scrapedData?.bookingFriction === 'High' || !scrapedData?.hasOnlineBooking) {
      recommendedModel = 2
      reason = "your current booking friction is HIGH - you need a lead capture machine"
    } else if (killShot || scrapedData?.credentials?.length > 2) {
      recommendedModel = 1
      reason = "your credentials and expertise deserve premium positioning"
    } else if (!scrapedData?.hasBlog && scrapedData?.services?.length > 3) {
      recommendedModel = 3
      reason = "your complex service offerings would benefit from educational content"
    } else if (hasProducts) {
      recommendedModel = 4
      reason = "you have products to sell alongside your services"
    } else if (targetAudience.toLowerCase().includes('famil') || targetAudience.toLowerCase().includes('local')) {
      recommendedModel = 5
      reason = "your local community focus makes referrals your best growth channel"
    }
    
    showcase += `Based on my analysis of ${businessName}, I strongly recommend **Option ${recommendedModel}** because ${reason}.\n\n`
    showcase += "*However, the choice is yours. Which revenue engine shall we build?*\n\n"
    showcase += "**Reply with a number (1-5) to select your website model.**"
    
    return showcase
  }

  // Format proofread summary (for manual entry)
  const formatProofreadSummary = (data: Partial<BusinessProfileData>, fromWebsite: boolean = false): string => {
    let summary = ""
    
    if (fromWebsite) {
      summary = "I grabbed this info directly from your link, but sometimes websites can be outdated. Please double-check this closely—is it 100% current?\n\n"
    } else {
      summary = "Okay, I think I have everything! Please review this summary carefully:\n\n"
    }
    
    if (data.identity?.business_name) {
      summary += `**Name:** ${data.identity.business_name}\n`
    }
    if (data.identity?.address_or_area) {
      summary += `**Address:** ${data.identity.address_or_area}\n`
    }
    if (data.identity?.phone) {
      summary += `**Phone:** ${data.identity.phone}`
      if (data.identity?.email) {
        summary += ` | Email: ${data.identity.email}`
      }
      summary += "\n"
    } else if (data.identity?.email) {
      summary += `**Email:** ${data.identity.email}\n`
    }
    if (data.identity?.social_links && data.identity.social_links.length > 0) {
      summary += `**Socials:** ${data.identity.social_links.join(', ')}\n`
    } else {
      summary += `**Socials:** None\n`
    }
    if (data.offering?.core_services && data.offering.core_services.length > 0) {
      summary += `**Services:** ${data.offering.core_services.join(', ')}\n`
    }
    if (data.offering?.target_audience) {
      summary += `**Target Audience:** ${data.offering.target_audience}\n`
    }
    if (data.credibility?.owner_name) {
      summary += `**Owner:** ${data.credibility.owner_name}\n`
    }
    
    summary += "\nDoes the spelling of your Business Name, Phone Number, and Email look perfect? If you see any typos, tell me now!"
    
    return summary
  }

  // Handle user message
  const handleSend = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading || isComplete) return

    // Add user message
    const userMsg: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)

    try {
      const { phase, subStep, archetype, data, needsVerification } = onboardingState
      const lowerMessage = userMessage.toLowerCase().trim()

      // Handle verification requests
      if (needsVerification) {
        const updatedData = { ...data }
        const verifiedValue = (lowerMessage === 'yes' || lowerMessage === 'y' || lowerMessage === 'correct' || lowerMessage.includes('right'))
          ? (needsVerification.suggestion || userMessage.trim())
          : userMessage.trim()
          
          if (needsVerification.field === 'email') {
            updatedData.identity = { ...updatedData.identity, email: verifiedValue } as BusinessProfileData['identity']
          } else if (needsVerification.field === 'phone') {
            updatedData.identity = { ...updatedData.identity, phone: verifiedValue } as BusinessProfileData['identity']
          } else if (needsVerification.field === 'business_name') {
            updatedData.identity = { ...updatedData.identity, business_name: verifiedValue } as BusinessProfileData['identity']
          }
          
          // Continue to next step
          if (needsVerification.field === 'business_name') {
            let nextQuestion = ''
            if (archetype === 'BrickAndMortar') {
              nextQuestion = "And where is the shop located? (Address)"
            } else if (archetype === 'ServiceOnWheels') {
              nextQuestion = "And what cities or areas do you travel to?"
            } else {
              nextQuestion = "And where is your studio/office located?"
            }
            
            setOnboardingState({
              ...onboardingState,
              phase: 'storefront',
              subStep: 'location',
              data: updatedData,
              needsVerification: null
            })
            
            const locationMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: nextQuestion,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, locationMsg])
            setIsLoading(false)
            return
          } else if (needsVerification.field === 'phone') {
            // Phone verified, continue to get email if not already provided
            if (!updatedData.identity?.email) {
              setOnboardingState({
                ...onboardingState,
                phase: 'storefront',
                subStep: 'email_only',
                data: updatedData,
                needsVerification: null
              })
              
              const emailMsg: Message = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: "Got the phone number. What is the best email address for clients to reach you?",
                timestamp: new Date()
              }
              setMessages(prev => [...prev, emailMsg])
              setIsLoading(false)
              return
            } else {
              // Both phone and email are set, move to social links
              setOnboardingState({
                ...onboardingState,
                phase: 'storefront',
                subStep: 'social_links',
                data: updatedData,
                needsVerification: null
              })
              
              const socialMsg: Message = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: "Do you have an Instagram, Facebook, or LinkedIn page set up yet? If so, paste the links here!",
                timestamp: new Date()
              }
              setMessages(prev => [...prev, socialMsg])
              setIsLoading(false)
              return
            }
          } else if (needsVerification.field === 'email') {
            // Email verified, check if phone is set
            if (!updatedData.identity?.phone) {
              setOnboardingState({
                ...onboardingState,
                phase: 'storefront',
                subStep: 'phone_only',
                data: updatedData,
                needsVerification: null
              })
              
              const phoneMsg: Message = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: "Got the email. What is the main phone number for clients?",
                timestamp: new Date()
              }
              setMessages(prev => [...prev, phoneMsg])
              setIsLoading(false)
              return
            } else {
              // Both set, move to social links
              setOnboardingState({
                ...onboardingState,
                phase: 'storefront',
                subStep: 'social_links',
                data: updatedData,
                needsVerification: null
              })
              
              const socialMsg: Message = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: "Do you have an Instagram, Facebook, or LinkedIn page set up yet? If so, paste the links here!",
                timestamp: new Date()
              }
              setMessages(prev => [...prev, socialMsg])
              setIsLoading(false)
              return
            }
          }
      }

      // Phase -1: Website Check (FIRST interaction)
      if (phase === 'website_check' && subStep === 'has_website') {
        const lower = lowerMessage
        
        // Check if user provided a URL
        const urlMatch = userMessage.match(/(https?:\/\/[^\s]+)/i)
        const isUrl = urlMatch || userMessage.includes('http') || userMessage.includes('www.')
        
        if (isUrl || (!lower.includes('no') && !lower.includes('not') && !lower.includes("don't") && !lower.includes('none'))) {
          // User provided a URL or said yes
          const url = urlMatch ? urlMatch[0] : userMessage.trim()
          
          // Show scanning message
          const scanningMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: `Jackpot! 🕵️‍♀️ I'm scanning ${url} now... okay, I found the key details.`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, scanningMsg])
          
          try {
            // Scrape website
            const response = await fetch('/api/onboarding/scrape-website', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url })
            })
            
            if (!response.ok) {
              throw new Error('Failed to scrape website')
            }
            
            const result = await response.json()
            const scrapedData = result.data
            
            // Fill in data from scraped website (map to our internal format)
            const updatedData: Partial<BusinessProfileData> = {
              archetype: detectArchetype(scrapedData.industry || ''),
              identity: {
                business_name: scrapedData.businessName || '',
                address_or_area: scrapedData.location ? 
                  [scrapedData.location.address, scrapedData.location.city, scrapedData.location.state]
                    .filter(Boolean).join(', ') : '',
                phone: scrapedData.contactInfo?.phone || '',
                email: scrapedData.contactInfo?.email || '',
                website: url,
                hours: typeof scrapedData.hours === 'string' ? scrapedData.hours : '',
                social_links: Object.entries(scrapedData.socialProfiles || {})
                  .filter(([k, v]) => v)
                  .map(([k, v]) => `${k}: ${v}`)
              },
              offering: {
                core_services: scrapedData.services?.map((s: any) => typeof s === 'string' ? s : s.name) || [],
                target_audience: scrapedData.targetAudience || '',
                vibe_mission: scrapedData.brandVoice || ''
              },
              credibility: {
                owner_name: scrapedData.ownerName || '',
                owner_bio: scrapedData.uniqueSellingProposition || '',
                credentials: scrapedData.credentials || [],
                years_in_business: scrapedData.yearsInBusiness || ''
              },
              logistics: {
                payment_methods: scrapedData.paymentMethods || [],
                insurance_accepted: scrapedData.insuranceAccepted?.length > 0,
                booking_policy: scrapedData.bookingMethod || '',
                specific_policy: ''
              }
            }
            
            // Jump straight to Phase 3: Review - store scrapedData for model generation
            setOnboardingState({
              phase: 'proofread',
              subStep: 'review',
              archetype: updatedData.archetype as Archetype,
              data: updatedData,
              needsVerification: null,
              fromWebsite: true,
              scrapedData: scrapedData // Store for later use
            })
            
            // Show the FULL Deep Dive Calibration Report
            const calibrationReport = formatCalibrationReport(scrapedData)
            const reviewMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: calibrationReport,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, reviewMsg])
            setIsLoading(false)
            return
          } catch (error: any) {
            const errorMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: `Couldn't access that website (${error.message}). No problem at all! Let's build it together from scratch. It'll only take a minute.`,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
            
            // Proceed to Phase 0
            setOnboardingState({
              phase: 'discovery',
              subStep: 'business_type',
              archetype: null,
              data: {},
              needsVerification: null,
              fromWebsite: false
            })
            
            const discoveryMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "To kick things off, in a few words—what exactly does your business do?",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, discoveryMsg])
            setIsLoading(false)
            return
          }
        } else {
          // User said no website
          const noWebsiteMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "No problem at all! Let's build it together from scratch. It'll only take a minute.",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, noWebsiteMsg])
          
          // Proceed to Phase 0
          setOnboardingState({
            phase: 'discovery',
            subStep: 'business_type',
            archetype: null,
            data: {},
            needsVerification: null,
            fromWebsite: false
          })
          
          const discoveryMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "To kick things off, in a few words—what exactly does your business do?",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, discoveryMsg])
          setIsLoading(false)
          return
        }
      }

      // Phase 0: Discovery - Detect archetype (hidden, never revealed)
      if (phase === 'discovery' && subStep === 'business_type') {
        const detectedArchetype = detectArchetype(userMessage) || 'BrickAndMortar'
        
        setOnboardingState({
          phase: 'storefront',
          subStep: 'business_name',
          archetype: detectedArchetype as Archetype,
          data: { ...data, archetype: detectedArchetype as Archetype },
          needsVerification: null,
          fromWebsite: false
        })

        const archetypeMsg: Message = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: "Awesome. Let's get you set up. First, what is the official business name? (Check your spelling—I want to get it perfect!)",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, archetypeMsg])
        setIsLoading(false)
        return
      }

      // Phase 1: Storefront
      if (phase === 'storefront') {
        if (subStep === 'business_name') {
          const businessName = userMessage.trim()
          
          // Check if all lowercase - suggest capitalization
          if (businessName === businessName.toLowerCase() && businessName.length > 0 && !businessName.match(/^\d/)) {
            const capitalized = businessName.split(' ').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ')
            
            setOnboardingState({
              ...onboardingState,
              needsVerification: {
                field: 'business_name',
                value: businessName,
                suggestion: capitalized
              }
            })
            const verifyMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: `Should I capitalize that as "${capitalized}"?`,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, verifyMsg])
            setIsLoading(false)
            return
          }
          
          const validation = validateCriticalField('business_name', businessName)
          if (!validation.isValid && validation.suggestion) {
            setOnboardingState({
              ...onboardingState,
              needsVerification: {
                field: 'business_name',
                value: businessName,
                suggestion: validation.suggestion
              }
            })
            const verifyMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: `Just to be safe, did you mean "${validation.suggestion}"? I want to make sure I get the spelling perfect.`,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, verifyMsg])
            setIsLoading(false)
            return
          }
          
          const updatedData = {
            ...data,
            identity: {
              ...data.identity,
              business_name: validation.suggestion || businessName,
              phone: '',
              email: '',
              website: '',
              hours: '',
              address_or_area: ''
            } as BusinessProfileData['identity']
          }
          
          let nextQuestion = ''
          if (archetype === 'BrickAndMortar' || archetype === 'AppointmentPro') {
            nextQuestion = "Where are you located? I need the exact street address for the listing."
          } else {
            nextQuestion = "Since you travel to clients, which cities or neighborhoods do you cover?"
          }
          
          setOnboardingState({
            ...onboardingState,
            phase: 'storefront',
            subStep: 'location',
            data: updatedData
          })
          
          const locationMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: nextQuestion,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, locationMsg])
          setIsLoading(false)
          return
        }
        
        if (subStep === 'location') {
          const locationInput = userMessage.trim()
          
          // For Brick & Mortar and Appointment Pro, require full street address
          if (archetype === 'BrickAndMortar' || archetype === 'AppointmentPro') {
            // Check if it's just a city name (no numbers, no street name indicators)
            const hasNumber = /\d/.test(locationInput)
            const hasStreetIndicators = /\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl)\b/i.test(locationInput)
            
            if (!hasNumber || !hasStreetIndicators) {
              // It's likely just a city, ask for full address
              const updatedData = {
                ...data,
                identity: {
                  ...data.identity,
                  address_or_area: locationInput
                } as BusinessProfileData['identity']
              }
              
              setOnboardingState({
                ...onboardingState,
                phase: 'storefront',
                subStep: 'location_full',
                data: updatedData
              })
              
              const addressMsg: Message = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: `${locationInput} is the city, but I need the street and number too! For example: 123 Main St, ${locationInput}. What is the house/building number and street?`,
                timestamp: new Date()
              }
              setMessages(prev => [...prev, addressMsg])
              setIsLoading(false)
              return
            }
            
            // Check if we have state (flexible format detection)
            if (!hasStateInLocation(locationInput)) {
              // Has street but missing state
              const updatedData = {
                ...data,
                identity: {
                  ...data.identity,
                  address_or_area: locationInput
                } as BusinessProfileData['identity']
              }
              
              setOnboardingState({
                ...onboardingState,
                phase: 'storefront',
                subStep: 'location_state',
                data: updatedData
              })
              
              const stateMsg: Message = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: `Got the address. What state is that in?`,
                timestamp: new Date()
              }
              setMessages(prev => [...prev, stateMsg])
              setIsLoading(false)
              return
            }
          }
          
          const updatedData = {
            ...data,
            identity: {
              ...data.identity,
              address_or_area: locationInput
            } as BusinessProfileData['identity']
          }
          
          setOnboardingState({
            ...onboardingState,
            phase: 'storefront',
            subStep: 'phone_email',
            data: updatedData
          })
          
          const contactMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "What is the best phone number and email address for clients to reach you?",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, contactMsg])
          setIsLoading(false)
          return
        }
        
        if (subStep === 'location_full') {
          // User provided street address, combine with city
          const city = data.identity?.address_or_area || ''
          const streetAddress = userMessage.trim()
          const fullAddress = `${streetAddress}, ${city}`
          
          // Check if state is included (flexible format detection)
          if (!hasStateInLocation(fullAddress)) {
            const updatedData = {
              ...data,
              identity: {
                ...data.identity,
                address_or_area: fullAddress
              } as BusinessProfileData['identity']
            }
            
            setOnboardingState({
              ...onboardingState,
              phase: 'storefront',
              subStep: 'location_state',
              data: updatedData
            })
            
            const stateMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: `Perfect. What state is that in?`,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, stateMsg])
            setIsLoading(false)
            return
          }
          
          const updatedData = {
            ...data,
            identity: {
              ...data.identity,
              address_or_area: fullAddress
            } as BusinessProfileData['identity']
          }
          
          setOnboardingState({
            ...onboardingState,
            phase: 'storefront',
            subStep: 'phone_email',
            data: updatedData
          })
          
          const contactMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "What is the best phone number and email address for clients to reach you?",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, contactMsg])
          setIsLoading(false)
          return
        }
        
        if (subStep === 'location_state') {
          // Combine address with state
          const address = data.identity?.address_or_area || ''
          const state = userMessage.trim()
          const fullLocation = `${address}, ${state}`
          
          const updatedData = {
            ...data,
            identity: {
              ...data.identity,
              address_or_area: fullLocation
            } as BusinessProfileData['identity']
          }
          
          setOnboardingState({
            ...onboardingState,
            phase: 'storefront',
            subStep: 'phone_email',
            data: updatedData
          })
          
          const contactMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "What is the best phone number and email address for clients to reach you?",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, contactMsg])
          setIsLoading(false)
          return
        }
        
        if (subStep === 'phone_email') {
          // Try to extract phone and email from the response
          const phoneMatch = userMessage.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/)
          const emailMatch = userMessage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
          
          let phone = phoneMatch ? phoneMatch[0] : ''
          let email = emailMatch ? emailMatch[0] : ''
          
          // If we didn't find both, ask for the missing one
          if (!phone && !email) {
            // Neither found - ask them to provide both
            const errorMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "I need both a phone number and email address. Could you provide both? For example: '555-123-4567 and info@business.com'",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
            setIsLoading(false)
            return
          }
          
          if (!phone) {
            // Phone missing - ask for it
            const updatedData = {
              ...data,
              identity: {
                ...data.identity,
                email: email
              } as BusinessProfileData['identity']
            }
            setOnboardingState({
              ...onboardingState,
              phase: 'storefront',
              subStep: 'phone_only',
              data: updatedData
            })
            const phoneMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "Got the email. What is the main phone number for clients?",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, phoneMsg])
            setIsLoading(false)
            return
          }
          
          if (!email) {
            // Email missing - ask for it
            const phoneValidation = validateCriticalField('phone', phone)
            if (!phoneValidation.isValid) {
              setOnboardingState({
                ...onboardingState,
                needsVerification: {
                  field: 'phone',
                  value: phone,
                  suggestion: undefined
                }
              })
              const verifyMsg: Message = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: "That phone number looks a bit off. Could you double-check it?",
                timestamp: new Date()
              }
              setMessages(prev => [...prev, verifyMsg])
              setIsLoading(false)
              return
            }
            
            const updatedData = {
              ...data,
              identity: {
                ...data.identity,
                phone: phone
              } as BusinessProfileData['identity']
            }
            setOnboardingState({
              ...onboardingState,
              phase: 'storefront',
              subStep: 'email_only',
              data: updatedData
            })
            const emailMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "Got the phone number. What is the best email address for clients to reach you?",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, emailMsg])
            setIsLoading(false)
            return
          }
          
          // Both found - validate them
          const phoneValidation = validateCriticalField('phone', phone)
          if (!phoneValidation.isValid) {
            setOnboardingState({
              ...onboardingState,
              needsVerification: {
                field: 'phone',
                value: phone,
                suggestion: undefined
              }
            })
            const verifyMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "That phone number looks a bit off. Could you double-check it?",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, verifyMsg])
            setIsLoading(false)
            return
          }
          
          const emailValidation = validateCriticalField('email', email)
          if (!emailValidation.isValid) {
            if (emailValidation.suggestion) {
              setOnboardingState({
                ...onboardingState,
                needsVerification: {
                  field: 'email',
                  value: email,
                  suggestion: emailValidation.suggestion
                }
              })
              const verifyMsg: Message = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: `Just to be safe, did you mean ${emailValidation.suggestion}? I want to make sure clients can reach you.`,
                timestamp: new Date()
              }
              setMessages(prev => [...prev, verifyMsg])
              setIsLoading(false)
              return
            } else {
              const errorMsg: Message = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: "That email doesn't look quite right. Could you double-check it?",
                timestamp: new Date()
              }
              setMessages(prev => [...prev, errorMsg])
              setIsLoading(false)
              return
            }
          }
          
          const updatedData = {
            ...data,
            identity: {
              ...data.identity,
              phone: phone,
              email: email
            } as BusinessProfileData['identity']
          }
          
          setOnboardingState({
            ...onboardingState,
            phase: 'storefront',
            subStep: 'social_links',
            data: updatedData
          })
          
          const socialMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Do you have an Instagram, Facebook, or LinkedIn page set up yet? If so, paste the links here!",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, socialMsg])
          setIsLoading(false)
          return
        }
        
        if (subStep === 'phone_only') {
          const phone = userMessage.trim()
          const validation = validateCriticalField('phone', phone)
          if (!validation.isValid) {
            setOnboardingState({
              ...onboardingState,
              needsVerification: {
                field: 'phone',
                value: phone,
                suggestion: undefined
              }
            })
            const verifyMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "That phone number looks a bit off. Could you double-check it?",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, verifyMsg])
            setIsLoading(false)
            return
          }
          
          const updatedData = {
            ...data,
            identity: {
              ...data.identity,
              phone: phone
            } as BusinessProfileData['identity']
          }
          
          setOnboardingState({
            ...onboardingState,
            phase: 'storefront',
            subStep: 'social_links',
            data: updatedData
          })
          
          const socialMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Do you have an Instagram, Facebook, or LinkedIn page set up yet? If so, paste the links here!",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, socialMsg])
          setIsLoading(false)
          return
        }
        
        if (subStep === 'email_only') {
          const validation = validateCriticalField('email', userMessage)
          if (!validation.isValid) {
            if (validation.suggestion) {
              setOnboardingState({
                ...onboardingState,
                needsVerification: {
                  field: 'email',
                  value: userMessage,
                  suggestion: validation.suggestion
                }
              })
              const verifyMsg: Message = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: `Just to be safe, did you mean ${validation.suggestion}? I want to make sure clients can reach you.`,
                timestamp: new Date()
              }
              setMessages(prev => [...prev, verifyMsg])
              setIsLoading(false)
              return
            } else {
              const errorMsg: Message = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: "That email doesn't look quite right. Could you double-check it?",
                timestamp: new Date()
              }
              setMessages(prev => [...prev, errorMsg])
              setIsLoading(false)
              return
            }
          }
          
          const updatedData = {
            ...data,
            identity: {
              ...data.identity,
              email: userMessage.trim()
            } as BusinessProfileData['identity']
          }
          
          setOnboardingState({
            ...onboardingState,
            phase: 'storefront',
            subStep: 'social_links',
            data: updatedData
          })
          
          const socialMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Do you have an Instagram, Facebook, or LinkedIn page set up yet? If so, paste the links here!",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, socialMsg])
          setIsLoading(false)
          return
        }
        
        if (subStep === 'social_links') {
          // Extract URLs from the message
          const urlMatches = userMessage.match(/(https?:\/\/[^\s]+)/gi) || []
          const socialLinks = urlMatches.length > 0 ? urlMatches : 
            (userMessage.toLowerCase().includes('no') || userMessage.toLowerCase().includes('none') || userMessage.toLowerCase().includes("don't") ? [] : [userMessage.trim()])
          
          const updatedData = {
            ...data,
            identity: {
              ...data.identity,
              social_links: socialLinks
            } as BusinessProfileData['identity']
          }
          
          // Check for email typos before showing review
          if (updatedData.identity?.email) {
            const emailValidation = validateCriticalField('email', updatedData.identity.email)
            if (!emailValidation.isValid && emailValidation.suggestion) {
              setOnboardingState({
                ...onboardingState,
                needsVerification: {
                  field: 'email',
                  value: updatedData.identity.email,
                  suggestion: emailValidation.suggestion
                }
              })
              const verifyMsg: Message = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: `Just to be safe, did you mean ${emailValidation.suggestion}? I want to make sure clients can reach you.`,
                timestamp: new Date()
              }
              setMessages(prev => [...prev, verifyMsg])
              setIsLoading(false)
              return
            }
          }
          
          // Move to Review Phase (Typo Trap) - before continuing
          setOnboardingState({
            ...onboardingState,
            phase: 'proofread',
            subStep: 'review',
            data: updatedData,
            fromWebsite: false
          })
          
          const summary = formatProofreadSummary(updatedData, false)
          const reviewMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: summary,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, reviewMsg])
          setIsLoading(false)
          return
        }
      }

      // Phase 2: Menu
      if (phase === 'menu') {
        if (subStep === 'services') {
          const services = userMessage.split(/[,;]|and/).map(s => s.trim()).filter(s => s.length > 0).slice(0, 5)
          
          // Check for vague services like "consulting", "services", "help"
          const vagueServices = ['consulting', 'services', 'help', 'support', 'solutions', 'work', 'stuff']
          const isVague = services.some(s => vagueServices.includes(s.toLowerCase()))
          
          if (isVague || services.length === 0) {
            const clarifyMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "Nice! What specifically? Do you do financial consulting, IT, HR? Give me the top 3 specific services.",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, clarifyMsg])
            setIsLoading(false)
            return
          }
          
          const updatedData = {
            ...data,
            offering: {
              ...data.offering,
              core_services: services
            } as BusinessProfileData['offering']
          }
          
          setOnboardingState({
            ...onboardingState,
            phase: 'menu',
            subStep: 'target_audience',
            data: updatedData
          })
          
          const audienceMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Who is your 'Dream Client'? (e.g. Busy moms, Corporate Executives, Homeowners with pools).",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, audienceMsg])
          setIsLoading(false)
          return
        }
        
        if (subStep === 'target_audience') {
          const updatedData = {
            ...data,
            offering: {
              ...data.offering,
              target_audience: userMessage.trim()
            } as BusinessProfileData['offering']
          }
          
          setOnboardingState({
            ...onboardingState,
            phase: 'menu',
            subStep: 'owner_vibe',
            data: updatedData
          })
          
          const ownerVibeMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Who is the owner/lead expert? And how would you describe the 'vibe' of the business in 2 words? (e.g. Friendly & Casual, or High-End & Strict).",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, ownerVibeMsg])
          setIsLoading(false)
          return
        }
        
        if (subStep === 'owner_vibe') {
          // Try to extract owner name and vibe from response
          const parts = userMessage.split(/[,\-–—]/).map(s => s.trim())
          let ownerName = parts[0] || userMessage.trim()
          let vibe = parts.slice(1).join(' ').trim() || ''
          
          // If no separator, try to detect
          if (!vibe && parts.length === 1) {
            const words = userMessage.trim().split(/\s+/)
            if (words.length <= 3) {
              ownerName = userMessage.trim()
              vibe = ''
            } else {
              ownerName = words.slice(0, 2).join(' ')
              vibe = words.slice(2).join(' ')
            }
          }
          
          // Check if owner name is just first name
          const nameParts = ownerName.split(/\s+/)
          if (nameParts.length === 1 && ownerName.length < 15) {
            setOnboardingState({
              ...onboardingState,
              phase: 'menu',
              subStep: 'owner_vibe',
              data: {
                ...data,
                credibility: {
                  ...data.credibility,
                  owner_name: ownerName
                } as BusinessProfileData['credibility']
              }
            })
            const clarifyMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: `Hi ${ownerName}! Do you have a last name you want listed on the official profile?`,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, clarifyMsg])
            setIsLoading(false)
            return
          }
          
          // If vibe is missing, ask for it
          if (!vibe || vibe.length < 3) {
            const updatedData = {
              ...data,
              credibility: {
                ...data.credibility,
                owner_name: ownerName
              } as BusinessProfileData['credibility']
            }
            setOnboardingState({
              ...onboardingState,
              phase: 'menu',
              subStep: 'vibe_only',
              data: updatedData
            })
            const vibeMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "Got the owner name. How would you describe the 'vibe' of the business in 2 words? (e.g. Friendly & Casual, or High-End & Strict).",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, vibeMsg])
            setIsLoading(false)
            return
          }
          
          const updatedData = {
            ...data,
            credibility: {
              ...data.credibility,
              owner_name: ownerName
            } as BusinessProfileData['credibility'],
            offering: {
              ...data.offering,
              vibe_mission: vibe
            } as BusinessProfileData['offering']
          }
          
          // Move to Final Review
          setOnboardingState({
            ...onboardingState,
            phase: 'proofread',
            subStep: 'final_review',
            data: updatedData,
            fromWebsite: false
          })
          
          const summary = formatProofreadSummary(updatedData, false)
          const reviewMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: summary,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, reviewMsg])
          setIsLoading(false)
          return
        }
        
        if (subStep === 'vibe_only') {
          const updatedData = {
            ...data,
            offering: {
              ...data.offering,
              vibe_mission: userMessage.trim()
            } as BusinessProfileData['offering']
          }
          
          // Move to Final Review
          setOnboardingState({
            ...onboardingState,
            phase: 'proofread',
            subStep: 'final_review',
            data: updatedData,
            fromWebsite: false
          })
          
          const summary = formatProofreadSummary(updatedData, false)
          const reviewMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: summary,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, reviewMsg])
          setIsLoading(false)
          return
        }
      }

      // Phase 3: Locals (after review)
      if (phase === 'locals') {
        if (subStep === 'owner_name') {
          const ownerName = userMessage.trim()
          
          // Check if it's just a first name (single word, common first name pattern)
          const nameParts = ownerName.split(/\s+/)
          if (nameParts.length === 1 && ownerName.length < 15) {
            const clarifyMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: `Hi ${ownerName}! Do you have a last name you want listed on the official profile?`,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, clarifyMsg])
            setIsLoading(false)
            return
          }
          
          const updatedData = {
            ...data,
            credibility: {
              ...data.credibility,
              owner_name: ownerName,
              owner_bio: '',
              credentials: [],
              years_in_business: ''
            } as BusinessProfileData['credibility']
          }
          
          setOnboardingState({
            ...onboardingState,
            phase: 'locals',
            subStep: 'credentials',
            data: updatedData
          })
          
          const credMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Are there specific Licenses, Certifications, or Degrees we should highlight? Or maybe just how long you've been serving the community?",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, credMsg])
          setIsLoading(false)
          return
        }
        
        if (subStep === 'credentials') {
          // Extract credentials and years
          const credentials: string[] = []
          const yearsMatch = userMessage.match(/(\d+)\s*(years?|yrs?)/i)
          const years = yearsMatch ? yearsMatch[0] : ''
          
          // Look for common credential keywords
          if (userMessage.toLowerCase().includes('license') || userMessage.toLowerCase().includes('licensed')) {
            credentials.push('Licensed')
          }
          if (userMessage.toLowerCase().includes('certified') || userMessage.toLowerCase().includes('certification')) {
            credentials.push('Certified')
          }
          if (userMessage.toLowerCase().includes('degree') || userMessage.toLowerCase().includes('bachelor') || userMessage.toLowerCase().includes('master')) {
            credentials.push('Degreed')
          }
          
          const updatedData = {
            ...data,
            credibility: {
              ...data.credibility,
              credentials: credentials.length > 0 ? credentials : [userMessage.trim()],
              years_in_business: years
            } as BusinessProfileData['credibility']
          }
          
          // Move to Phase 4: Counter
          setOnboardingState({
            ...onboardingState,
            phase: 'counter',
            subStep: 'payment',
            data: updatedData
          })
          
          const paymentMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Last few details. How does payment work? Do you take Insurance, Credit Cards, Cash, or Venmo?",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, paymentMsg])
          setIsLoading(false)
          return
        }
      }

      // Phase 4: Counter
      if (phase === 'counter') {
        if (subStep === 'payment') {
          const paymentMethods: string[] = []
          const lower = userMessage.toLowerCase()
          if (lower.includes('insurance')) paymentMethods.push('Insurance')
          if (lower.includes('credit') || lower.includes('card')) paymentMethods.push('Credit Cards')
          if (lower.includes('cash')) paymentMethods.push('Cash')
          if (lower.includes('venmo') || lower.includes('zelle') || lower.includes('paypal')) paymentMethods.push('Venmo/Zelle/PayPal')
          
          const insuranceAccepted = lower.includes('insurance')
          
          const updatedData = {
            ...data,
            logistics: {
              ...data.logistics,
              payment_methods: paymentMethods.length > 0 ? paymentMethods : [userMessage.trim()],
              insurance_accepted: insuranceAccepted,
              booking_policy: '',
              specific_policy: ''
            } as BusinessProfileData['logistics']
          }
          
          let nextQuestion = ''
          if (archetype === 'BrickAndMortar') {
            nextQuestion = "Do people need reservations or can they just walk in?"
          } else if (archetype === 'ServiceOnWheels') {
            nextQuestion = "Do you charge a trip fee or estimate fee?"
          } else {
            nextQuestion = "Do you require a deposit to book, and do you have a specific cancellation policy?"
          }
          
          setOnboardingState({
            ...onboardingState,
            phase: 'counter',
            subStep: 'policy',
            data: updatedData
          })
          
          const policyMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: nextQuestion,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, policyMsg])
          setIsLoading(false)
          return
        }
        
        if (subStep === 'policy') {
          const updatedData = {
            ...data,
            logistics: {
              ...data.logistics,
              booking_policy: archetype === 'BrickAndMortar' ? userMessage.trim() : '',
              specific_policy: userMessage.trim()
            } as BusinessProfileData['logistics']
          }
          
          // Move to Final Proofread
          setOnboardingState({
            ...onboardingState,
            phase: 'proofread',
            subStep: 'final_review',
            data: updatedData
          })
          
          const summary = formatProofreadSummary(updatedData)
          const proofreadMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: summary,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, proofreadMsg])
          setIsLoading(false)
          return
        }
      }

      // Phase 3: Proofread (Review after Storefront)
      if (phase === 'proofread' && subStep === 'review') {
        // Check for confirmation patterns (including "its good", "it's good", "is good", etc.)
        const isConfirmed = lowerMessage === 'yes' || lowerMessage === 'y' || lowerMessage === 'correct' || 
                           lowerMessage.includes('looks good') || lowerMessage.includes('perfect') ||
                           lowerMessage.includes("it's good") || lowerMessage.includes('its good') ||
                           lowerMessage.includes('is good') || lowerMessage.includes('all good') ||
                           lowerMessage.includes('sounds good') || lowerMessage === 'ok' || lowerMessage === 'okay'
        
        if (isConfirmed) {
          // If from website scraping, show the 5 website models
          if (onboardingState.fromWebsite && onboardingState.scrapedData) {
            setOnboardingState({
              ...onboardingState,
              phase: 'website_models',
              subStep: 'select_model'
            })
            
            // Generate and show the 5 website models
            const modelsShowcase = generateWebsiteModelsShowcase(onboardingState.scrapedData, data)
            const modelsMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: modelsShowcase,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, modelsMsg])
            setIsLoading(false)
            return
          }
          
          // Manual entry flow - continue to Menu phase
          setOnboardingState({
            ...onboardingState,
            phase: 'menu',
            subStep: 'services',
            data: data
          })
          
          const servicesMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "What are the top 3 services you offer? Be specific so people find you on Google.",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, servicesMsg])
          setIsLoading(false)
          return
        } else {
          // User wants to make corrections
          const correctionMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Sure thing! What should I change? Just tell me what's off and what it should be instead.",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, correctionMsg])
        }
        setIsLoading(false)
        return
      }
      
      // Website Models Selection Phase
      if (phase === 'website_models' && subStep === 'select_model') {
        // Check for model selection (1-5)
        const modelMatch = userMessage.match(/^[1-5]$/) || userMessage.match(/option\s*([1-5])/i) || userMessage.match(/model\s*([1-5])/i)
        
        if (modelMatch) {
          const modelNumber = parseInt(modelMatch[1] || modelMatch[0])
          const modelNames: { [key: number]: WebsiteModel } = {
            1: 'brand_authority',
            2: 'direct_response',
            3: 'education_first',
            4: 'hybrid_commerce',
            5: 'community_pillar'
          }
          const modelLabels: { [key: number]: string } = {
            1: '💎 Brand Authority',
            2: '⚡ Direct Response',
            3: '🎓 Education First',
            4: '🛒 Hybrid Commerce',
            5: '🏘️ Community Pillar'
          }
          
          const selectedModel = modelNames[modelNumber]
          
          // Save the profile with selected model
          try {
            await saveProfile(data as BusinessProfileData)
            
            setOnboardingState({
              ...onboardingState,
              phase: 'complete',
              subStep: 'done',
              selectedModel: selectedModel
            })
            
            setIsComplete(true)
            
            const completeMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: `**Excellent choice!** You selected the **${modelLabels[modelNumber]}** model.\n\n🚀 I'm now generating your custom website based on this strategy and your business profile...\n\n*Head to the **Website** tab in the sidebar to see your new site and make any adjustments!*`,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, completeMsg])
            
            // Redirect to website builder after a moment
            setTimeout(() => {
              router.push('/dashboard/website')
            }, 2000)
            
          } catch (error: any) {
            const errorMsg: Message = {
              id: `error_${Date.now()}`,
              role: 'assistant',
              content: `Oops, hit a snag: ${error?.message || 'Failed to save profile'}. Let me try that again.`,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
          }
          setIsLoading(false)
          return
        } else {
          // Invalid selection
          const retryMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Please reply with a number **1-5** to select your website model:\n\n1 = 💎 Brand Authority\n2 = ⚡ Direct Response\n3 = 🎓 Education First\n4 = 🛒 Hybrid Commerce\n5 = 🏘️ Community Pillar",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, retryMsg])
          setIsLoading(false)
          return
        }
      }
      
      // Final Proofread (after all phases)
      if (phase === 'proofread' && subStep === 'final_review') {
        // Check for confirmation patterns (including "its good", "it's good", "is good", etc.)
        const isConfirmed = lowerMessage === 'yes' || lowerMessage === 'y' || lowerMessage === 'correct' || 
                           lowerMessage.includes('looks good') || lowerMessage.includes('perfect') ||
                           lowerMessage.includes("it's good") || lowerMessage.includes('its good') ||
                           lowerMessage.includes('is good') || lowerMessage.includes('all good') ||
                           lowerMessage.includes('sounds good') || lowerMessage === 'ok' || lowerMessage === 'okay'
        
        if (isConfirmed) {
          // User confirmed - save the profile
          try {
            await saveProfile(data as BusinessProfileData)
            setIsComplete(true)
            
            const completeMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "Awesome! I'm setting everything up for you now. This'll just take a second.",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, completeMsg])

            setTimeout(() => {
              router.push('/dashboard')
            }, 1000)
          } catch (error: any) {
            const errorMsg: Message = {
              id: `error_${Date.now()}`,
              role: 'assistant',
              content: `Oops, hit a snag: ${error?.message || 'Failed to save profile'}. Let me try that again.`,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
          }
        } else {
          // User wants to make corrections
          const correctionMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Sure thing! What should I change? Just tell me what's off and what it should be instead.",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, correctionMsg])
        }
        setIsLoading(false)
        return
      }

    } catch (error) {
      console.error('Error processing onboarding:', error)
      const errorMsg: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: "Hmm, something went sideways there. Let me ask that again.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }


  // Save profile to backend
  const saveProfile = async (data: BusinessProfileData) => {
    try {
      // Convert to the format expected by the API
      const profileData = {
        businessName: data.identity.business_name,
        industry: data.offering.core_services.join(', '), // Use services as industry for now
        location: {
          address: data.identity.address_or_area,
          city: '',
          state: '',
          zipCode: '',
          country: 'US'
        },
        contactInfo: {
          phone: data.identity.phone,
          email: data.identity.email,
          website: data.identity.website
        },
        services: data.offering.core_services.map(s => ({ name: s, description: '' })),
        hours: [],
        brandVoice: 'professional' as const,
        targetAudience: data.offering.target_audience,
        customAttributes: [
          { label: 'Archetype', value: data.archetype || '' },
          { label: 'Owner', value: data.credibility.owner_name },
          { label: 'Payment Methods', value: data.logistics.payment_methods.join(', ') },
          { label: 'Booking Policy', value: data.logistics.booking_policy || data.logistics.specific_policy }
        ]
      }

      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          profileData
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to save profile (${response.status})`)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      throw error
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSend(inputValue)
  }

  return (
    <div className={`onboarding-chat flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-800 shadow-sm border border-gray-200'
              }`}
            >
              <p className="text-base whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
              <p className="text-gray-600">Navi AI is thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white px-4 sm:px-6 py-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your answer..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading || isComplete}
          />
          <button
            type="submit"
            disabled={isLoading || isComplete || !inputValue.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
