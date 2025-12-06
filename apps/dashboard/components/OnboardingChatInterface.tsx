/**
 * Onboarding Chat Interface Component
 * Conversational SMB Profile Creator
 * Replaces forms with a friendly, podcast-style interview
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import ReactMarkdown from 'react-markdown'

interface OnboardingChatInterfaceProps {
  userId: string
  className?: string
}

interface MessageAction {
  label: string
  value: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  actions?: MessageAction[] // Optional action buttons
  actionClicked?: string // Track which action was clicked (to hide buttons)
  isProfileReport?: boolean // Flag to indicate this is a full profile report (markdown)
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

interface OnboardingState {
  phase: 'website_check' | 'discovery' | 'storefront' | 'menu' | 'locals' | 'counter' | 'proofread' | 'complete'
  subStep: string
  archetype: Archetype
  data: Partial<BusinessProfileData>
  needsVerification: {
    field?: string
    value?: string
    suggestion?: string
  } | null
  fromWebsite: boolean
  lastWebsiteUrl?: string | null
  missing_data_report?: string[]
  lastQuestionAsked?: string // Track last question to prevent loops
  questionRepeatCount?: number // Track how many times same question was asked
  scrapedWebsiteData?: any // Store original scraped data for suggestions
  lockedFields?: Set<string> // Fields that are verified and should NOT be asked about again
  awaitingCorrectionFor?: 'email' | 'phone' | null // Track when we're waiting for a field value after fallback
  deepProfile?: {
    brand: { name: string; archetype: string; tone: string; uvp: string }
    contact_info?: { phone: string; email: string; address: string }
    local_context?: { primary_city: string; service_radius: string[]; region: string }
    commercial: { pricing_tier: string; friction_score: string; friction_notes?: string; top_3_services?: string[] }
    growth_plan: Array<{ step: number; timeline: string; phase: string; action?: string; action_title?: string; description?: string; impact: string }>
  } | null
  module_config?: {
    brand: { name: string; archetype: string; colors: string[] }
    website_builder: { hero_headline: string; subheadline: string; services_list: string[] }
    blog_engine: { content_pillars: string[]; local_keywords: string[] }
    crm_data: { email: string; phone: string; address: string }
  } | null
}

export default function OnboardingChatInterface({ userId, className = '' }: OnboardingChatInterfaceProps) {
  const router = useRouter()
  
  // Initialize Supabase client for client-side use with cookie support
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key'
  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
  
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    phase: 'website_check',
    subStep: 'has_website',
    archetype: null,
    data: {},
    needsVerification: null,
    fromWebsite: false,
    lastWebsiteUrl: null,
    missing_data_report: [],
    lastQuestionAsked: '',
    questionRepeatCount: 0,
    scrapedWebsiteData: undefined,
    lockedFields: new Set<string>(),
    awaitingCorrectionFor: null,
    deepProfile: null,
    module_config: null
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
      const invalidTlds = ['.vom', '.con', '.cmo', '.ocm', '.cm', '.co', '.coom', '.comm', '.c0m', '.comn']
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

  // Format proofread summary
  /**
   * Detects if user input looks like a valid answer (not a question)
   * Returns true if it seems like an answer, false if it's unclear
   */
  const looksLikeValidAnswer = (userMessage: string, currentSubStep: string): boolean => {
    const lower = userMessage.toLowerCase().trim()
    
    // Very short responses are likely answers (unless they're questions)
    if (userMessage.length < 3) return false
    
    // Check for common answer patterns
    const answerPatterns: RegExp[] = [
      /^\d+/, // Starts with number (phone, address, etc.)
      /@/, // Contains @ (email)
      /^[a-z]+\s+[a-z]+/i, // Two words (likely name or address)
      /(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|way|court|ct|lane|ln)/i, // Address keywords
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|am|pm|\d{1,2}:\d{2})/i, // Hours keywords
      /(cash|credit|card|venmo|paypal|insurance|check)/i, // Payment keywords
      /(instagram|facebook|linkedin|twitter|\.com|\.org)/i // Social media keywords
    ]
    
    // Check for single word that's not too short/long (likely a name or answer)
    if (/^[a-z]+$/i.test(userMessage) && userMessage.length > 2 && userMessage.length < 20) {
      return true
    }
    
    // If it matches answer patterns, it's likely an answer
    if (answerPatterns.some(pattern => pattern.test(userMessage))) {
      return true
    }
    
    // If it doesn't end with ? and is not a question word, likely an answer
    if (!lower.endsWith('?') && !/^(what|how|why|where|when|who|which|can|could|would|do|does|is|are|will)\b/i.test(lower)) {
      return true
    }
    
    return false
  }

  /**
   * Extract entity from correction message - "Customer is Always Right" approach
   * Ignores surrounding words like "no it is", "actually", etc. and extracts the actual entity
   */
  const extractEntityFromCorrection = (userMessage: string, fieldType: 'email' | 'phone' | 'address'): string | null => {
    if (fieldType === 'email') {
      // Extract email - look for email pattern, ignore surrounding words
      const emailMatch = userMessage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
      return emailMatch ? emailMatch[0] : null
    } else if (fieldType === 'phone') {
      // Extract phone - look for phone pattern
      const phoneMatch = userMessage.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/)
      return phoneMatch ? phoneMatch[0] : null
    } else if (fieldType === 'address') {
      // Extract address - look for street address patterns
      const addressPatterns = [
        /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)[^,]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}/i,
        /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)[^,]*,\s*[A-Za-z\s]+/i
      ]
      for (const pattern of addressPatterns) {
        const addressMatch = userMessage.match(pattern)
        if (addressMatch) return addressMatch[0].trim()
      }
      return null
    }
    return null
  }

  /**
   * Check if a field is locked (verified and should not be asked about again)
   */
  const isFieldLocked = (field: string, lockedFields?: Set<string>): boolean => {
    return lockedFields ? lockedFields.has(field) : false
  }

  /**
   * Lock a field (mark as verified)
   */
  const lockField = (field: string, lockedFields: Set<string>): Set<string> => {
    const newSet = new Set(lockedFields)
    newSet.add(field)
    return newSet
  }

  /**
   * Validate address components with sanity checks
   */
  const validateAddressComponent = (
    input: string,
    component: 'city' | 'state' | 'zip' | 'full'
  ): { isValid: boolean; error?: string } => {
    const trimmed = input.trim()
    
    if (component === 'city') {
      // City must contain letters (cannot be purely numeric)
      if (/^\d+$/.test(trimmed)) {
        return {
          isValid: false,
          error: "That looks like a number, but I need the full address including the City name (e.g., 'Los Altos' or 'San Francisco')."
        }
      }
      // City must contain at least one letter
      if (!/[a-zA-Z]/.test(trimmed)) {
        return {
          isValid: false,
          error: "A city name must contain letters. Please provide the city name (e.g., 'Los Altos' or 'San Francisco')."
        }
      }
      return { isValid: true }
    }
    
    if (component === 'state') {
      // State cannot be purely numeric
      if (/^\d+$/.test(trimmed)) {
        return {
          isValid: false,
          error: "State cannot be a number. Please provide the state name or abbreviation (e.g., 'CA' or 'California')."
        }
      }
      // State should not be longer than 20 characters
      if (trimmed.length > 20) {
        return {
          isValid: false,
          error: "State name seems too long. Please provide the state abbreviation (e.g., 'CA') or full name."
        }
      }
      return { isValid: true }
    }
    
    if (component === 'zip') {
      // Zip code must be 5-9 digits
      const zipRegex = /^\d{5}(-\d{4})?$/
      if (!zipRegex.test(trimmed)) {
        return {
          isValid: false,
          error: "Zip code must be 5 digits (or 9 digits with dash, e.g., '12345' or '12345-6789')."
        }
      }
      return { isValid: true }
    }
    
    if (component === 'full') {
      // Check if input is purely numeric (like "982")
      if (/^\d+$/.test(trimmed)) {
        return {
          isValid: false,
          error: "That looks like a number, but I need the full address including the City name (e.g., '123 Main St, Los Altos, CA')."
        }
      }
      // Check if it looks like just a zip code
      if (/^\d{5}(-\d{4})?$/.test(trimmed)) {
        return {
          isValid: false,
          error: "That looks like a zip code. I need the full address including street, city, and state."
        }
      }
      return { isValid: true }
    }
    
    return { isValid: true }
  }

  /**
   * Determine the next missing field and question after a successful update
   * Returns next step info or completion message if all fields are complete
   */
  const determineNextMissingField = (
    currentData: Partial<BusinessProfileData>,
    currentPhase: string,
    currentSubStep: string,
    currentArchetype: Archetype,
    currentLockedFields: Set<string>
  ): { nextSubStep?: string; nextPhase?: string; nextQuestion: string; fieldName?: string; isComplete?: boolean } | null => {
    const missingFields: string[] = []
    
    // Check what's missing in storefront phase
    if (currentPhase === 'storefront') {
      if (!currentData.identity?.email && !isFieldLocked('email', currentLockedFields)) {
        missingFields.push('email address')
      }
      if (!currentData.identity?.phone && !isFieldLocked('phone', currentLockedFields)) {
        missingFields.push('phone number')
      }
      if (!currentData.identity?.address_or_area && 
          (currentArchetype === 'BrickAndMortar' || currentArchetype === 'AppointmentPro') &&
          !isFieldLocked('address', currentLockedFields)) {
        missingFields.push('physical address')
      }
      
      if (missingFields.length > 0) {
        // Determine which field to ask for next (prioritize based on what's missing)
        if (missingFields.includes('email address') && !currentData.identity?.phone && !isFieldLocked('phone', currentLockedFields)) {
          return {
            nextSubStep: 'phone_email',
            nextQuestion: "What is the best phone number and email address for clients to reach you?",
            fieldName: 'phone number and email address'
          }
        } else if (missingFields.includes('phone number') && !currentData.identity?.email && !isFieldLocked('email', currentLockedFields)) {
          return {
            nextSubStep: 'phone_email',
            nextQuestion: "What is the best phone number and email address for clients to reach you?",
            fieldName: 'phone number and email address'
          }
        } else if (missingFields.includes('phone number')) {
          return {
            nextSubStep: 'phone_only',
            nextQuestion: "What is the main phone number for clients?",
            fieldName: 'phone number'
          }
        } else if (missingFields.includes('email address')) {
          return {
            nextSubStep: 'email_only',
            nextQuestion: "What is the best email address for clients to reach you?",
            fieldName: 'email address'
          }
        } else if (missingFields.includes('physical address')) {
          let addressQuestion = ''
          if (currentArchetype === 'BrickAndMortar') {
            addressQuestion = "And where is the shop located? (Address)"
          } else if (currentArchetype === 'ServiceOnWheels') {
            addressQuestion = "And what cities or areas do you travel to?"
          } else {
            addressQuestion = "And where is your studio/office located?"
          }
          return {
            nextSubStep: 'location',
            nextQuestion: addressQuestion,
            fieldName: 'physical address'
          }
        }
      } else {
        // All storefront fields complete - move to menu phase
        if (!currentData.offering?.core_services?.length) {
          return {
            nextPhase: 'menu',
            nextSubStep: 'services',
            nextQuestion: "What are the top 3 services you offer? Be specific so people find you on Google.",
            fieldName: 'services'
          }
        }
      }
    }
    
    // Check what's missing in menu phase
    if (currentPhase === 'menu') {
      if (!currentData.offering?.core_services?.length) {
        return {
          nextSubStep: 'services',
          nextQuestion: "What are the top 3 services you offer? Be specific so people find you on Google.",
          fieldName: 'services'
        }
      } else {
        // All menu fields complete - check if we need to move to next phase
        // For now, if all critical fields are present, show completion message
        const hasBasicInfo = currentData.identity?.business_name && 
                            currentData.identity?.phone && 
                            currentData.identity?.email &&
                            currentData.offering?.core_services?.length
        if (hasBasicInfo) {
          return {
            isComplete: true,
            nextQuestion: "Everything looks good! Shall we continue to create your detailed profile?"
          }
        }
      }
    }
    
    // Check what's missing in locals phase
    if (currentPhase === 'locals') {
      if (!currentData.credibility?.owner_name) {
        return {
          nextSubStep: 'owner_name',
          nextQuestion: "Who is the owner or lead expert here? (Please check the spelling of the name closely).",
          fieldName: 'owner name'
        }
      }
    }
    
    // Check what's missing in counter phase
    if (currentPhase === 'counter') {
      if (!currentData.logistics?.payment_methods?.length) {
        return {
          nextSubStep: 'payment',
          nextQuestion: "How does payment work? Do you take Insurance, Credit Cards, Cash, or Venmo?",
          fieldName: 'payment methods'
        }
      }
    }
    
    // If we're in proofread phase, check if all required fields are present
    if (currentPhase === 'proofread') {
      // Required fields: business_name, phone, email, core_services
      const hasRequiredFields = currentData.identity?.business_name && 
                                currentData.identity?.phone && 
                                currentData.identity?.email &&
                                currentData.offering?.core_services?.length
      
      if (!hasRequiredFields) {
        // Find which required field is missing
        if (!currentData.identity?.business_name) {
          return {
            nextPhase: 'storefront',
            nextSubStep: 'business_name',
            nextQuestion: "What is the official Business Name? (Please double-check the spelling/spacing so I get it right!)",
            fieldName: 'business name'
          }
        }
        if (!currentData.identity?.phone) {
          return {
            nextPhase: 'storefront',
            nextSubStep: 'phone_email',
            nextQuestion: "What is the best phone number and email address for clients to reach you?",
            fieldName: 'phone number'
          }
        }
        if (!currentData.identity?.email) {
          return {
            nextPhase: 'storefront',
            nextSubStep: 'phone_email',
            nextQuestion: "What is the best phone number and email address for clients to reach you?",
            fieldName: 'email address'
          }
        }
        if (!currentData.offering?.core_services?.length) {
          return {
            nextPhase: 'menu',
            nextSubStep: 'services',
            nextQuestion: "What are the top 3 services you offer? Be specific so people find you on Google.",
            fieldName: 'services'
          }
        }
      }
    }
    
    // If we're in other phases or all critical info is collected, show completion
    const hasBasicInfo = currentData.identity?.business_name && 
                        currentData.identity?.phone && 
                        currentData.identity?.email &&
                        currentData.offering?.core_services?.length
    if (hasBasicInfo && (currentPhase === 'locals' || currentPhase === 'counter' || currentPhase === 'proofread')) {
      return {
        isComplete: true,
        nextQuestion: "Everything looks good! Shall we continue to create your detailed profile?"
      }
    }
    
    return null // No clear next step
  }

  /**
   * Slot Filling: Extract entities (phone, email, address, services) from user input
   * Returns what was found and what's still missing
   */
  interface ExtractedEntities {
    email?: string
    phone?: string
    address?: string
    services?: string[]
    updated: boolean // Whether any entities were found
  }

  const extractEntities = (userMessage: string, currentData: Partial<BusinessProfileData>): ExtractedEntities => {
    const extracted: ExtractedEntities = { updated: false }
    
    // Extract email (robust enough to catch emails embedded in sentences)
    // Examples it should catch:
    // - "email should be test@example.com"
    // - "my email is test@example.com, thanks"
    // - "change it to test@example.com"
    const emailMatch = userMessage.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i)
    if (emailMatch && !currentData.identity?.email) {
      const email = emailMatch[0]
      const validation = validateCriticalField('email', email)
      extracted.email = validation.suggestion || email
      extracted.updated = true
    }
    
    // Extract phone
    const phoneMatch = userMessage.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/)
    if (phoneMatch && !currentData.identity?.phone) {
      const phone = phoneMatch[0]
      const validation = validateCriticalField('phone', phone)
      if (validation.isValid) {
        extracted.phone = phone
        extracted.updated = true
      }
    }
    
    // Extract address (look for street address patterns)
    const addressPatterns = [
      /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)[^,]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}/i,
      /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)[^,]*,\s*[A-Za-z\s]+/i
    ]
    
    for (const pattern of addressPatterns) {
      const addressMatch = userMessage.match(pattern)
      if (addressMatch && !currentData.identity?.address_or_area) {
        const address = addressMatch[0].trim()
        // Validate the extracted address
        const validation = validateAddressComponent(address, 'full')
        if (validation.isValid) {
          extracted.address = address
          extracted.updated = true
          break
        }
        // If validation fails, don't extract (will trigger clarification)
      }
    }
    
    // Extract services (if in menu phase or if message contains service-like patterns)
    const serviceKeywords = userMessage.split(/[,;]|and/).map(s => s.trim()).filter(s => {
      const lower = s.toLowerCase()
      // Filter out common non-service words
      return s.length > 2 && 
             !['the', 'is', 'are', 'and', 'or', 'for', 'with', 'here', 'my'].includes(lower) &&
             !lower.match(/^(email|phone|address|name)$/i)
    })
    
    if (serviceKeywords.length > 0 && serviceKeywords.length <= 5) {
      // Check if these look like services (not too vague)
      const vagueServices = ['consulting', 'services', 'help', 'support', 'solutions', 'work', 'stuff']
      const isVague = serviceKeywords.some(s => vagueServices.includes(s.toLowerCase()))
      
      if (!isVague && !currentData.offering?.core_services?.length) {
        extracted.services = serviceKeywords
        extracted.updated = true
      }
    }
    
    return extracted
  }

  /**
   * Intent Classification: Categorizes user input into ANSWER, CORRECTION, CONFIRMATION, or OFF_TOPIC
   * 
   * SYSTEM RULE: You are a focused Business Profile Assistant. Your ONLY goal is to complete the profile.
   * Prioritize accuracy over speed. If the user corrects you, handle it immediately and stay on the current step.
   * Politely refuse off-topic requests and redirect back to profile completion.
   */
  type UserIntent = 'ANSWER' | 'CORRECTION' | 'CONFIRMATION' | 'OFF_TOPIC' | 'CLARIFICATION'

  const classifyUserIntent = (userMessage: string, currentPhase: string, currentSubStep: string): UserIntent => {
    const lower = userMessage.toLowerCase().trim()
    
    // CONFIRMATION patterns - user is confirming/approving (check this FIRST, before correction)
    // Use loose matching to catch typos like "loooks goood"
    
    // Normalize for typo tolerance: remove extra repeated letters (e.g., "loooks" -> "looks", "goood" -> "good")
    const normalized = lower.replace(/(.)\1{2,}/g, '$1$1') // "loooks goood" -> "looks good"
    
    const confirmationPatterns = [
      /(looks?\s+good|looks?\s+goo+d|looks?\s+perfec+t|looks?\s+great|looks?\s+fine)/i, // "looks good", "loooks goood", "looks perfect"
      /(it'?s\s+good|its\s+good|is\s+good|all\s+good|sounds?\s+good)/i, // "it's good", "its good", "is good", "all good", "sounds good"
      /^(perfect|great|fine|excellent|awesome|good|ok|okay|yes|y|correct|right|all\s+set|done|complete)$/i, // Single word confirmations
      /(no\s+changes?|nothing\s+to\s+change|no\s+corrections?|it'?s\s+correct|is\s+correct|that'?s\s+correct)/i, // "no changes", "nothing to change", "it's correct"
      /(everything'?s?\s+good|everything\s+looks?\s+good|all\s+set|all\s+good|sounds?\s+good)/i, // "everything's good", "all set"
      /(proceed|continue|go\s+ahead|let'?s\s+go|ready)/i // Action confirmations
    ]
    
    // Test both original and normalized message
    if (confirmationPatterns.some(pattern => pattern.test(userMessage) || pattern.test(normalized))) {
      return 'CONFIRMATION'
    }
    
    // CORRECTION patterns - user is correcting something (check AFTER confirmation)
    const correctionPatterns = [
      /(that's not|that is not|that's wrong|that is wrong|that's incorrect|that is incorrect|that's not right)/i,
      /(not.*service|not.*address|not.*phone|not.*email|not.*name|not.*correct|wrong.*service|wrong.*address|wrong.*phone|wrong.*email)/i,
      /(remove|delete|take out|get rid of|don't include|don't want|exclude)/i,
      /(change|update|fix|correct|edit|modify).*(service|address|phone|email|name|location)/i,
      /(no,|nope,|actually,|wait,|hold on).*(that|it|this)/i,
      /(that|this|it).*(is not|isn't|is wrong|is incorrect)/i
    ]
    
    if (correctionPatterns.some(pattern => pattern.test(userMessage))) {
      return 'CORRECTION'
    }
    
    // OFF_TOPIC patterns - unrelated questions
    const offTopicPatterns = [
      /(weather|temperature|rain|snow|forecast)/i,
      /(write.*poem|create.*story|generate.*code|write.*code|make.*song|compose)/i,
      /(what.*time|what.*date|when.*today|how.*old|what.*day)/i,
      /(joke|funny|entertain|play.*game|tell.*joke)/i,
      /(tell me about (?!your|the business|your company|your service))/i,
      /(how.*are you|what.*up|what.*doing)/i
    ]
    
    if (offTopicPatterns.some(pattern => pattern.test(userMessage))) {
      return 'OFF_TOPIC'
    }
    
    // CLARIFICATION patterns - asking for help/clarification
    const clarificationPatterns = [
      /^(what|how|why|where|when|who|which|can you|could you|would you|do you|is|are|does|will)\b/i,
      /\?$/,
      /(explain|tell me|help me|i don't|i do not|i'm not|i am not|not sure|unsure|confused|what do you mean)/i
    ]
    
    if (clarificationPatterns.some(pattern => pattern.test(userMessage))) {
      return 'CLARIFICATION'
    }
    
    // Default to ANSWER if none of the above match
    return 'ANSWER'
  }

  /**
   * Detects if user input is a clarification question vs an answer
   * Returns null if it's an answer, or a helpful response if it's a question
   */
  const detectClarificationQuestion = (userMessage: string, currentPhase: string, currentSubStep: string): string | null => {
    const lower = userMessage.toLowerCase().trim()
    
    // Question patterns
    const questionPatterns = [
      /^(what|how|why|where|when|who|which|can you|could you|would you|do you|is|are|does|will)\b/i,
      /\?$/,
      /^(what's|what is|how do|how does|how can|why do|why does|where is|where are|when do|when does)/i,
      /^(explain|tell me|help me|i don't|i do not|i'm not|i am not|not sure|unsure|confused|what do you mean)/i
    ]
    
    // Check if it's a question
    const isQuestion = questionPatterns.some(pattern => pattern.test(lower))
    
    if (!isQuestion) {
      return null // It's an answer, not a question
    }
    
    // Provide context-aware clarification responses
    const contextResponses: Record<string, Record<string, string>> = {
      'website_check': {
        'has_website': "I'm asking if you have a website for your business. If yes, paste the URL. If no, just say 'no' and we'll set things up manually.",
        'scrape_failed_choice': "I had trouble scraping that website. Would you like to try a different URL, or should we enter your details manually?"
      },
      'discovery': {
        'business_type': "I'm trying to understand what kind of business you run. Just tell me in a few words - like 'restaurant', 'plumber', 'law firm', etc."
      },
      'storefront': {
        'business_name': "I need the official name of your business - exactly as you want it to appear on your profile. Please double-check the spelling!",
        'location': "I need your business address. For a physical location, include the street address, city, and state. For service areas, tell me which cities or regions you serve.",
        'phone_email': "I need both a phone number and email address. You can provide them together like: '555-123-4567 and info@business.com'",
        'phone_only': "I need the main phone number where clients can reach you. Format it however you like - I'll understand.",
        'email_only': "I need an email address where clients can contact you. Make sure to double-check for typos!",
        'hours': "I need your business hours. For example: 'Monday-Friday 9am-5pm' or 'Open daily 10am-8pm'",
        'social_links': "If you have social media accounts (Instagram, Facebook, LinkedIn, etc.), paste the links here. If not, just say 'no' or 'none'."
      },
      'menu': {
        'services': "I'm asking about the main services or products you offer. List 3-5 key things customers come to you for.",
        'target_audience': "I want to know who your ideal customers are. For example: 'Families with kids', 'Small business owners', 'Seniors', etc.",
        'owner_vibe': "I'm asking for the owner's name and the business vibe. You can provide both like: 'John Smith, Friendly & Professional' or just the name first.",
        'vibe_only': "I need a brief description of your business vibe in 2 words. Examples: 'Friendly & Casual', 'High-End & Strict', 'Fast & Reliable'."
      },
      'locals': {
        'owner_name': "I'm asking for the name of the business owner or lead expert. This helps build trust with customers.",
        'credentials': "I'm asking about licenses, certifications, degrees, or how long you've been in business. This adds credibility to your profile."
      },
      'counter': {
        'payment': "I'm asking how customers pay you. Do you accept cash, credit cards, insurance, Venmo, etc.?",
        'policy': "I'm asking about your booking or reservation policies. For example: 'Walk-ins welcome', 'Appointment required', '24-hour cancellation policy', etc."
      },
      'proofread': {
        'review': "I'm showing you a summary of all the information I've collected. Please review it and let me know if anything needs to be corrected.",
        'final_review': "This is the final review before I save everything. Please check that the business name, phone, and email are spelled correctly."
      }
    }
    
    // Get context-specific response
    const phaseResponses = contextResponses[currentPhase]
    if (phaseResponses) {
      const response = phaseResponses[currentSubStep] || phaseResponses['*']
      if (response) {
        return response
      }
    }
    
    // Generic fallback
    return "I'm here to help! Could you rephrase your question? I'm currently collecting information about your business to set up your profile."
  }

  const formatProofreadSummary = (data: Partial<BusinessProfileData>, fromWebsite: boolean = false, missingDataReport?: string[]): string => {
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
    
    // Display missing data report if available
    if (missingDataReport && missingDataReport.length > 0) {
      summary += "\n\n**Note:** I couldn't find some information on your website:\n"
      missingDataReport.forEach((item, index) => {
        summary += `• ${item}\n`
      })
      summary += "\nYou can provide these details during our conversation if you'd like."
    }
    
    summary += "\nDoes the spelling of your Business Name, Phone Number, and Email look perfect? If you see any typos, tell me now!"
    
    return summary
  }

  // Detect global commands (retry / scrape again / new URL) before treating input as an answer
  type GlobalIntent =
    | { type: 'scrape_with_url'; url: string }
    | { type: 'retry_scrape' }
    | null

  const detectGlobalIntent = (rawMessage: string): GlobalIntent => {
    const lower = rawMessage.toLowerCase().trim()

    // FIRST: Check if it's an email address - if so, DON'T treat it as a URL
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (emailPattern.test(rawMessage.trim())) {
      return null // It's an email, not a URL
    }

    // Also check if message contains an email (even if there's other text)
    const emailInMessage = rawMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    if (emailInMessage) {
      // If the entire message is just an email or email-like, don't treat as URL
      const trimmed = rawMessage.trim()
      if (trimmed === emailInMessage[0] || trimmed.startsWith(emailInMessage[0]) || trimmed.endsWith(emailInMessage[0])) {
        return null // It's an email, not a URL
      }
    }

    // Any explicit URL in the message (with protocol or www)
    const urlMatch = rawMessage.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i)
    if (urlMatch && urlMatch[0]) {
      // Double-check it's not an email
      if (!emailPattern.test(urlMatch[0])) {
        return { type: 'scrape_with_url', url: urlMatch[0] }
      }
    }

    // Bare domain like "example.com" (no protocol / www)
    // BUT exclude if it looks like an email domain part
    const bareDomainMatch = rawMessage.match(/\b[a-z0-9.-]+\.[a-z]{2,}\b/i)
    if (bareDomainMatch && bareDomainMatch[0]) {
      const domain = bareDomainMatch[0]
      // Check if it's part of an email (has @ before it)
      const beforeDomain = rawMessage.substring(0, rawMessage.indexOf(domain))
      if (!beforeDomain.includes('@')) {
        // Not an email, treat as URL
        return { type: 'scrape_with_url', url: domain }
      }
    }

    // Retry / scrape-again style commands
    const retryKeywords = [
      'retry',
      'try again',
      'scrape again',
      'try scraping again',
      'try a different url',
      'different url',
      'another url',
      'another website',
      'change website',
      'change url',
      'restart scraping',
      'restart website'
    ]
    if (retryKeywords.some(phrase => lower.includes(phrase))) {
      return { type: 'retry_scrape' }
    }

    return null
  }

  // Shared helper to perform website scraping and update state
  const scrapeWebsiteAndApply = async (url: string) => {
    // Normalize URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    // Show scanning message
    const scanningMsg: Message = {
      id: `assistant_${Date.now()}`,
      role: 'assistant',
      content: `Jackpot! 🕵️‍♀️ I'm scanning ${normalizedUrl} now...`,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, scanningMsg])

    try {
      // Call the new Deep Profile API
      const response = await fetch('/api/generate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const msg = errorData?.error || 'Failed to analyze website'
        throw new Error(msg)
      }

      const result = await response.json()
      const profile = result.profile
      
      // PART 3: Extract module_config (the new "Operating System" structure)
      // This is the Source of Truth for Website Builder (17.2), Blog Engine (17.3), and Social Scheduler (17.5)
      const moduleConfig = result.module_config || profile?.module_config || null
      
      // PART 3: Extract markdown_report (the human-readable Deep Analytical Dossier for Task 17.1)
      // This is displayed to the user in the chat interface
      const profileReport = result.markdown_report || result.profile_report || result.profile?.markdown_report || result.profile?.content

      // Fill in data from deep profile analysis (for backward compatibility)
      // Use module_config if available, otherwise fall back to profile structure
      const brandName = moduleConfig?.brand?.name || profile?.brand?.name || profile?.content?.match(/# 📊 Deep Analytical (?:Profile|Dossier): (.+)/)?.[1] || ''
      const updatedData: Partial<BusinessProfileData> = {
        archetype: detectArchetype(brandName),
        identity: {
          business_name: brandName,
          address_or_area: moduleConfig?.crm_data?.address || '',
          phone: moduleConfig?.crm_data?.phone || '',
          email: moduleConfig?.crm_data?.email || '',
          website: normalizedUrl,
          hours: '',
          social_links: []
        },
        offering: {
          core_services: moduleConfig?.website_builder?.services_list || [],
          target_audience: profile?.brand?.target_audience || '',
          vibe_mission: `${profile?.brand?.tone || ''} - ${profile?.brand?.uvp || moduleConfig?.brand?.archetype || ''}`
        },
        credibility: {
          owner_name: '',
          owner_bio: '',
          credentials: [],
          years_in_business: ''
        },
        logistics: {
          payment_methods: [],
          insurance_accepted: false,
          booking_policy: '',
          specific_policy: ''
        }
      }

      // PART 3: Store deep profile data AND module_config (for future use in Website/Blog tabs)
      // The module_config serves as the "Source of Truth" for initializing:
      // - Website Builder (Task 17.2): hero_headline, subheadline, services_list, colors
      // - Blog Engine (Task 17.3): content_pillars, local_keywords
      // - Social Scheduler (Task 17.5): social_graph from scraped data
      setOnboardingState(prev => ({
        phase: 'proofread',
        subStep: 'review',
        archetype: updatedData.archetype as Archetype,
        data: updatedData,
        needsVerification: null,
        fromWebsite: true,
        lastWebsiteUrl: normalizedUrl,
        missing_data_report: [],
        scrapedWebsiteData: profile,
        deepProfile: profile,
        module_config: moduleConfig // CRITICAL: Store for Website Builder, Blog Engine, Social Scheduler
      }))

      // PART 3: Render the Human-Readable Report (Task 17.1 - Deep Markdown Dossier)
      // Display the markdown_report as a formatted chat message
      const reportContent = profileReport || `✅ **Deep Analysis Complete!**\n\nI've analyzed your website and generated a comprehensive business profile.`

      const reviewMsg: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: reportContent,
        timestamp: new Date(),
        isProfileReport: !!profileReport, // Mark as profile report to enable markdown rendering
        actions: [
          { label: 'Looks Perfect', value: 'CONFIRM' },
          { label: 'Make Changes', value: 'EDIT' }
        ]
      }
      setMessages(prev => [...prev, reviewMsg])
      
      // PART 3: Hydrate the OS (Operating System Brain)
      // The module_config is now stored in onboardingState.module_config
      // Access it later via: onboardingState.module_config
      // This data will be used when the user clicks "Website" or "Content" tabs
      if (moduleConfig) {
        console.log('✅ Module Config Stored (Source of Truth):', moduleConfig)
        console.log('  - Brand:', moduleConfig.brand)
        console.log('  - Website Builder:', moduleConfig.website_builder)
        console.log('  - Blog Engine:', moduleConfig.blog_engine)
        console.log('  - CRM Data:', moduleConfig.crm_data)
        // TODO: Optionally persist module_config to database for cross-session access
      }
    } catch (error: any) {
      console.error('Website analysis failed:', error)
      const errorMsg: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content:
          `Analysis failed: ${error?.message || 'unable to reach the website.'} ` +
          "Do you want to try a different URL, or enter your business details manually?",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])

      // Move into a choice state instead of silently switching to manual mode
      setOnboardingState(prev => ({
        phase: 'website_check',
        subStep: 'scrape_failed_choice',
        archetype: null,
        data: {},
        needsVerification: null,
        fromWebsite: false,
        lastWebsiteUrl: normalizedUrl
      }))
    }
  }

  // Handle action button clicks
  const handleActionClick = async (messageId: string, actionValue: string) => {
    if (isLoading || isComplete) return
    
    // Mark the action as clicked to hide the buttons
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, actionClicked: actionValue }
        : msg
    ))
    
    setIsLoading(true)
    
    try {
      if (actionValue === 'CONFIRM') {
        // Simulate CONFIRMATION intent
        await handleSend('looks perfect')
      } else if (actionValue === 'EDIT') {
        // Show edit prompt
        const editMsg: Message = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: "No problem! What would you like to update? (e.g., Phone, Email, Address, Business Name)",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, editMsg])
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error handling action click:', error)
      setIsLoading(false)
    }
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
      const { phase, subStep, archetype, data, needsVerification, lastWebsiteUrl, awaitingCorrectionFor, lockedFields = new Set<string>() } = onboardingState
      const lowerMessage = userMessage.toLowerCase().trim()

      // 0) PRIORITIZE PENDING INPUT - Check if we're waiting for a specific field value
      if (awaitingCorrectionFor) {
        if (awaitingCorrectionFor === 'email') {
          // Validate email format
          const basicEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
          const isValidFormat = basicEmailRegex.test(userMessage.trim())
          
          if (isValidFormat) {
            // Update email and clear pending state
            const updatedData = {
              ...data,
              identity: {
                ...data.identity,
                email: userMessage.trim()
              } as BusinessProfileData['identity']
            }
            
            const newLockedFields = lockField('email', lockedFields)
            
            // Determine next missing field
            const nextField = determineNextMissingField(
              updatedData,
              phase,
              subStep,
              archetype,
              newLockedFields
            )
            
            // Build confirmation message with next question
            let confirmationContent = `Got it, I've updated the email to ${userMessage.trim()}.`
            const stateUpdates: Partial<OnboardingState> = {
              data: updatedData,
              awaitingCorrectionFor: null, // Clear pending state
              lockedFields: newLockedFields
            }
            
            if (nextField) {
              if (nextField.isComplete) {
                confirmationContent += `\n\n${nextField.nextQuestion}`
              } else if (nextField.fieldName) {
                confirmationContent += `\n\nNow, moving on: I still need your ${nextField.fieldName}. ${nextField.nextQuestion}`
              } else {
                confirmationContent += `\n\n${nextField.nextQuestion}`
              }
              
              if (nextField.nextSubStep) {
                stateUpdates.subStep = nextField.nextSubStep
              }
              if (nextField.nextPhase) {
                stateUpdates.phase = nextField.nextPhase as OnboardingState['phase']
              }
            }
            
            setOnboardingState({
              ...onboardingState,
              ...stateUpdates
            })
            
            const successMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: confirmationContent,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, successMsg])
            setIsLoading(false)
            return
          } else {
            // Invalid format - ask again
            const errorMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "That doesn't look like a valid email address. Please type just the email address (e.g., test@example.com).",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
            setIsLoading(false)
            return
          }
        } else if (awaitingCorrectionFor === 'phone') {
          // Validate phone format
          const basicPhoneRegex = /[\d\s\-\(\)\+]{10,}/
          const isValidFormat = basicPhoneRegex.test(userMessage.trim())
          
          if (isValidFormat) {
            // Update phone and clear pending state
            const updatedData = {
              ...data,
              identity: {
                ...data.identity,
                phone: userMessage.trim()
              } as BusinessProfileData['identity']
            }
            
            const newLockedFields = lockField('phone', lockedFields)
            
            // Determine next missing field
            const nextField = determineNextMissingField(
              updatedData,
              phase,
              subStep,
              archetype,
              newLockedFields
            )
            
            // Build confirmation message with next question
            let confirmationContent = `Got it, I've updated the phone number to ${userMessage.trim()}.`
            const stateUpdates: Partial<OnboardingState> = {
              data: updatedData,
              awaitingCorrectionFor: null, // Clear pending state
              lockedFields: newLockedFields
            }
            
            if (nextField) {
              if (nextField.isComplete) {
                confirmationContent += `\n\n${nextField.nextQuestion}`
              } else if (nextField.fieldName) {
                confirmationContent += `\n\nNow, moving on: I still need your ${nextField.fieldName}. ${nextField.nextQuestion}`
              } else {
                confirmationContent += `\n\n${nextField.nextQuestion}`
              }
              
              if (nextField.nextSubStep) {
                stateUpdates.subStep = nextField.nextSubStep
              }
              if (nextField.nextPhase) {
                stateUpdates.phase = nextField.nextPhase as OnboardingState['phase']
              }
            }
            
            setOnboardingState({
              ...onboardingState,
              ...stateUpdates
            })
            
            const successMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: confirmationContent,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, successMsg])
            setIsLoading(false)
            return
          } else {
            // Invalid format - ask again
            const errorMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "That doesn't look like a valid phone number. Please type just the phone number (e.g., 555-123-4567).",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
            setIsLoading(false)
            return
          }
        }
      }

      // 0.5) CONTEXT AWARENESS - If profileData exists, treat ALL messages as questions about the profile
      // This prevents the chat loop from continuing to ask onboarding questions after profile is generated
      const profileContext = onboardingState.deepProfile || onboardingState.scrapedWebsiteData
      const hasProfile = profileContext !== null && profileContext !== undefined
      const isEditing = phase === 'proofread' && (subStep === 'correction_pending' || subStep?.startsWith('correct_'))
      
      // CRITICAL: If profile exists and we're not in editing mode, route ALL messages to profile question API
      // This fixes the chat loop issue where onboarding questions continue after profile generation
      if (hasProfile && !isEditing && !awaitingCorrectionFor) {
        try {
          // Call the profile question API endpoint with profileData as System Context
          const response = await fetch('/api/chat/profile-question', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              question: userMessage,
              profileData: profileContext, // Pass the full profile JSON as context
            }),
          })
          
          if (!response.ok) {
            throw new Error('Failed to get answer')
          }
          
          const result = await response.json()
          const answerMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: result.answer || "I'm sorry, I couldn't generate an answer. Please try again.",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, answerMsg])
          setIsLoading(false)
          return // Exit early - don't continue with onboarding logic
        } catch (error) {
          console.error('Error answering profile question:', error)
          const errorMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "I had trouble answering that question. Could you rephrase it?",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, errorMsg])
          setIsLoading(false)
          return // Exit early - don't continue with onboarding logic
        }
      }

      // 1) Global intent / command handling (retry / new URL) BEFORE treating as an answer
      const globalIntent = detectGlobalIntent(userMessage)
      if (globalIntent) {
        if (globalIntent.type === 'scrape_with_url') {
          await scrapeWebsiteAndApply(globalIntent.url)
          setIsLoading(false)
          return
        }

        if (globalIntent.type === 'retry_scrape') {
          if (lastWebsiteUrl) {
            await scrapeWebsiteAndApply(lastWebsiteUrl)
            setIsLoading(false)
            return
          }

          // No previous URL stored – ask for one and go back to website_check
          const askUrlMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Got it, let's try again. Paste the website URL you want me to scan.",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, askUrlMsg])
          setOnboardingState(prev => ({
            phase: 'website_check',
            subStep: 'has_website',
            archetype: null,
            data: {},
            needsVerification: null,
            fromWebsite: false,
            lastWebsiteUrl: null
          }))
          setIsLoading(false)
          return
        }
      }

      // 2) INTENT CLASSIFICATION - Classify user input BEFORE processing as answer
      const userIntent = classifyUserIntent(userMessage, phase, subStep)
      
      // 3) SLOT FILLING - Extract entities from user input regardless of current question
      // This allows users to provide information out of order
      // Only do slot filling in storefront phase (collecting contact info) or menu phase (collecting services)
      // Skip if it's a correction, off-topic, or verification response
      const shouldDoSlotFilling = (phase === 'storefront' || phase === 'menu') && 
                                   !needsVerification && // Don't interfere with verification
                                   userIntent !== 'CORRECTION' && // Corrections are handled separately
                                   userIntent !== 'OFF_TOPIC' // Off-topic is handled separately
      
      if (shouldDoSlotFilling) {
        const extracted = extractEntities(userMessage, data)
        
        if (extracted.updated) {
        // Update data with extracted entities
        const updatedData: Partial<BusinessProfileData> = {
          ...data,
          identity: {
            ...data.identity,
            ...(extracted.email && { email: extracted.email }),
            ...(extracted.phone && { phone: extracted.phone }),
            ...(extracted.address && { address_or_area: extracted.address })
          } as BusinessProfileData['identity'],
          ...(extracted.services && {
            offering: {
              ...data.offering,
              core_services: extracted.services
            } as BusinessProfileData['offering']
          })
        }
        
        // Build acknowledgment message
        const acknowledgments: string[] = []
        if (extracted.email) {
          const emailValidation = validateCriticalField('email', extracted.email)
          if (emailValidation.isValid) {
            acknowledgments.push(`saved the email as ${extracted.email}`)
          } else if (emailValidation.suggestion) {
            acknowledgments.push(`saved the email as ${emailValidation.suggestion} (corrected from ${extracted.email})`)
            updatedData.identity!.email = emailValidation.suggestion
          }
        }
        if (extracted.phone) {
          acknowledgments.push(`saved the phone number as ${extracted.phone}`)
        }
        if (extracted.address) {
          acknowledgments.push(`saved the address as ${extracted.address}`)
        }
        if (extracted.services) {
          acknowledgments.push(`saved ${extracted.services.length} service${extracted.services.length > 1 ? 's' : ''}: ${extracted.services.join(', ')}`)
        }
        
        // Update state
        setOnboardingState({
          ...onboardingState,
          data: updatedData
        })
        
        // Acknowledge what was saved
        const ackMsg: Message = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: `Got it, ${acknowledgments.join(', ')}.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, ackMsg])
        
        // Check what's still missing and ask for the next item
        const missingFields: string[] = []
        if (!updatedData.identity?.email) missingFields.push('email address')
        if (!updatedData.identity?.phone) missingFields.push('phone number')
        if (!updatedData.identity?.address_or_area && (archetype === 'BrickAndMortar' || archetype === 'AppointmentPro')) {
          missingFields.push('physical address')
        }
        if (!updatedData.offering?.core_services?.length && phase === 'menu') {
          missingFields.push('services')
        }
        
        if (missingFields.length > 0) {
          // Determine which field to ask for next (prioritize based on phase)
          let nextSubStep = subStep
          let nextQuestion = ''
          
          if (phase === 'storefront') {
            if (missingFields.includes('email address') && !updatedData.identity?.phone) {
              nextSubStep = 'phone_email'
              nextQuestion = "What is the best phone number and email address for clients to reach you?"
            } else if (missingFields.includes('phone number') && !updatedData.identity?.email) {
              nextSubStep = 'phone_email'
              nextQuestion = "What is the best phone number and email address for clients to reach you?"
            } else if (missingFields.includes('phone number')) {
              nextSubStep = 'phone_only'
              nextQuestion = "What is the main phone number for clients?"
            } else if (missingFields.includes('email address')) {
              nextSubStep = 'email_only'
              nextQuestion = "What is the best email address for clients to reach you?"
            } else if (missingFields.includes('physical address')) {
              nextSubStep = 'location'
              if (archetype === 'BrickAndMortar') {
                nextQuestion = "And where is the shop located? (Address)"
              } else if (archetype === 'ServiceOnWheels') {
                nextQuestion = "And what cities or areas do you travel to?"
              } else {
                nextQuestion = "And where is your studio/office located?"
              }
            }
          } else if (phase === 'menu' && missingFields.includes('services')) {
            nextSubStep = 'services'
            nextQuestion = "What are the top 3 services you offer? Be specific so people find you on Google."
          }
          
          if (nextQuestion) {
            setOnboardingState({
              ...onboardingState,
              subStep: nextSubStep,
              data: updatedData
            })
            
            const nextQuestionMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: nextQuestion,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, nextQuestionMsg])
            setIsLoading(false)
            return // Don't process as answer to current question
          } else {
            // Generic fallback
            const nextQuestionMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: `Now, I still need your ${missingFields.join(' and ')}.`,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, nextQuestionMsg])
            setIsLoading(false)
            return
          }
        }
        // If entities were extracted but all fields are filled, continue with normal flow
        }
      }

      // 4) Handle OFF_TOPIC requests
      if (userIntent === 'OFF_TOPIC') {
        const currentQuestionContext: Record<string, Record<string, string>> = {
          'menu': {
            'services': 'What are the top 3 services you offer?',
            'target_audience': "Who is your 'Dream Client'?",
            'owner_vibe': "Who is the owner/lead expert and what's the business vibe?",
            'vibe_only': "How would you describe the 'vibe' of the business?"
          },
          'storefront': {
            'business_name': "What is the official Business Name?",
            'location': 'Where is your business located?',
            'phone_email': 'What is the best phone number and email address?',
            'hours': 'What are your standard Opening Hours?'
          },
          'locals': {
            'owner_name': "Who is the owner or lead expert?",
            'credentials': 'What licenses, certifications, or years in business?'
          },
          'counter': {
            'payment': 'How does payment work?',
            'policy': 'What are your booking/cancellation policies?'
          }
        }
        
        const questionText = currentQuestionContext[phase]?.[subStep] || 'this question'
        const offTopicMsg: Message = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: `I'd love to chat about that later, but let's finish your business profile first so customers can find you. Back to ${questionText}...`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, offTopicMsg])
        setIsLoading(false)
        return // Don't process as answer
      }
      
      // 5) Handle CONFIRMATION requests (check BEFORE correction to avoid false positives)
      if (userIntent === 'CONFIRMATION') {
        // If we're in proofread phase, check for missing REQUIRED fields before saving
        // CRITICAL: Only check for truly required fields (business_name, core_services)
        // Optional fields (owner_name, address, phone, email if not provided) can be skipped if user confirms
        if (phase === 'proofread' && (subStep === 'review' || subStep === 'final_review')) {
          // Check only for truly required fields (business_name and core_services)
          // Phone and email are nice to have but can be empty if user confirms
          const hasRequiredFields = data.identity?.business_name && 
                                  data.offering?.core_services?.length
          
          // If required fields are missing, ask for them
          if (!hasRequiredFields) {
            let missingFieldMsg = ''
            if (!data.identity?.business_name) {
              missingFieldMsg = "I need your business name to complete the profile. What is the official Business Name?"
            } else if (!data.offering?.core_services?.length) {
              missingFieldMsg = "I need to know your services. What are the top 3 services you offer?"
            }
            
            const continueMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: missingFieldMsg,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, continueMsg])
            setIsLoading(false)
            return
          }
          
          // All REQUIRED fields are present - proceed with save (optional fields like owner_name, address can be empty)
          // Set loading state immediately
          setIsLoading(true)
          
          // Show saving message
          const savingMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Great! Saving your profile now...",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, savingMsg])
          
          try {
            const response = await saveProfile(data as BusinessProfileData)
            
            // Only proceed if save was successful
            setIsComplete(true)
            
            const completeMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "Perfect! I've saved everything. Setting things up for you now...",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, completeMsg])

            // Verify profile was saved before redirecting
            // This prevents redirect loops if the save didn't complete
            let retryCount = 0
            const maxRetries = 3
            const verifyProfile = async () => {
              try {
                // Include credentials to ensure cookies are sent with the request
                const checkResponse = await fetch('/api/profile', {
                  credentials: 'include',
                  cache: 'no-store'
                })
                
                // Handle 401 errors specifically - might be session issue
                // Refresh session before redirecting
                if (checkResponse.status === 401) {
                  console.warn('Session expired or invalid during profile verification, but profile was saved - refreshing session before redirect')
                  try {
                    // Force session refresh to ensure cookies are set
                    const { error } = await supabase.auth.getUser()
                    if (error) {
                      console.warn('Session refresh error:', error)
                    }
                    // Wait 1 second to ensure cookie is set
                    await new Promise(resolve => setTimeout(resolve, 1000))
                  } catch (sessionError) {
                    console.warn('Session refresh error (non-fatal):', sessionError)
                    // Continue with redirect anyway
                  }
                  
                  const redirectMsg: Message = {
                    id: `assistant_${Date.now()}`,
                    role: 'assistant',
                    content: "Redirecting you to your dashboard...",
                    timestamp: new Date()
                  }
                  setMessages(prev => [...prev, redirectMsg])
                  setTimeout(() => {
                    window.location.href = '/dashboard'
                  }, 500)
                  return
                }
                
                if (checkResponse.ok) {
                  const checkData = await checkResponse.json()
                  if (checkData.profile) {
                    // Profile exists - safe to redirect
                    const redirectMsg: Message = {
                      id: `assistant_${Date.now()}`,
                      role: 'assistant',
                      content: "Redirecting you to your dashboard...",
                      timestamp: new Date()
                    }
                    setMessages(prev => [...prev, redirectMsg])
                    
                    // Small delay to ensure database is ready
                    setTimeout(() => {
                      window.location.href = '/dashboard'
                    }, 1500)
                    return
                  }
                }
                
                // If profile check fails (404 or other), retry with limit
                retryCount++
                if (retryCount < maxRetries) {
                  console.warn(`Profile not found immediately after save, retrying (${retryCount}/${maxRetries})...`)
                  setTimeout(verifyProfile, 1000)
                } else {
                  // Max retries reached - refresh session before redirecting
                  console.warn('Max retries reached, refreshing session before redirect...')
                  try {
                    const { error } = await supabase.auth.getUser()
                    if (error) {
                      console.warn('Session refresh error:', error)
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000))
                  } catch (sessionError) {
                    console.warn('Session refresh error (non-fatal):', sessionError)
                  }
                  
                  const redirectMsg: Message = {
                    id: `assistant_${Date.now()}`,
                    role: 'assistant',
                    content: "Redirecting you to your dashboard...",
                    timestamp: new Date()
                  }
                  setMessages(prev => [...prev, redirectMsg])
                  setTimeout(() => {
                    window.location.href = '/dashboard'
                  }, 500)
                }
              } catch (error) {
                console.error('Error verifying profile:', error)
                retryCount++
                if (retryCount < maxRetries) {
                  setTimeout(verifyProfile, 1000)
                } else {
                  // Max retries reached - refresh session before redirecting
                  try {
                    const { error } = await supabase.auth.getUser()
                    if (error) {
                      console.warn('Session refresh error:', error)
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000))
                  } catch (sessionError) {
                    console.warn('Session refresh error (non-fatal):', sessionError)
                  }
                  
                  const redirectMsg: Message = {
                    id: `assistant_${Date.now()}`,
                    role: 'assistant',
                    content: "Redirecting you to your dashboard...",
                    timestamp: new Date()
                  }
                  setMessages(prev => [...prev, redirectMsg])
                  setTimeout(() => {
                    window.location.href = '/dashboard'
                  }, 500)
                }
              }
            }
            
            // Start verification after a brief delay
            setTimeout(verifyProfile, 1500)
            
            setIsLoading(false)
            return
          } catch (error: any) {
            console.error('Error saving profile:', error)
            setIsLoading(false)
            
            const errorMsg: Message = {
              id: `error_${Date.now()}`,
              role: 'assistant',
              content: "I ran into a technical issue saving your profile. Please try again in a moment, or refresh the page and let me know if the problem persists.",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
            return
          }
        }
        
        // For other phases, determine next step and continue
        const nextField = determineNextMissingField(
          data,
          phase,
          subStep,
          archetype,
          lockedFields
        )
        
        if (nextField) {
          const stateUpdates: Partial<OnboardingState> = {}
          if (nextField.nextSubStep) {
            stateUpdates.subStep = nextField.nextSubStep
          }
          if (nextField.nextPhase) {
            stateUpdates.phase = nextField.nextPhase as OnboardingState['phase']
          }
          
          setOnboardingState({
            ...onboardingState,
            ...stateUpdates
          })
          
          const nextMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: `Great! ${nextField.nextQuestion}`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, nextMsg])
          setIsLoading(false)
          return
        }
        
        // If no next field, just acknowledge
        const ackMsg: Message = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: "Great! Let's continue.",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, ackMsg])
        setIsLoading(false)
        return
      }
      
      // 6) Handle CORRECTION requests
      if (userIntent === 'CORRECTION') {
        // "Customer is Always Right" - Trust user corrections immediately
        const lower = userMessage.toLowerCase()
        const { lockedFields = new Set<string>() } = onboardingState
        
        // Check which field is being corrected
        // IMPORTANT: Check email FIRST before address, since "email address" contains "address"
        if (lower.includes('email') || lower.match(/email\s+address/i)) {
          // Email correction - extract entity ignoring surrounding words
          const newEmail = extractEntityFromCorrection(userMessage, 'email')
          
          if (newEmail) {
            // Basic validation - if it looks like a valid email, trust the user
            const basicEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
            const isValidFormat = basicEmailRegex.test(newEmail)
            
            if (isValidFormat) {
              // FORCE OVERWRITE - Customer is always right
              const updatedData = {
                ...data,
                identity: {
                  ...data.identity,
                  email: newEmail
                } as BusinessProfileData['identity']
              }
              
              // Lock the field and clear verification
              const newLockedFields = lockField('email', lockedFields)
              
              // Determine next missing field
              const nextField = determineNextMissingField(
                updatedData,
                phase,
                subStep,
                archetype,
                newLockedFields
              )
              
              // Build confirmation message with next question
              let confirmationContent = `Got it, I've updated the email to ${newEmail}.`
              const stateUpdates: Partial<OnboardingState> = {
                data: updatedData,
                needsVerification: null, // Clear verification immediately
                lockedFields: newLockedFields
              }
              
              if (nextField) {
                if (nextField.isComplete) {
                  confirmationContent += `\n\n${nextField.nextQuestion}`
                } else if (nextField.fieldName) {
                  confirmationContent += `\n\nNow, moving on: I still need your ${nextField.fieldName}. ${nextField.nextQuestion}`
                } else {
                  confirmationContent += `\n\n${nextField.nextQuestion}`
                }
                
                if (nextField.nextSubStep) {
                  stateUpdates.subStep = nextField.nextSubStep
                }
                if (nextField.nextPhase) {
                  stateUpdates.phase = nextField.nextPhase as OnboardingState['phase']
                }
              }
              
              setOnboardingState({
                ...onboardingState,
                ...stateUpdates
              })
              
              const correctionMsg: Message = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: confirmationContent,
                timestamp: new Date()
              }
              setMessages(prev => [...prev, correctionMsg])
              setIsLoading(false)
              return
            }
          }
          
          // No valid email extracted – ask user to type just the email and set pending state
          const correctionMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "I understood you want to update the email, but I couldn't catch the value. Please type just the email address for me.",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, correctionMsg])
          setOnboardingState({
            ...onboardingState,
            awaitingCorrectionFor: 'email' // Set pending state
          })
          setIsLoading(false)
          return
        } else if (lower.includes('phone') || lower.includes('number')) {
          // Phone correction - extract entity ignoring surrounding words
          const newPhone = extractEntityFromCorrection(userMessage, 'phone')
          
          if (newPhone) {
            // Basic validation - if it looks like a valid phone, trust the user
            const basicPhoneRegex = /[\d\s\-\(\)\+]{10,}/
            const isValidFormat = basicPhoneRegex.test(newPhone)
            
            if (isValidFormat) {
              // FORCE OVERWRITE - Customer is always right
              const updatedData = {
                ...data,
                identity: {
                  ...data.identity,
                  phone: newPhone
                } as BusinessProfileData['identity']
              }
              
              // Lock the field and clear verification
              const newLockedFields = lockField('phone', lockedFields)
              
              // Determine next missing field
              const nextField = determineNextMissingField(
                updatedData,
                phase,
                subStep,
                archetype,
                newLockedFields
              )
              
              // Build confirmation message with next question
              let confirmationContent = `Got it, I've updated the phone number to ${newPhone}.`
              const stateUpdates: Partial<OnboardingState> = {
                data: updatedData,
                needsVerification: null, // Clear verification immediately
                lockedFields: newLockedFields
              }
              
              if (nextField) {
                if (nextField.isComplete) {
                  confirmationContent += `\n\n${nextField.nextQuestion}`
                } else if (nextField.fieldName) {
                  confirmationContent += `\n\nNow, moving on: I still need your ${nextField.fieldName}. ${nextField.nextQuestion}`
                } else {
                  confirmationContent += `\n\n${nextField.nextQuestion}`
                }
                
                if (nextField.nextSubStep) {
                  stateUpdates.subStep = nextField.nextSubStep
                }
                if (nextField.nextPhase) {
                  stateUpdates.phase = nextField.nextPhase as OnboardingState['phase']
                }
              }
              
              setOnboardingState({
                ...onboardingState,
                ...stateUpdates
              })
              
              const correctionMsg: Message = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: confirmationContent,
                timestamp: new Date()
              }
              setMessages(prev => [...prev, correctionMsg])
              setIsLoading(false)
              return
            }
          }
          
          // No valid phone extracted – ask user to type just the phone number and set pending state
          const correctionMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "I understood you want to update the phone number, but I couldn't catch the value. Please type just the phone number for me.",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, correctionMsg])
          setOnboardingState({
            ...onboardingState,
            awaitingCorrectionFor: 'phone' // Set pending state
          })
          setIsLoading(false)
          return
        } else if (lower.includes('service') || (phase === 'menu' && subStep === 'services')) {
          // Service correction - extract which service(s) to remove
          const currentServices = data.offering?.core_services || []
          
          // Try to extract which service to remove by matching service names
          let servicesToRemove: string[] = []
          currentServices.forEach(service => {
            const serviceLower = service.toLowerCase()
            // Check if user message contains the service name
            if (lower.includes(serviceLower) || serviceLower.split(' ').some(word => lower.includes(word))) {
              servicesToRemove.push(service)
            }
          })
          
          // If user says "that's not a service" or similar without specifying, check recent context
          if (servicesToRemove.length === 0 && (lower.includes("that's not") || lower.includes('not a service') || lower.includes('wrong service') || lower.includes('remove that'))) {
            // Check last message shown to user (might contain the service they're referring to)
            const lastAssistantMsg = messages.filter(m => m.role === 'assistant').slice(-1)[0]
            if (lastAssistantMsg) {
              // Try to find service names in the last message
              currentServices.forEach(service => {
                if (lastAssistantMsg.content.includes(service)) {
                  servicesToRemove.push(service)
                }
              })
            }
            
            // If still nothing, remove the last service in the list as fallback
            if (servicesToRemove.length === 0 && currentServices.length > 0) {
              servicesToRemove = [currentServices[currentServices.length - 1]]
            }
          }
          
          // Remove the identified services
          const updatedServices = currentServices.filter(s => !servicesToRemove.includes(s))
          
          const updatedData = {
            ...data,
            offering: {
              ...data.offering,
              core_services: updatedServices
            } as BusinessProfileData['offering']
          }
          
          setOnboardingState({
            ...onboardingState,
            data: updatedData
          })
          
          const correctionMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: `Got it, I've updated that. ${updatedServices.length > 0 ? `Current services: ${updatedServices.join(', ')}` : 'No services listed yet.'} Does this look right now?`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, correctionMsg])
          setIsLoading(false)
          return // Stay on current step
        } else if ((lower.includes('address') || lower.includes('location')) && !lower.includes('email address')) {
          // Address correction - ask for new address
          // Make sure it's not "email address" by checking the context
          setOnboardingState({
            ...onboardingState,
            phase: 'storefront',
            subStep: 'location',
            data: {
              ...data,
              identity: {
                ...data.identity,
                address_or_area: ''
              } as BusinessProfileData['identity']
            }
          })
          
          const correctionMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Got it. What's the correct address? Please include the street address, city, and state.",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, correctionMsg])
          setIsLoading(false)
          return
        } else if (lower.includes('phone') || lower.includes('number')) {
          // Phone correction
          setOnboardingState({
            ...onboardingState,
            phase: 'storefront',
            subStep: 'phone_only',
            data: {
              ...data,
              identity: {
                ...data.identity,
                phone: ''
              } as BusinessProfileData['identity']
            }
          })
          
          const correctionMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Got it. What's the correct phone number?",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, correctionMsg])
          setIsLoading(false)
          return
        } else if (lower.includes('name') || lower.includes('business')) {
          // Business name correction
          setOnboardingState({
            ...onboardingState,
            phase: 'storefront',
            subStep: 'business_name',
            data: {
              ...data,
              identity: {
                ...data.identity,
                business_name: ''
              } as BusinessProfileData['identity']
            }
          })
          
          const correctionMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Got it. What's the correct business name?",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, correctionMsg])
          setIsLoading(false)
          return
        } else {
          // Generic correction - ask what to correct
          const correctionMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "I want to make sure I get this right. What specifically needs to be corrected? (e.g., 'Remove Luxury Fleet from services', 'Change the address', 'Fix the phone number')",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, correctionMsg])
          setIsLoading(false)
          return
        }
      }
      
      // 3) Check if user is asking for suggestions/help BEFORE processing as answer
      // This is critical - we need to catch these BEFORE they're treated as answers
      const suggestionRequestPatterns = [
        /(suggest|recommend|help me|what should|what would|not sure|unsure|don't know|dunno|can you suggest|can you recommend|give me ideas|ideas for)/i,
        /(best.*option|best.*service|top.*option|top.*service)/i,
        /(what do you think|what would you|based on.*website|from.*website|use.*website|check.*website|look.*website)/i,
        /(i am not sure|i'm not sure|i don't know|idk|not certain)/i
      ]
      
      const isSuggestionRequest = suggestionRequestPatterns.some(pattern => pattern.test(userMessage))
      
      // If it's a suggestion request, handle it in the specific subStep handler
      // We'll let the subStep-specific logic handle it, but we flag it here
      
      // 4) Check if user is asking a clarification question vs providing an answer
      // Skip this check for verification responses (yes/no) and confirmation patterns
      const isVerificationResponse = needsVerification && (
        lowerMessage === 'yes' || lowerMessage === 'y' || lowerMessage === 'correct' || 
        lowerMessage.includes('right') || lowerMessage === 'no' || lowerMessage === 'n'
      )
      const isConfirmation = lowerMessage === 'yes' || lowerMessage === 'y' || 
        lowerMessage.includes('looks good') || lowerMessage.includes('perfect') ||
        lowerMessage.includes("it's good") || lowerMessage.includes('its good') ||
        lowerMessage.includes('is good') || lowerMessage.includes('all good') ||
        lowerMessage.includes('sounds good') || lowerMessage === 'ok' || lowerMessage === 'okay'
      
      // Check if it looks like a valid answer first
      const seemsLikeAnswer = looksLikeValidAnswer(userMessage, subStep)
      
      // Only check for clarification if it doesn't seem like an answer AND it's not a suggestion request
      // (suggestion requests are handled in subStep-specific logic)
      if (!isVerificationResponse && !isConfirmation && !seemsLikeAnswer && !isSuggestionRequest) {
        const clarificationResponse = detectClarificationQuestion(userMessage, phase, subStep)
        if (clarificationResponse) {
          const clarifyMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: clarificationResponse,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, clarifyMsg])
          setIsLoading(false)
          return // Don't process as an answer, just provide clarification
        }
      }
      
      // 3) Prevent loops: Track question repetition and be more lenient after repeats
      const currentQuestion = `${phase}_${subStep}`
      const isRepeatingQuestion = onboardingState.lastQuestionAsked === currentQuestion
      const repeatCount = isRepeatingQuestion ? (onboardingState.questionRepeatCount || 0) + 1 : 0
      
      // Update question tracking
      if (!isRepeatingQuestion) {
        // New question - reset counter
        setOnboardingState(prev => ({
          ...prev,
          lastQuestionAsked: currentQuestion,
          questionRepeatCount: 0
        }))
      } else {
        // Same question - increment counter
        setOnboardingState(prev => ({
          ...prev,
          questionRepeatCount: repeatCount
        }))
      }
      
      // If we've asked this question 3+ times, accept almost any non-question response
      if (repeatCount >= 3) {
        // Force accept the answer to break the loop
        console.log('Question repeated 3+ times, accepting user response to prevent loop')
        // The answer will be processed normally below, but we're more lenient
      }

      // Handle verification requests
      if (needsVerification && needsVerification.field) {
        const { lockedFields = new Set<string>() } = onboardingState
        const updatedData = { ...data }
        const verifiedValue = (lowerMessage === 'yes' || lowerMessage === 'y' || lowerMessage === 'correct' || lowerMessage.includes('right'))
          ? (needsVerification.suggestion || userMessage.trim())
          : userMessage.trim()
          
          if (needsVerification.field === 'email') {
            updatedData.identity = { ...updatedData.identity, email: verifiedValue } as BusinessProfileData['identity']
            // Lock the field after verification
            const newLockedFields = lockField('email', lockedFields)
            setOnboardingState(prev => ({
              ...prev,
              lockedFields: newLockedFields
            }))
          } else if (needsVerification.field === 'phone') {
            updatedData.identity = { ...updatedData.identity, phone: verifiedValue } as BusinessProfileData['identity']
            // Lock the field after verification
            const newLockedFields = lockField('phone', lockedFields)
            setOnboardingState(prev => ({
              ...prev,
              lockedFields: newLockedFields
            }))
          } else if (needsVerification.field === 'business_name') {
            updatedData.identity = { ...updatedData.identity, business_name: verifiedValue } as BusinessProfileData['identity']
            // Lock the field after verification
            const newLockedFields = lockField('business_name', lockedFields)
            setOnboardingState(prev => ({
              ...prev,
              lockedFields: newLockedFields
            }))
          }
          
          // Continue to next step - CLEAR verification immediately
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
        const urlMatch = userMessage.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i)
        const isUrl = !!urlMatch || userMessage.includes('http') || userMessage.includes('www.')
        
        if (isUrl || (!lower.includes('no') && !lower.includes('not') && !lower.includes("don't") && !lower.includes('none'))) {
          // User provided a URL or said yes – try scraping
          const url = urlMatch ? urlMatch[0] : userMessage.trim()
          await scrapeWebsiteAndApply(url)
          setIsLoading(false)
          return
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

      // Website check: user responding after a failed scrape
      if (phase === 'website_check' && subStep === 'scrape_failed_choice') {
        // If they clearly want manual mode
        if (
          lowerMessage.includes('manual') ||
          lowerMessage.includes('manually') ||
          lowerMessage.includes('no website') ||
          (lowerMessage.includes('no') && !lowerMessage.includes('url') && !lowerMessage.includes('website'))
        ) {
          const noWebsiteMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "No problem at all! Let's build it together from scratch. It'll only take a minute.",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, noWebsiteMsg])

          setOnboardingState({
            phase: 'discovery',
            subStep: 'business_type',
            archetype: null,
            data: {},
            needsVerification: null,
            fromWebsite: false,
            lastWebsiteUrl
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

        // If they paste another URL or say "scrape again", the global intent handler above will already have caught it.
        // If we reach here, and message is ambiguous, gently prompt for clarity.
        const clarifyMsg: Message = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: "Got it. If you want me to try scraping again, paste the new website link. If you'd rather skip the website, just say \"manual\" and we'll enter details by hand.",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, clarifyMsg])
        setIsLoading(false)
        return
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
          
          // Validate input first - reject purely numeric input
          const fullValidation = validateAddressComponent(locationInput, 'full')
          if (!fullValidation.isValid) {
            const errorMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: fullValidation.error || "That doesn't look like a valid address. Please provide the full address including street, city, and state.",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
            setIsLoading(false)
            return
          }
          
          // For Brick & Mortar and Appointment Pro, require full street address
          if (archetype === 'BrickAndMortar' || archetype === 'AppointmentPro') {
            // Check if it's just a city name (no numbers, no street name indicators)
            const hasNumber = /\d/.test(locationInput)
            const hasStreetIndicators = /\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl)\b/i.test(locationInput)
            
            // Validate city component if it looks like just a city
            if (!hasNumber || !hasStreetIndicators) {
              // Validate that it's a valid city (contains letters, not just numbers)
              const cityValidation = validateAddressComponent(locationInput, 'city')
              if (!cityValidation.isValid) {
                const errorMsg: Message = {
                  id: `assistant_${Date.now()}`,
                  role: 'assistant',
                  content: cityValidation.error || "Please provide a valid city name with letters.",
                  timestamp: new Date()
                }
                setMessages(prev => [...prev, errorMsg])
                setIsLoading(false)
                return
              }
              
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
          // User provided street address, validate it first
          const streetAddress = userMessage.trim()
          
          // Validate that street address is not purely numeric
          const streetValidation = validateAddressComponent(streetAddress, 'full')
          if (!streetValidation.isValid) {
            const errorMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: streetValidation.error || "That doesn't look like a valid street address. Please provide the house/building number and street name (e.g., '123 Main St').",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
            setIsLoading(false)
            return
          }
          
          // Combine street address with city
          const city = data.identity?.address_or_area || ''
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
          // Validate state input first
          const state = userMessage.trim()
          const stateValidation = validateAddressComponent(state, 'state')
          
          if (!stateValidation.isValid) {
            const errorMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: stateValidation.error || "That doesn't look like a valid state. Please provide the state name or abbreviation (e.g., 'CA' or 'California').",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
            setIsLoading(false)
            return
          }
          
          // Combine address with state
          const address = data.identity?.address_or_area || ''
          const fullLocation = `${address}, ${state}`
          
          const updatedData = {
            ...data,
            identity: {
              ...data.identity,
              address_or_area: fullLocation
            } as BusinessProfileData['identity']
          }
          
          // Check if phone/email are locked before asking
          const { lockedFields: locationLockedFields = new Set<string>() } = onboardingState
          const isPhoneLockedAtLocation = isFieldLocked('phone', locationLockedFields)
          const isEmailLockedAtLocation = isFieldLocked('email', locationLockedFields)
          
          // If both are locked, skip to next step
          if (isPhoneLockedAtLocation && isEmailLockedAtLocation) {
            // Both locked - move to social links
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
          
          // If one is locked, ask only for the other
          if (isPhoneLockedAtLocation && !isEmailLockedAtLocation) {
            setOnboardingState({
              ...onboardingState,
              phase: 'storefront',
              subStep: 'email_only',
              data: updatedData
            })
            
            const emailMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "What is the best email address for clients to reach you?",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, emailMsg])
            setIsLoading(false)
            return
          }
          
          if (isEmailLockedAtLocation && !isPhoneLockedAtLocation) {
            setOnboardingState({
              ...onboardingState,
              phase: 'storefront',
              subStep: 'phone_only',
              data: updatedData
            })
            
            const phoneMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "What is the main phone number for clients?",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, phoneMsg])
            setIsLoading(false)
            return
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
          // Check if fields are locked - if so, skip this step
          const { lockedFields: phoneEmailLockedFields = new Set<string>() } = onboardingState
          const isPhoneLocked = isFieldLocked('phone', phoneEmailLockedFields)
          const isEmailLocked = isFieldLocked('email', phoneEmailLockedFields)
          
          if (isPhoneLocked && isEmailLocked) {
            // Both locked - move to social links
            setOnboardingState({
              ...onboardingState,
              phase: 'storefront',
              subStep: 'social_links',
              data: data
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
          
          // If one is locked, only process the other
          if (isPhoneLocked) {
            // Only process email
            const emailMatch = userMessage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
            const email = emailMatch ? emailMatch[0] : ''
            
            if (!email) {
              const errorMsg: Message = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: "I need an email address. Could you provide it?",
                timestamp: new Date()
              }
              setMessages(prev => [...prev, errorMsg])
              setIsLoading(false)
              return
            }
            
            const emailValidation = validateCriticalField('email', email)
            const finalEmail = emailValidation.suggestion || email
            
            const updatedData = {
              ...data,
              identity: {
                ...data.identity,
                email: finalEmail
              } as BusinessProfileData['identity']
            }
            
            const newLockedFields = lockField('email', phoneEmailLockedFields)
            
            setOnboardingState({
              ...onboardingState,
              phase: 'storefront',
              subStep: 'social_links',
              data: updatedData,
              lockedFields: newLockedFields
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
          
          if (isEmailLocked) {
            // Only process phone
            const phoneMatch = userMessage.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/)
            const phone = phoneMatch ? phoneMatch[0] : ''
            
            if (!phone) {
              const errorMsg: Message = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: "I need a phone number. Could you provide it?",
                timestamp: new Date()
              }
              setMessages(prev => [...prev, errorMsg])
              setIsLoading(false)
              return
            }
            
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
            
            const newLockedFields = lockField('phone', phoneEmailLockedFields)
            
            setOnboardingState({
              ...onboardingState,
              phase: 'storefront',
              subStep: 'social_links',
              data: updatedData,
              lockedFields: newLockedFields
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
          
          // Neither is locked - process normally
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
            // Phone missing - ask for it, but lock email first
            const emailValidation = validateCriticalField('email', email)
            const finalEmail = emailValidation.suggestion || email
            const { lockedFields = new Set<string>() } = onboardingState
            const newLockedFields = lockField('email', lockedFields)
            
            const updatedData = {
              ...data,
              identity: {
                ...data.identity,
                email: finalEmail
              } as BusinessProfileData['identity']
            }
            setOnboardingState({
              ...onboardingState,
              phase: 'storefront',
              subStep: 'phone_only',
              data: updatedData,
              lockedFields: newLockedFields
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
            // Email missing - ask for it, but lock phone first
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
            
            const { lockedFields = new Set<string>() } = onboardingState
            const newLockedFields = lockField('phone', lockedFields)
            
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
              data: updatedData,
              lockedFields: newLockedFields
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
          // "Customer is Always Right" - if basic format is valid, trust the user
          const basicEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
          const isValidEmailFormat = basicEmailRegex.test(email)
          
          if (!isValidEmailFormat && emailValidation.suggestion) {
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
          } else if (!isValidEmailFormat) {
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
          
          // Both valid - lock both fields and move to next step
          const { lockedFields: bothFieldsLockedFields = new Set<string>() } = onboardingState
          const emailLockedSet = lockField('email', bothFieldsLockedFields)
          const newLockedFields = lockField('phone', emailLockedSet)
          
          const finalEmail = emailValidation.suggestion || email
          
          const updatedData = {
            ...data,
            identity: {
              ...data.identity,
              phone: phone,
              email: finalEmail
            } as BusinessProfileData['identity']
          }
          
          setOnboardingState({
            ...onboardingState,
            phase: 'storefront',
            subStep: 'social_links',
            data: updatedData,
            lockedFields: newLockedFields
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
          // Check if phone is already locked - if so, skip to next step
          const { lockedFields = new Set<string>() } = onboardingState
          if (isFieldLocked('phone', lockedFields)) {
            setOnboardingState({
              ...onboardingState,
              phase: 'storefront',
              subStep: 'social_links',
              data: data
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
          
          const phone = userMessage.trim()
          // "Customer is Always Right" - basic validation
          const basicPhoneRegex = /[\d\s\-\(\)\+]{10,}/
          const isValidFormat = basicPhoneRegex.test(phone)
          
          if (!isValidFormat) {
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
          
          // Lock the field and update
          const newLockedFields = lockField('phone', lockedFields)
          
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
            data: updatedData,
            lockedFields: newLockedFields
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
          // Check if email is already locked - if so, skip to next step
          const { lockedFields = new Set<string>() } = onboardingState
          if (isFieldLocked('email', lockedFields)) {
            setOnboardingState({
              ...onboardingState,
              phase: 'storefront',
              subStep: 'social_links',
              data: data
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
          
          const email = userMessage.trim()
          // "Customer is Always Right" - basic validation
          const basicEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
          const isValidFormat = basicEmailRegex.test(email)
          
          if (!isValidFormat) {
            const validation = validateCriticalField('email', email)
            if (validation.suggestion) {
              setOnboardingState({
                ...onboardingState,
                needsVerification: {
                  field: 'email',
                  value: email,
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
          
          // Lock the field and update
          const newLockedFields = lockField('email', lockedFields)
          
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
            subStep: 'social_links',
            data: updatedData,
            lockedFields: newLockedFields
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
          
          const summary = formatProofreadSummary(updatedData, false, undefined)
          const reviewMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: summary,
            timestamp: new Date(),
            actions: [
              { label: 'Looks Perfect', value: 'CONFIRM' },
              { label: 'Make Changes', value: 'EDIT' }
            ]
          }
          setMessages(prev => [...prev, reviewMsg])
          setIsLoading(false)
          return
        }
      }

      // Phase 2: Menu
      if (phase === 'menu') {
        if (subStep === 'services') {
          // Check if user is asking for suggestions/help - EXPANDED patterns
          // Check this FIRST before processing as an answer
          const lowerMsg = userMessage.toLowerCase()
          const suggestionKeywords = [
            'suggest', 'recommend', 'help me', 'what should', 'what would', 
            'not sure', 'unsure', "don't know", "i don't know", "i'm not sure", 
            'dunno', 'idk', 'can you suggest', 'can you recommend', 
            'give me ideas', 'ideas for', 'what do you think', 'what would you',
            'based on', 'from website', 'use website', 'check website', 
            'look website', 'website', 'best option', 'best service', 
            'top option', 'top service', 'not certain'
          ]
          
          const isAskingForSuggestions = suggestionKeywords.some(keyword => lowerMsg.includes(keyword)) ||
            /(suggest|recommend|help|what.*think|what.*should|what.*would|based.*on|not.*sure)/i.test(userMessage)
          
          if (isAskingForSuggestions) {
            // Check if we have scraped website data
            const scrapedData = onboardingState.scrapedWebsiteData
            const hasScrapedServices = scrapedData?.services && Array.isArray(scrapedData.services) && scrapedData.services.length > 0
            
            let suggestions: string[] = []
            let suggestionText = ''
            
            if (hasScrapedServices) {
              // Use services from scraped website data
              suggestions = scrapedData.services.slice(0, 5).map((s: any) => typeof s === 'string' ? s : s.name || s)
              suggestionText = `Great! I found these services on your website:\n${suggestions.map(s => `• ${s}`).join('\n')}\n\nDo these look right? You can:\n• Say "yes" or "use these" to keep them\n• Modify them by typing your own list\n• Tell me which ones to change`
            } else {
              // Provide suggestions based on business type/industry
              const industry = data.offering?.core_services?.[0] || data.identity?.business_name || scrapedData?.industry || ''
              const currentArchetype = onboardingState.archetype || data.archetype
              
              if (currentArchetype === 'BrickAndMortar' || industry.toLowerCase().includes('restaurant') || industry.toLowerCase().includes('cafe') || industry.toLowerCase().includes('bakery')) {
                suggestions = ['Dine-In Service', 'Takeout & Delivery', 'Catering Services']
                suggestionText = "Based on your business type, here are some common services:\n• Dine-In Service\n• Takeout & Delivery\n• Catering Services\n\nDo any of these work for you? You can use these, modify them, or tell me your own!"
              } else if (currentArchetype === 'ServiceOnWheels' || industry.toLowerCase().includes('plumb') || industry.toLowerCase().includes('hvac') || industry.toLowerCase().includes('electric')) {
                suggestions = ['Emergency Repairs', 'Installation Services', 'Maintenance & Inspections']
                suggestionText = "Based on your business type, here are some common services:\n• Emergency Repairs\n• Installation Services\n• Maintenance & Inspections\n\nDo any of these work for you? You can use these, modify them, or tell me your own!"
              } else if (currentArchetype === 'AppointmentPro' || industry.toLowerCase().includes('medical') || industry.toLowerCase().includes('dental') || industry.toLowerCase().includes('legal') || industry.toLowerCase().includes('law')) {
                suggestions = ['Consultation Services', 'Treatment/Service Delivery', 'Follow-Up Care']
                suggestionText = "Based on your business type, here are some common services:\n• Consultation Services\n• Treatment/Service Delivery\n• Follow-Up Care\n\nDo any of these work for you? You can use these, modify them, or tell me your own!"
              } else {
                // Generic suggestions
                suggestions = ['Primary Service Offering', 'Secondary Service', 'Additional Services']
                suggestionText = "I'd be happy to help! Here are some general service categories:\n• Primary Service Offering\n• Secondary Service\n• Additional Services\n\nCan you tell me more about what your business does? For example, if you're a chiropractor, you might offer: 'Chiropractic Adjustments', 'Wellness Coaching', 'Pain Management'."
              }
            }
            
            // Store suggestions in state and ask for confirmation
            setOnboardingState({
              ...onboardingState,
              phase: 'menu',
              subStep: 'services_suggestions', // New subStep for handling suggestions
              data: {
                ...data,
                offering: {
                  ...data.offering,
                  suggested_services: suggestions // Temporarily store suggestions
                } as any
              }
            })
            
            const suggestMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: suggestionText,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, suggestMsg])
            setIsLoading(false)
            return
          }
          
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
        
        // Handle service suggestions confirmation/modification
        if (subStep === 'services_suggestions') {
          // User can accept suggestions, modify them, or provide their own
          const lower = userMessage.toLowerCase().trim()
          
          // Check if they want to use the suggestions as-is
          if (lower === 'yes' || lower === 'y' || lower === 'use these' || lower === 'these work' || lower.includes('use them')) {
            const suggestedServices = (data.offering as any)?.suggested_services || []
            const services = suggestedServices.length > 0 ? suggestedServices : ['Primary Service', 'Secondary Service', 'Additional Service']
            
            const updatedData = {
              ...data,
              offering: {
                ...data.offering,
                core_services: services,
                suggested_services: undefined // Remove temporary suggestions
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
          
          // Otherwise, treat their response as services (they're modifying or providing their own)
          const services = userMessage.split(/[,;]|and/).map(s => s.trim()).filter(s => s.length > 0).slice(0, 5)
          
          if (services.length === 0) {
            const clarifyMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "I need at least one service. Can you list 3 services you offer? For example: 'Chiropractic Adjustments, Wellness Coaching, Pain Management'",
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
              core_services: services,
              suggested_services: undefined // Remove temporary suggestions
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
              subStep: 'owner_last_name', // Change subStep to track we're waiting for last name
              data: {
                ...data,
                credibility: {
                  ...data.credibility,
                  owner_name: ownerName // Store first name temporarily
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
          
          const summary = formatProofreadSummary(updatedData, false, undefined)
          const reviewMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: summary,
            timestamp: new Date(),
            actions: [
              { label: 'Looks Perfect', value: 'CONFIRM' },
              { label: 'Make Changes', value: 'EDIT' }
            ]
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
          
          const summary = formatProofreadSummary(updatedData, false, undefined)
          const reviewMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: summary,
            timestamp: new Date(),
            actions: [
              { label: 'Looks Perfect', value: 'CONFIRM' },
              { label: 'Make Changes', value: 'EDIT' }
            ]
          }
          setMessages(prev => [...prev, reviewMsg])
          setIsLoading(false)
          return
        }
        
        // Handle last name response in menu phase
        if (subStep === 'owner_last_name') {
          const lastName = userMessage.trim()
          const firstName = data.credibility?.owner_name || ''
          
          // Check if user declined to provide last name
          const lowerMessage = lastName.toLowerCase()
          if (lowerMessage === 'no' || lowerMessage === 'n' || lowerMessage === 'none' || lowerMessage === "don't" || lowerMessage === "no thanks") {
            // Use just the first name and ask for vibe
            const updatedData = {
              ...data,
              credibility: {
                ...data.credibility,
                owner_name: firstName // Keep just first name
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
          
          // Combine first and last name, then ask for vibe
          const fullName = `${firstName} ${lastName}`.trim()
          const updatedData = {
            ...data,
            credibility: {
              ...data.credibility,
              owner_name: fullName
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
      }

      // Phase 3: Locals (after review)
      if (phase === 'locals') {
        if (subStep === 'owner_name') {
          const ownerName = userMessage.trim()
          
          // Check if it's just a first name (single word, common first name pattern)
          const nameParts = ownerName.split(/\s+/)
          if (nameParts.length === 1 && ownerName.length < 15) {
            // Store first name and ask for last name
            setOnboardingState({
              ...onboardingState,
              phase: 'locals',
              subStep: 'owner_last_name', // Change subStep to track we're waiting for last name
              data: {
                ...data,
                credibility: {
                  ...data.credibility,
                  owner_name: ownerName // Store first name temporarily
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
        
        // Handle last name response
        if (subStep === 'owner_last_name') {
          const lastName = userMessage.trim()
          const firstName = data.credibility?.owner_name || ''
          
          // Check if user declined to provide last name
          const lowerMessage = lastName.toLowerCase()
          if (lowerMessage === 'no' || lowerMessage === 'n' || lowerMessage === 'none' || lowerMessage === "don't" || lowerMessage === "no thanks") {
            // Use just the first name
            const updatedData = {
              ...data,
              credibility: {
                ...data.credibility,
                owner_name: firstName, // Keep just first name
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
          
          // Combine first and last name
          const fullName = `${firstName} ${lastName}`.trim()
          const updatedData = {
            ...data,
            credibility: {
              ...data.credibility,
              owner_name: fullName,
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
          
          const summary = formatProofreadSummary(updatedData, false, undefined)
          const proofreadMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: summary,
            timestamp: new Date(),
            actions: [
              { label: 'Looks Perfect', value: 'CONFIRM' },
              { label: 'Make Changes', value: 'EDIT' }
            ]
          }
          setMessages(prev => [...prev, proofreadMsg])
          setIsLoading(false)
          return
        }
      }

      // Phase 3: Proofread (Review after Storefront)
      if (phase === 'proofread' && subStep === 'review') {
        // Check for confirmation intent FIRST (CONFIRMATION is handled above, but check here as fallback)
        const isConfirmed = (userIntent as string) === 'CONFIRMATION' ||
                           lowerMessage === 'yes' || lowerMessage === 'y' || lowerMessage === 'correct' || 
                           lowerMessage.includes('looks good') || lowerMessage.includes('perfect') ||
                           lowerMessage.includes("it's good") || lowerMessage.includes('its good') ||
                           lowerMessage.includes('is good') || lowerMessage.includes('all good') ||
                           lowerMessage.includes('sounds good') || lowerMessage === 'ok' || lowerMessage === 'okay'
        
        if (isConfirmed) {
          // User confirmed scraped data - check for missing fields before proceeding
          // CRITICAL: Don't save yet if fields are missing
          const nextField = determineNextMissingField(
            data,
            phase,
            subStep,
            archetype,
            lockedFields
          )
          
          // If there are missing fields, continue asking questions instead of moving to next phase
          if (nextField && !nextField.isComplete) {
            // Mark current step as done and move to next missing field
            const stateUpdates: Partial<OnboardingState> = {}
            if (nextField.nextSubStep) {
              stateUpdates.subStep = nextField.nextSubStep
            }
            if (nextField.nextPhase) {
              stateUpdates.phase = nextField.nextPhase as OnboardingState['phase']
            }
            
            setOnboardingState({
              ...onboardingState,
              ...stateUpdates,
              data: data
            })
            
            const continueMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: `Great! Now to finish your profile, I need a few more details. ${nextField.nextQuestion}`,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, continueMsg])
            setIsLoading(false)
            return
          }
          
          // All required fields are present - continue to Menu phase
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
          // User wants to make corrections – detect which field they mean
          if (lowerMessage.includes('email')) {
            setOnboardingState({
              ...onboardingState,
              phase: 'proofread',
              subStep: 'correct_email',
              data
            })
            const askEmailMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "Got it. What's the correct email address?",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, askEmailMsg])
            setIsLoading(false)
            return
          }
          if (lowerMessage.includes('phone') || lowerMessage.includes('number')) {
            setOnboardingState({
              ...onboardingState,
              phase: 'proofread',
              subStep: 'correct_phone',
              data
            })
            const askPhoneMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "No problem. What's the correct main phone number?",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, askPhoneMsg])
            setIsLoading(false)
            return
          }
          if (lowerMessage.includes('name') || lowerMessage.includes('business')) {
            setOnboardingState({
              ...onboardingState,
              phase: 'proofread',
              subStep: 'correct_business_name',
              data
            })
            const askNameMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "Sure thing. What should the business name be?",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, askNameMsg])
            setIsLoading(false)
            return
          }
          if (lowerMessage.includes('address') || lowerMessage.includes('location')) {
            setOnboardingState({
              ...onboardingState,
              phase: 'proofread',
              subStep: 'correct_address',
              data
            })
            const askAddressMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "Got it. What's the correct address? Please include the street address, city, and state.",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, askAddressMsg])
            setIsLoading(false)
            return
          }
          if (lowerMessage.includes('social') || lowerMessage.includes('instagram') || lowerMessage.includes('facebook') || lowerMessage.includes('linkedin')) {
            setOnboardingState({
              ...onboardingState,
              phase: 'proofread',
              subStep: 'correct_socials',
              data
            })
            const askSocialsMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "Got it. What are your social media links? Paste the URLs for Instagram, Facebook, LinkedIn, or any other platforms you use.",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, askSocialsMsg])
            setIsLoading(false)
            return
          }

          // Fallback generic correction prompt (only once)
          setOnboardingState({
            ...onboardingState,
            phase: 'proofread',
            subStep: 'correction_pending',
            data
          })
          const correctionMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Sure thing! What should I change? Just tell me what's off and what it should be instead.",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, correctionMsg])
          setIsLoading(false)
          return
        }
      }
      
      // Final Proofread (after all phases)
      if (phase === 'proofread' && subStep === 'final_review') {
        // Check for confirmation intent FIRST (CONFIRMATION is handled above, but check here as fallback)
        const isConfirmed = (userIntent as string) === 'CONFIRMATION' ||
                           lowerMessage === 'yes' || lowerMessage === 'y' || lowerMessage === 'correct' || 
                           lowerMessage.includes('looks good') || lowerMessage.includes('perfect') ||
                           lowerMessage.includes("it's good") || lowerMessage.includes('its good') ||
                           lowerMessage.includes('is good') || lowerMessage.includes('all good') ||
                           lowerMessage.includes('sounds good') || lowerMessage === 'ok' || lowerMessage === 'okay'
        
        if (isConfirmed) {
          // User confirmed - check for missing fields before saving
          const nextField = determineNextMissingField(
            data,
            phase,
            subStep,
            archetype,
            lockedFields
          )
          
          // If there are missing fields, continue asking questions instead of saving
          if (nextField && !nextField.isComplete) {
            // Mark current step as done and move to next missing field
            const stateUpdates: Partial<OnboardingState> = {}
            if (nextField.nextSubStep) {
              stateUpdates.subStep = nextField.nextSubStep
            }
            if (nextField.nextPhase) {
              stateUpdates.phase = nextField.nextPhase as OnboardingState['phase']
            }
            
            setOnboardingState({
              ...onboardingState,
              ...stateUpdates
            })
            
            const continueMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: `Great! Now to finish your profile, I need a few more details. ${nextField.nextQuestion}`,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, continueMsg])
            setIsLoading(false)
            return
          }
          
          // All required fields are present - proceed with save
          // Set loading state immediately
          setIsLoading(true)
          
          // Show saving message
          const savingMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Great! Saving your profile now...",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, savingMsg])
          
          try {
            await saveProfile(data as BusinessProfileData)
            setIsComplete(true)
            
            const completeMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "Perfect! I've saved everything. Setting things up for you now...",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, completeMsg])

            // Verify profile was saved before redirecting
            // This prevents redirect loops if the save didn't complete
            let retryCount = 0
            const maxRetries = 3
            const verifyProfile = async () => {
              try {
                // Include credentials to ensure cookies are sent with the request
                const checkResponse = await fetch('/api/profile', {
                  credentials: 'include',
                  cache: 'no-store'
                })
                
                // Handle 401 errors specifically - might be session issue
                if (checkResponse.status === 401) {
                  console.warn('Session expired or invalid during profile verification')
                  // Don't redirect to login - just redirect to dashboard and let middleware handle it
                  // The profile was saved, so we should proceed
                  const redirectMsg: Message = {
                    id: `assistant_${Date.now()}`,
                    role: 'assistant',
                    content: "Redirecting you to your dashboard...",
                    timestamp: new Date()
                  }
                  setMessages(prev => [...prev, redirectMsg])
                  setTimeout(() => {
                    window.location.href = '/dashboard'
                  }, 500)
                  return
                }
                
                if (checkResponse.ok) {
                  const checkData = await checkResponse.json()
                  if (checkData.profile) {
                    // Profile exists - safe to redirect
                    const redirectMsg: Message = {
                      id: `assistant_${Date.now()}`,
                      role: 'assistant',
                      content: "Redirecting you to your dashboard...",
                      timestamp: new Date()
                    }
                    setMessages(prev => [...prev, redirectMsg])
                    
                    // Small delay to ensure database is ready
                    setTimeout(() => {
                      window.location.href = '/dashboard'
                    }, 1500)
                    return
                  }
                }
                
                // If profile check fails (404 or other), retry with limit
                retryCount++
                if (retryCount < maxRetries) {
                  console.warn(`Profile not found immediately after save, retrying (${retryCount}/${maxRetries})...`)
                  setTimeout(verifyProfile, 1000)
                } else {
                  // Max retries reached - refresh session before redirecting
                  console.warn('Max retries reached, refreshing session before redirect...')
                  try {
                    const { error } = await supabase.auth.getUser()
                    if (error) {
                      console.warn('Session refresh error:', error)
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000))
                  } catch (sessionError) {
                    console.warn('Session refresh error (non-fatal):', sessionError)
                  }
                  
                  const redirectMsg: Message = {
                    id: `assistant_${Date.now()}`,
                    role: 'assistant',
                    content: "Redirecting you to your dashboard...",
                    timestamp: new Date()
                  }
                  setMessages(prev => [...prev, redirectMsg])
                  setTimeout(() => {
                    window.location.href = '/dashboard'
                  }, 500)
                }
              } catch (error) {
                console.error('Error verifying profile:', error)
                retryCount++
                if (retryCount < maxRetries) {
                  setTimeout(verifyProfile, 1000)
                } else {
                  // Max retries reached - refresh session before redirecting
                  try {
                    const { error } = await supabase.auth.getUser()
                    if (error) {
                      console.warn('Session refresh error:', error)
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000))
                  } catch (sessionError) {
                    console.warn('Session refresh error (non-fatal):', sessionError)
                  }
                  
                  const redirectMsg: Message = {
                    id: `assistant_${Date.now()}`,
                    role: 'assistant',
                    content: "Redirecting you to your dashboard...",
                    timestamp: new Date()
                  }
                  setMessages(prev => [...prev, redirectMsg])
                  setTimeout(() => {
                    window.location.href = '/dashboard'
                  }, 500)
                }
              }
            }
            
            // Start verification after a brief delay
            setTimeout(verifyProfile, 1500)
            
            setIsLoading(false)
          } catch (error: any) {
            console.error('Error saving profile:', error)
            setIsLoading(false)
            
            const errorMsg: Message = {
              id: `error_${Date.now()}`,
              role: 'assistant',
              content: "I ran into a technical issue saving your profile. Please try again in a moment, or refresh the page and let me know if the problem persists.",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
          }
        } else {
          // User wants to make corrections – detect which field they mean
          if (lowerMessage.includes('email')) {
            setOnboardingState({
              ...onboardingState,
              phase: 'proofread',
              subStep: 'correct_email',
              data
            })
            const askEmailMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "Got it. What's the correct email address?",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, askEmailMsg])
            setIsLoading(false)
            return
          }
          if (lowerMessage.includes('phone') || lowerMessage.includes('number')) {
            setOnboardingState({
              ...onboardingState,
              phase: 'proofread',
              subStep: 'correct_phone',
              data
            })
            const askPhoneMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "No problem. What's the correct main phone number?",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, askPhoneMsg])
            setIsLoading(false)
            return
          }
          if (lowerMessage.includes('name') || lowerMessage.includes('business')) {
            setOnboardingState({
              ...onboardingState,
              phase: 'proofread',
              subStep: 'correct_business_name',
              data
            })
            const askNameMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "Sure thing. What should the business name be?",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, askNameMsg])
            setIsLoading(false)
            return
          }
          if (lowerMessage.includes('address') || lowerMessage.includes('location')) {
            setOnboardingState({
              ...onboardingState,
              phase: 'proofread',
              subStep: 'correct_address',
              data
            })
            const askAddressMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "Got it. What's the correct address? Please include the street address, city, and state.",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, askAddressMsg])
            setIsLoading(false)
            return
          }
          if (lowerMessage.includes('social') || lowerMessage.includes('instagram') || lowerMessage.includes('facebook') || lowerMessage.includes('linkedin')) {
            setOnboardingState({
              ...onboardingState,
              phase: 'proofread',
              subStep: 'correct_socials',
              data
            })
            const askSocialsMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "Got it. What are your social media links? Paste the URLs for Instagram, Facebook, LinkedIn, or any other platforms you use.",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, askSocialsMsg])
            setIsLoading(false)
            return
          }

          // Fallback generic correction prompt (only once)
          setOnboardingState({
            ...onboardingState,
            phase: 'proofread',
            subStep: 'correction_pending',
            data
          })
          const correctionMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Sure thing! What should I change? Just tell me what's off and what it should be instead.",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, correctionMsg])
          setIsLoading(false)
          return
        }
      }

      // Handle targeted corrections after a review/final_review
      if (phase === 'proofread' && subStep === 'correct_email') {
        const newEmailMatch = userMessage.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
        const newEmail = (newEmailMatch ? newEmailMatch[0] : userMessage.trim())
        const validation = validateCriticalField('email', newEmail)
        if (!validation.isValid) {
          const errorMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "That email still doesn't look quite right. Could you double-check it?",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, errorMsg])
          setIsLoading(false)
          return
        }

        const updatedData: Partial<BusinessProfileData> = {
          ...data,
          identity: {
            ...data.identity,
            email: newEmail
          } as BusinessProfileData['identity']
        }

        const summary = formatProofreadSummary(updatedData, onboardingState.fromWebsite, onboardingState.missing_data_report)
        setOnboardingState(prev => ({
          ...prev,
          phase: 'proofread',
          subStep: onboardingState.fromWebsite ? 'review' : 'final_review',
          data: updatedData
        }))

        const reviewMsg: Message = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: summary,
          timestamp: new Date(),
          actions: [
            { label: 'Looks Perfect', value: 'CONFIRM' },
            { label: 'Make Changes', value: 'EDIT' }
          ]
        }
        setMessages(prev => [...prev, reviewMsg])
        setIsLoading(false)
        return
      }

      if (phase === 'proofread' && subStep === 'correct_phone') {
        const newPhone = userMessage.trim()
        const validation = validateCriticalField('phone', newPhone)
        if (!validation.isValid) {
          const errorMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "That phone number looks a bit off. Could you double-check it?",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, errorMsg])
          setIsLoading(false)
          return
        }

        const updatedData: Partial<BusinessProfileData> = {
          ...data,
          identity: {
            ...data.identity,
            phone: newPhone
          } as BusinessProfileData['identity']
        }

        const summary = formatProofreadSummary(updatedData, onboardingState.fromWebsite, onboardingState.missing_data_report)
        setOnboardingState(prev => ({
          ...prev,
          phase: 'proofread',
          subStep: onboardingState.fromWebsite ? 'review' : 'final_review',
          data: updatedData
        }))

        const reviewMsg: Message = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: summary,
          timestamp: new Date(),
          actions: [
            { label: 'Looks Perfect', value: 'CONFIRM' },
            { label: 'Make Changes', value: 'EDIT' }
          ]
        }
        setMessages(prev => [...prev, reviewMsg])
        setIsLoading(false)
        return
      }

      if (phase === 'proofread' && subStep === 'correct_business_name') {
        const newName = userMessage.trim()
        const validation = validateCriticalField('business_name', newName)
        if (!validation.isValid && validation.suggestion) {
          const verifyMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: `Just to be safe, did you mean "${validation.suggestion}"?`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, verifyMsg])
          // Keep subStep as correct_business_name; next reply will overwrite
          setIsLoading(false)
          return
        }

        const updatedData: Partial<BusinessProfileData> = {
          ...data,
          identity: {
            ...data.identity,
            business_name: validation.suggestion || newName
          } as BusinessProfileData['identity']
        }

        const summary = formatProofreadSummary(updatedData, onboardingState.fromWebsite, onboardingState.missing_data_report)
        setOnboardingState(prev => ({
          ...prev,
          phase: 'proofread',
          subStep: onboardingState.fromWebsite ? 'review' : 'final_review',
          data: updatedData
        }))

        const reviewMsg: Message = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: summary,
          timestamp: new Date(),
          actions: [
            { label: 'Looks Perfect', value: 'CONFIRM' },
            { label: 'Make Changes', value: 'EDIT' }
          ]
        }
        setMessages(prev => [...prev, reviewMsg])
        setIsLoading(false)
        return
      }

      if (phase === 'proofread' && subStep === 'correction_pending') {
        // User provided more details - try to detect what field they're correcting
        const lower = userMessage.toLowerCase()
        
        if (lower.includes('email')) {
          setOnboardingState({
            ...onboardingState,
            phase: 'proofread',
            subStep: 'correct_email',
            data
          })
          const askEmailMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Got it. What's the correct email address?",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, askEmailMsg])
          setIsLoading(false)
          return
        }
        if (lower.includes('phone') || lower.includes('number')) {
          setOnboardingState({
            ...onboardingState,
            phase: 'proofread',
            subStep: 'correct_phone',
            data
          })
          const askPhoneMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "No problem. What's the correct main phone number?",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, askPhoneMsg])
          setIsLoading(false)
          return
        }
        if (lower.includes('name') || lower.includes('business')) {
          setOnboardingState({
            ...onboardingState,
            phase: 'proofread',
            subStep: 'correct_business_name',
            data
          })
          const askNameMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Sure thing. What should the business name be?",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, askNameMsg])
          setIsLoading(false)
          return
        }
        if (lower.includes('address') || lower.includes('location')) {
          setOnboardingState({
            ...onboardingState,
            phase: 'proofread',
            subStep: 'correct_address',
            data
          })
          const askAddressMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Got it. What's the correct address? Please include the street address, city, and state.",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, askAddressMsg])
          setIsLoading(false)
          return
        }
        if (lower.includes('social') || lower.includes('instagram') || lower.includes('facebook') || lower.includes('linkedin')) {
          setOnboardingState({
            ...onboardingState,
            phase: 'proofread',
            subStep: 'correct_socials',
            data
          })
          const askSocialsMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Got it. What are your social media links? Paste the URLs for Instagram, Facebook, LinkedIn, or any other platforms you use.",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, askSocialsMsg])
          setIsLoading(false)
          return
        }
        
        // If we still can't detect, re-show the summary
        const summary = formatProofreadSummary(data, onboardingState.fromWebsite, onboardingState.missing_data_report)
        setOnboardingState(prev => ({
          ...prev,
          phase: 'proofread',
          subStep: onboardingState.fromWebsite ? 'review' : 'final_review'
        }))

        const reviewMsg: Message = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: summary,
          timestamp: new Date(),
          actions: [
            { label: 'Looks Perfect', value: 'CONFIRM' },
            { label: 'Make Changes', value: 'EDIT' }
          ]
        }
        setMessages(prev => [...prev, reviewMsg])
        setIsLoading(false)
        return
      }

      // Handle address correction
      if (phase === 'proofread' && subStep === 'correct_address') {
        const newAddress = userMessage.trim()
        
        // Check if state is included (flexible format detection)
        if (!hasStateInLocation(newAddress)) {
          // Has street but missing state - ask for it
          const updatedData = {
            ...data,
            identity: {
              ...data.identity,
              address_or_area: newAddress
            } as BusinessProfileData['identity']
          }
          
          setOnboardingState({
            ...onboardingState,
            phase: 'proofread',
            subStep: 'correct_address_state',
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

        const updatedData: Partial<BusinessProfileData> = {
          ...data,
          identity: {
            ...data.identity,
            address_or_area: newAddress
          } as BusinessProfileData['identity']
        }

        const summary = formatProofreadSummary(updatedData, onboardingState.fromWebsite, onboardingState.missing_data_report)
        setOnboardingState(prev => ({
          ...prev,
          phase: 'proofread',
          subStep: onboardingState.fromWebsite ? 'review' : 'final_review',
          data: updatedData
        }))

        const reviewMsg: Message = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: summary,
          timestamp: new Date(),
          actions: [
            { label: 'Looks Perfect', value: 'CONFIRM' },
            { label: 'Make Changes', value: 'EDIT' }
          ]
        }
        setMessages(prev => [...prev, reviewMsg])
        setIsLoading(false)
        return
      }

      // Handle address state correction
      if (phase === 'proofread' && subStep === 'correct_address_state') {
        const address = data.identity?.address_or_area || ''
        const state = userMessage.trim()
        const fullAddress = `${address}, ${state}`

        const updatedData: Partial<BusinessProfileData> = {
          ...data,
          identity: {
            ...data.identity,
            address_or_area: fullAddress
          } as BusinessProfileData['identity']
        }

        const summary = formatProofreadSummary(updatedData, onboardingState.fromWebsite, onboardingState.missing_data_report)
        setOnboardingState(prev => ({
          ...prev,
          phase: 'proofread',
          subStep: onboardingState.fromWebsite ? 'review' : 'final_review',
          data: updatedData
        }))

        const reviewMsg: Message = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: summary,
          timestamp: new Date(),
          actions: [
            { label: 'Looks Perfect', value: 'CONFIRM' },
            { label: 'Make Changes', value: 'EDIT' }
          ]
        }
        setMessages(prev => [...prev, reviewMsg])
        setIsLoading(false)
        return
      }

      // Handle social links correction
      if (phase === 'proofread' && subStep === 'correct_socials') {
        // Extract URLs from the message
        const urlMatches = userMessage.match(/(https?:\/\/[^\s]+)/gi) || []
        const socialLinks = urlMatches.length > 0 ? urlMatches : 
          (userMessage.toLowerCase().includes('no') || userMessage.toLowerCase().includes('none') || userMessage.toLowerCase().includes("don't") ? [] : [userMessage.trim()])
        
        const updatedData: Partial<BusinessProfileData> = {
          ...data,
          identity: {
            ...data.identity,
            social_links: socialLinks
          } as BusinessProfileData['identity']
        }

        const summary = formatProofreadSummary(updatedData, onboardingState.fromWebsite, onboardingState.missing_data_report)
        setOnboardingState(prev => ({
          ...prev,
          phase: 'proofread',
          subStep: onboardingState.fromWebsite ? 'review' : 'final_review',
          data: updatedData
        }))

        const reviewMsg: Message = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: summary,
          timestamp: new Date(),
          actions: [
            { label: 'Looks Perfect', value: 'CONFIRM' },
            { label: 'Make Changes', value: 'EDIT' }
          ]
        }
        setMessages(prev => [...prev, reviewMsg])
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
      // Validate required fields before attempting to save
      if (!data.identity?.business_name || data.identity.business_name.trim() === '') {
        throw new Error('Business name is required')
      }
      
      if (!data.offering?.core_services || data.offering.core_services.length === 0) {
        throw new Error('At least one service is required')
      }
      
      // Convert to the format expected by the API
      const profileData = {
        businessName: data.identity.business_name.trim(),
        industry: data.offering.core_services.join(', ') || 'General Services', // Use services as industry
        location: {
          address: data.identity.address_or_area || '',
          city: '',
          state: '',
          zipCode: '',
          country: 'US'
        },
        contactInfo: {
          phone: data.identity.phone || '',
          email: data.identity.email || '',
          website: data.identity.website || ''
        },
        services: data.offering.core_services.map(s => ({ name: s, description: '' })),
        hours: [],
        brandVoice: 'professional' as const,
        targetAudience: data.offering.target_audience || '',
        customAttributes: [
          { label: 'Archetype', value: data.archetype || '' },
          { label: 'Owner', value: data.credibility?.owner_name || '' },
          { label: 'Payment Methods', value: (data.logistics?.payment_methods || []).join(', ') },
          { label: 'Booking Policy', value: data.logistics?.booking_policy || data.logistics?.specific_policy || '' }
        ].filter(attr => attr.value) // Only include attributes with values
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
        const errorMessage = errorData.error || `Failed to save profile (${response.status})`
        console.error('API error response:', { 
          status: response.status, 
          statusText: response.statusText,
          errorData, 
          profileData: {
            businessName: profileData.businessName,
            industry: profileData.industry,
            hasServices: profileData.services?.length > 0
          }
        })
        throw new Error(errorMessage)
      }
      
      const result = await response.json()
      console.log('Profile saved successfully:', result)
      return result
    } catch (error: any) {
      console.error('Error saving profile:', error)
      // Re-throw with a more user-friendly message if it's a validation error
      if (error.message && (error.message.includes('required') || error.message.includes('Validation'))) {
        throw new Error(error.message)
      }
      // Re-throw with a user-friendly message for database errors
      if (error.message && (error.message.includes('Supabase') || error.message.includes('insert') || error.message.includes('Database'))) {
        throw new Error('Database connection issue. Please try again in a moment.')
      }
      throw error
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSend(inputValue)
  }

  return (
    <div className={`onboarding-chat flex flex-col h-full ${className}`}>
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`${message.isProfileReport ? 'max-w-5xl w-full' : 'max-w-2xl'} rounded-3xl px-5 py-4 shadow-lg transform transition-transform hover:scale-[1.02] ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-br-md'
                  : message.isProfileReport
                  ? 'bg-gradient-to-br from-white to-purple-50 text-gray-800 border-2 border-purple-200 rounded-bl-md shadow-xl'
                  : 'bg-white text-gray-800 border-2 border-purple-100 rounded-bl-md'
              }`}
            >
              {message.isProfileReport ? (
                <div className="prose prose-sm sm:prose-base max-w-none markdown-report">
                  <div className="mb-4 pb-3 border-b-2 border-purple-200">
                    <div className="flex items-center gap-2 text-purple-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm font-semibold uppercase tracking-wide">Master Dossier</span>
                    </div>
                  </div>
                  <ReactMarkdown
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-6 mt-2 text-gray-900 border-b-2 border-purple-200 pb-2" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-800" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-700" {...props} />,
                      p: ({node, ...props}) => <p className="mb-4 text-gray-700 leading-relaxed" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-outside mb-4 ml-6 space-y-2 text-gray-700" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-outside mb-4 ml-6 space-y-2 text-gray-700" {...props} />,
                      li: ({node, ...props}) => <li className="ml-2" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                      em: ({node, ...props}) => <em className="italic text-gray-600" {...props} />,
                      hr: ({node, ...props}) => <hr className="my-6 border-gray-300" {...props} />,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
              )}
              
              {/* Action Buttons - only show for assistant messages with actions that haven't been clicked */}
              {message.role === 'assistant' && message.actions && !message.actionClicked && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {message.actions.map((action) => (
                    <button
                      key={action.value}
                      onClick={() => handleActionClick(message.id, action.value)}
                      disabled={isLoading || isComplete}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-md hover:shadow-lg text-sm"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
              
              <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-200 rounded-3xl rounded-bl-md px-6 py-4 shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-xl">💭</span>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="ml-2 text-purple-700 font-medium">Navi is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t-2 border-purple-200 bg-white/90 backdrop-blur-sm px-4 sm:px-6 py-4 shadow-lg">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your answer... 💬"
            className="flex-1 px-5 py-4 border-2 border-purple-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all shadow-sm"
            disabled={isLoading || isComplete}
          />
          <button
            type="submit"
            disabled={isLoading || isComplete || !inputValue.trim()}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-2xl hover:from-purple-600 hover:to-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Send ✨
          </button>
        </form>
      </div>
    </div>
  )
}
