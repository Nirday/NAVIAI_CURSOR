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
  phase: 'discovery' | 'storefront' | 'menu' | 'locals' | 'counter' | 'proofread' | 'complete'
  subStep: string
  archetype: Archetype
  data: Partial<BusinessProfileData>
  needsVerification: {
    field?: string
    value?: string
    suggestion?: string
  } | null
}

export default function OnboardingChatInterface({ userId, className = '' }: OnboardingChatInterfaceProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    phase: 'discovery',
    subStep: 'business_type',
    archetype: null,
    data: {},
    needsVerification: null
  })
  const [isComplete, setIsComplete] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMsg: Message = {
        id: 'welcome',
        role: 'assistant',
        content: "Hey there! To get started, just tell me in a few words—what kind of business do you run?",
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
      if (!value.includes('@') || !value.includes('.')) {
        return { isValid: false, suggestion: undefined }
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
  const formatProofreadSummary = (data: Partial<BusinessProfileData>): string => {
    let summary = "Okay, I think I have everything! Before I lock this in, I want to make sure I didn't make any typos.\n\n"
    summary += "Please review this summary carefully:\n\n"
    
    if (data.identity?.business_name) {
      summary += `**Business:** ${data.identity.business_name}\n`
    }
    if (data.identity?.phone) {
      summary += `**Contact:** ${data.identity.phone}`
      if (data.identity?.email) {
        summary += ` | ${data.identity.email}`
      }
      summary += "\n"
    }
    if (data.identity?.address_or_area) {
      summary += `**Location:** ${data.identity.address_or_area}\n`
    }
    if (data.offering?.core_services && data.offering.core_services.length > 0) {
      summary += `**Services:** ${data.offering.core_services.join(', ')}\n`
    }
    if (data.credibility?.owner_name) {
      summary += `**Owner:** ${data.credibility.owner_name}\n`
    }
    
    summary += "\nDoes the spelling of your Business Name, Phone Number, and Email look 100% perfect?\n"
    summary += "If you see any double letters or typos, just let me know and I'll fix it right now."
    
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
            setOnboardingState({
              ...onboardingState,
              phase: 'storefront',
              subStep: 'email',
              data: updatedData,
              needsVerification: null
            })
            
            const emailMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "Perfect. And what's the best Email address for clients to reach you?",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, emailMsg])
            setIsLoading(false)
            return
          } else if (needsVerification.field === 'email') {
            setOnboardingState({
              ...onboardingState,
              phase: 'menu',
              subStep: 'services',
              data: updatedData,
              needsVerification: null
            })
            
            const servicesMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: "Perfect. Now let's talk about what you actually do. When a customer contacts you, what are the top 3-5 Services or Products they are asking for?",
              timestamp: new Date()
            }
            setMessages(prev => [...prev, servicesMsg])
            setIsLoading(false)
            return
          }
      }

      // Phase 0: Discovery - Detect archetype
      if (phase === 'discovery' && subStep === 'business_type') {
        const detectedArchetype = detectArchetype(userMessage)
        const archetypeNames = {
          'BrickAndMortar': 'Brick & Mortar',
          'ServiceOnWheels': 'Service on Wheels',
          'AppointmentPro': 'Appointment Pro'
        }
        
        setOnboardingState({
          phase: 'storefront',
          subStep: 'business_name',
          archetype: detectedArchetype,
          data: { ...data, archetype: detectedArchetype },
          needsVerification: null
        })

        const archetypeMsg: Message = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: `Got it! That sounds like a ${archetypeNames[detectedArchetype]} business. Let's get the basics down so people can find you. What is the official Business Name? (Please double-check the spelling/spacing so I get it right!)`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, archetypeMsg])
        setIsLoading(false)
        return
      }

      // Phase 1: Storefront
      if (phase === 'storefront') {
        if (subStep === 'business_name') {
          const validation = validateCriticalField('business_name', userMessage)
          if (!validation.isValid && validation.suggestion) {
            setOnboardingState({
              ...onboardingState,
              needsVerification: {
                field: 'business_name',
                value: userMessage,
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
              business_name: validation.suggestion || userMessage.trim(),
              phone: '',
              email: '',
              website: '',
              hours: '',
              address_or_area: ''
            } as BusinessProfileData['identity']
          }
          
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
          const updatedData = {
            ...data,
            identity: {
              ...data.identity,
              address_or_area: userMessage.trim()
            } as BusinessProfileData['identity']
          }
          
          setOnboardingState({
            ...onboardingState,
            phase: 'storefront',
            subStep: 'hours_phone',
            data: updatedData
          })
          
          const hoursMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Also, what are your standard Opening Hours and the best Phone Number for clients to call?",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, hoursMsg])
          setIsLoading(false)
          return
        }
        
        if (subStep === 'hours_phone') {
          // Try to extract phone number (look for 10+ digit pattern)
          const phoneMatch = userMessage.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/)
          const phone = phoneMatch ? phoneMatch[0] : userMessage.trim()
          const hours = phoneMatch ? userMessage.replace(phoneMatch[0], '').trim() : userMessage.trim()
          
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
              content: "That phone number looks a bit off. Could you double-check it? I want to make sure clients can reach you.",
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
              phone: phone,
              hours: hours || ''
            } as BusinessProfileData['identity']
          }
          
          setOnboardingState({
            ...onboardingState,
            phase: 'storefront',
            subStep: 'email',
            data: updatedData
          })
          
          const emailMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Perfect. And what's the best Email address for clients to reach you?",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, emailMsg])
          setIsLoading(false)
          return
        }
        
        if (subStep === 'email') {
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
          
          // Move to Phase 2: Menu
          setOnboardingState({
            ...onboardingState,
            phase: 'menu',
            subStep: 'services',
            data: updatedData
          })
          
          const servicesMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "Perfect. Now let's talk about what you actually do. When a customer contacts you, what are the top 3-5 Services or Products they are asking for?",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, servicesMsg])
          setIsLoading(false)
          return
        }
      }

      // Phase 2: Menu
      if (phase === 'menu') {
        if (subStep === 'services') {
          const services = userMessage.split(/[,;]|and/).map(s => s.trim()).filter(s => s.length > 0).slice(0, 5)
          
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
            subStep: 'vibe',
            data: updatedData
          })
          
          const vibeMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "And briefly, how would you describe the Vibe or the specific type of customer you love working with? (e.g., 'High-end luxury', 'Family-friendly and affordable', 'Emergency response').",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, vibeMsg])
          setIsLoading(false)
          return
        }
        
        if (subStep === 'vibe') {
          const updatedData = {
            ...data,
            offering: {
              ...data.offering,
              target_audience: userMessage.trim(),
              vibe_mission: userMessage.trim()
            } as BusinessProfileData['offering']
          }
          
          // Move to Phase 3: Locals
          setOnboardingState({
            ...onboardingState,
            phase: 'locals',
            subStep: 'owner_name',
            data: updatedData
          })
          
          const ownerMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "In a local business, faces matter. Who is the Owner or Lead Expert here? (Please check the spelling of the name closely).",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, ownerMsg])
          setIsLoading(false)
          return
        }
      }

      // Phase 3: Locals
      if (phase === 'locals') {
        if (subStep === 'owner_name') {
          const validation = validateCriticalField('business_name', userMessage)
          const ownerName = validation.suggestion || userMessage.trim()
          
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
          
          // Move to Phase 5: Proofread
          setOnboardingState({
            ...onboardingState,
            phase: 'proofread',
            subStep: 'review',
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

      // Phase 5: Proofread
      if (phase === 'proofread' && subStep === 'review') {
        if (lowerMessage === 'yes' || lowerMessage === 'y' || lowerMessage === 'correct' || lowerMessage.includes('looks good') || lowerMessage.includes('perfect')) {
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
