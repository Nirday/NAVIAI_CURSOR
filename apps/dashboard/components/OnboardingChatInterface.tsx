/**
 * Onboarding Chat Interface Component
 * Proactively asks targeted questions to gather SMB business information
 * Includes website scraping with progress indicator
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

interface ScrapedData {
  businessName?: string
  industry?: string
  location?: { address?: string; city?: string; state?: string; zipCode?: string; country?: string }
  contactInfo?: { phone?: string; email?: string; website?: string }
  services?: { name: string; description: string; price?: string }[]
  hours?: { day: string; open: string; close: string }[]
  brandVoice?: string
  targetAudience?: string
  customAttributes?: { label: string; value: string }[]
}

interface OnboardingState {
  step: string
  collectedData: {
    businessName?: string
    industry?: string
    location?: { city?: string; state?: string; country?: string }
    website?: string
    services?: string[]
    targetAudience?: string
    currentPresence?: string[]
    goals?: string[]
    brandVoice?: string
  }
  scrapedData?: ScrapedData
  isScraping?: boolean
  scrapingProgress?: string
  estimatedTimeLeft?: number
}

const ONBOARDING_QUESTIONS = {
  welcome: {
    message: "Hi, I'm Navi. I'll help you get set up. What's your business name?",
    field: 'businessName'
  },
  hasWebsite: {
    message: "Do you have a website? If you do, I can grab most of the info from there.",
    field: 'hasWebsite'
  },
  websiteUrl: {
    message: "What's the website address?",
    field: 'website'
  },
  industry: {
    message: "What kind of business is it?",
    field: 'industry'
  },
  location: {
    message: "Where are you located? City and state works.",
    field: 'location'
  },
  services: {
    message: "What do you sell or what services do you provide?",
    field: 'services'
  },
  targetAudience: {
    message: "Who are you trying to reach? Who's your ideal customer?",
    field: 'targetAudience'
  },
  currentPresence: {
    message: "Are you on social media at all?",
    field: 'currentPresence'
  },
  goals: {
    message: "What are you looking to accomplish? More customers, better visibility, that kind of thing?",
    field: 'goals'
  },
  brandVoice: {
    message: "How would you describe your brand? More casual or more professional?",
    field: 'brandVoice'
  },
  confirmScraped: {
    message: "Here's what I pulled from your website. Does this look right, or should I change anything?"
  },
  complete: {
    message: "Got it. Setting everything up now."
  }
}

export default function OnboardingChatInterface({ userId, className = '' }: OnboardingChatInterfaceProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    step: 'welcome',
    collectedData: {}
  })
  const [isComplete, setIsComplete] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMsg: Message = {
        id: 'welcome',
        role: 'assistant',
        content: ONBOARDING_QUESTIONS.welcome.message,
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

  // Scrape website with progress updates
  const scrapeWebsite = async (url: string) => {
    setOnboardingState(prev => ({ ...prev, isScraping: true, scrapingProgress: 'Connecting to website...', estimatedTimeLeft: 30 }))
    
    // Simulate progress updates
    const progressSteps = [
      { progress: 'Connecting to website...', time: 5 },
      { progress: 'Downloading website content...', time: 10 },
      { progress: 'Analyzing business information...', time: 10 },
      { progress: 'Extracting details...', time: 5 }
    ]

    let totalTime = 0
    for (const step of progressSteps) {
      setOnboardingState(prev => ({ 
        ...prev, 
        scrapingProgress: step.progress,
        estimatedTimeLeft: 30 - totalTime
      }))
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate delay
      totalTime += step.time
    }

    try {
      const response = await fetch('/api/onboarding/scrape-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to scrape website')
      }

      const result = await response.json()
      const scrapedData = result.data

      setOnboardingState(prev => ({ 
        ...prev, 
        isScraping: false,
        scrapedData,
        scrapingProgress: undefined,
        estimatedTimeLeft: undefined
      }))

      // Pre-fill collected data from scraped data
      const updatedData = {
        ...onboardingState.collectedData,
        businessName: scrapedData.businessName || onboardingState.collectedData.businessName,
        industry: scrapedData.industry || onboardingState.collectedData.industry,
        website: url,
        location: scrapedData.location ? {
          city: scrapedData.location.city || onboardingState.collectedData.location?.city,
          state: scrapedData.location.state || onboardingState.collectedData.location?.state,
          country: scrapedData.location.country || onboardingState.collectedData.location?.country || 'US'
        } : onboardingState.collectedData.location,
        services: scrapedData.services?.map((s: any) => s.name) || onboardingState.collectedData.services,
        targetAudience: scrapedData.targetAudience || onboardingState.collectedData.targetAudience,
        brandVoice: scrapedData.brandVoice || onboardingState.collectedData.brandVoice
      }

      setOnboardingState(prev => ({ ...prev, collectedData: updatedData }))

      return scrapedData
    } catch (error: any) {
      setOnboardingState(prev => ({ 
        ...prev, 
        isScraping: false,
        scrapingProgress: undefined,
        estimatedTimeLeft: undefined
      }))
      throw error
    }
  }

  // Extract information from user response
  const extractInformation = (step: string, userMessage: string): Partial<OnboardingState['collectedData']> => {
    const lowerMessage = userMessage.toLowerCase().trim()

    switch (step) {
      case 'businessName':
        return { businessName: userMessage.trim() }

      case 'hasWebsite':
        // This is handled separately in handleSend
        return {}

      case 'website':
        return { website: userMessage.trim() }

      case 'industry':
        return { industry: userMessage.trim() }

      case 'location':
        const locationParts = userMessage.split(',').map(s => s.trim())
        return {
          location: {
            city: locationParts[0] || '',
            state: locationParts[1] || '',
            country: locationParts[2] || 'US'
          }
        }

      case 'services':
        const services = userMessage.split(/[,;]|and/).map(s => s.trim()).filter(s => s.length > 0)
        return { services }

      case 'targetAudience':
        return { targetAudience: userMessage.trim() }

      case 'currentPresence':
        const presence: string[] = []
        if (lowerMessage.includes('facebook')) presence.push('Facebook')
        if (lowerMessage.includes('instagram')) presence.push('Instagram')
        if (lowerMessage.includes('linkedin')) presence.push('LinkedIn')
        if (lowerMessage.includes('twitter') || lowerMessage.includes('x.com')) presence.push('Twitter')
        if (lowerMessage.includes('tiktok')) presence.push('TikTok')
        if (lowerMessage.includes('google') || lowerMessage.includes('gmb') || lowerMessage.includes('business profile')) presence.push('Google Business')
        if (lowerMessage === 'no' || lowerMessage === "don't" || lowerMessage === "don't have" || lowerMessage === 'none') {
          return { currentPresence: [] }
        }
        return { currentPresence: presence.length > 0 ? presence : [userMessage.trim()] }

      case 'goals':
        const goals = userMessage.split(/[,;]|and/).map(s => s.trim()).filter(s => s.length > 0)
        return { goals }

      case 'brandVoice':
        if (lowerMessage.includes('friendly') || lowerMessage.includes('casual') || lowerMessage.includes('warm')) {
          return { brandVoice: 'friendly' }
        }
        if (lowerMessage.includes('professional') || lowerMessage.includes('formal') || lowerMessage.includes('serious')) {
          return { brandVoice: 'professional' }
        }
        if (lowerMessage.includes('witty') || lowerMessage.includes('humor') || lowerMessage.includes('funny')) {
          return { brandVoice: 'witty' }
        }
        if (lowerMessage.includes('formal') || lowerMessage.includes('corporate')) {
          return { brandVoice: 'formal' }
        }
        return { brandVoice: 'professional' }

      default:
        return {}
    }
  }

  // Get next step in onboarding flow
  const getNextStep = (currentStep: string, hasScrapedData: boolean): string => {
    // If we have scraped data, skip questions that were already answered
    if (hasScrapedData && onboardingState.scrapedData) {
      const scraped = onboardingState.scrapedData
      const flow = ['welcome', 'businessName', 'hasWebsite']
      
      // Add website URL step if they said yes
      if (currentStep === 'hasWebsite') {
        return 'websiteUrl'
      }
      
      // After scraping, go to confirmation
      if (currentStep === 'websiteUrl') {
        return 'confirmScraped'
      }
      
      // After confirmation, skip to unanswered questions
      if (currentStep === 'confirmScraped') {
        // Check what's missing
        if (!scraped.services || scraped.services.length === 0) return 'services'
        if (!scraped.targetAudience) return 'targetAudience'
        if (!scraped.location?.city && !scraped.location?.state) return 'location'
        return 'currentPresence'
      }
      
      // Continue with remaining questions
      const remainingFlow = ['services', 'targetAudience', 'location', 'currentPresence', 'goals', 'brandVoice']
      const currentIndex = remainingFlow.indexOf(currentStep)
      if (currentIndex >= 0 && currentIndex < remainingFlow.length - 1) {
        return remainingFlow[currentIndex + 1]
      }
      if (currentStep === 'brandVoice') return 'complete'
    }
    
    // Normal flow without scraping
    const flow = [
      'welcome',
      'businessName',
      'hasWebsite',
      'websiteUrl',
      'industry',
      'location',
      'services',
      'targetAudience',
      'currentPresence',
      'goals',
      'brandVoice',
      'complete'
    ]
    const currentIndex = flow.indexOf(currentStep)
    return flow[currentIndex + 1] || 'complete'
  }

  // Format scraped data for display
  const formatScrapedData = (data: ScrapedData): string => {
    let formatted = "Here's what I found on your website:\n\n"
    
    if (data.businessName) formatted += `**Name:** ${data.businessName}\n`
    if (data.industry) formatted += `**Type:** ${data.industry}\n`
    if (data.location) {
      const loc = data.location
      const locationParts = [loc.address, loc.city, loc.state, loc.zipCode].filter(Boolean)
      if (locationParts.length > 0) {
        formatted += `**Location:** ${locationParts.join(', ')}\n`
      }
    }
    if (data.contactInfo) {
      const contact = data.contactInfo
      if (contact.phone) formatted += `**Phone:** ${contact.phone}\n`
      if (contact.email) formatted += `**Email:** ${contact.email}\n`
    }
    if (data.services && data.services.length > 0) {
      formatted += `**Services:** ${data.services.map(s => s.name).join(', ')}\n`
    }
    if (data.targetAudience) formatted += `**Target Customers:** ${data.targetAudience}\n`
    if (data.brandVoice) formatted += `**Brand Style:** ${data.brandVoice}\n`
    if (data.hours && data.hours.length > 0) {
      formatted += `**Hours:** ${data.hours.map(h => `${h.day}: ${h.open} - ${h.close}`).join(', ')}\n`
    }
    
    formatted += "\n\nDoes this look right? Say yes if it's good, or tell me what to change."
    return formatted
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
      const currentStep = onboardingState.step
      const lowerMessage = userMessage.toLowerCase().trim()

      // Handle "has website" question
      if (currentStep === 'hasWebsite') {
        if (lowerMessage === 'yes' || lowerMessage === 'y' || lowerMessage === 'yeah' || lowerMessage === 'sure') {
          const nextStep = 'websiteUrl'
          setOnboardingState(prev => ({ ...prev, step: nextStep }))
          
          const assistantMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: ONBOARDING_QUESTIONS.websiteUrl.message,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, assistantMsg])
          setIsLoading(false)
          return
        } else {
          // No website, skip to industry
          const extracted = extractInformation('businessName', onboardingState.collectedData.businessName || '')
          const updatedData = { ...onboardingState.collectedData, ...extracted }
          const nextStep = 'industry'
          
          setOnboardingState({
            step: nextStep,
            collectedData: updatedData
          })

          const assistantMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: ONBOARDING_QUESTIONS.industry.message,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, assistantMsg])
          setIsLoading(false)
          return
        }
      }

      // Handle website URL and scraping
      if (currentStep === 'websiteUrl') {
        const url = userMessage.trim()
        // Extract URL if user provided it in text
        const urlMatch = url.match(/(https?:\/\/[^\s]+)/)
        const websiteUrl = urlMatch ? urlMatch[0] : url

          // Show scraping message
        const scrapingMsg: Message = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: `Checking out your website now. Give me about 30 seconds.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, scrapingMsg])

        try {
          const scrapedData = await scrapeWebsite(websiteUrl)
          
          // Show scraped data for confirmation
          const confirmMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: formatScrapedData(scrapedData),
            timestamp: new Date()
          }
          setMessages(prev => [...prev, confirmMsg])
          
          setOnboardingState(prev => ({ ...prev, step: 'confirmScraped' }))
          setIsLoading(false)
          return
        } catch (error: any) {
          const errorMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: `Couldn't access your website (${error.message}). No big deal, we'll just fill this out manually. ${ONBOARDING_QUESTIONS.industry.message}`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, errorMsg])
          
          const extracted = extractInformation('website', websiteUrl)
          const updatedData = { ...onboardingState.collectedData, ...extracted }
          setOnboardingState({
            step: 'industry',
            collectedData: updatedData
          })
          setIsLoading(false)
          return
        }
      }

      // Handle confirmation of scraped data
      if (currentStep === 'confirmScraped') {
        if (lowerMessage === 'yes' || lowerMessage === 'y' || lowerMessage === 'correct' || lowerMessage === 'looks good') {
          // Data confirmed, continue with remaining questions
          const nextStep = getNextStep('confirmScraped', true)
          const nextQuestion = ONBOARDING_QUESTIONS[nextStep as keyof typeof ONBOARDING_QUESTIONS]
          
          if (nextQuestion && nextStep !== 'complete') {
            const assistantMsg: Message = {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: nextQuestion.message,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, assistantMsg])
            setOnboardingState(prev => ({ ...prev, step: nextStep }))
            setIsLoading(false)
            return
          }
        } else {
          // User wants to correct something - ask what to change
          const correctionMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: "What needs to be changed? Just tell me what's wrong and what it should be.",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, correctionMsg])
          setIsLoading(false)
          return
        }
      }

      // Extract information from user response
      const extracted = extractInformation(currentStep, userMessage)
      const updatedData = {
        ...onboardingState.collectedData,
        ...extracted
      }

      const nextStep = getNextStep(currentStep, !!onboardingState.scrapedData)

      // Update state
      setOnboardingState({
        step: nextStep,
        collectedData: updatedData,
        scrapedData: onboardingState.scrapedData
      })

      // If we're completing, save the profile
      if (nextStep === 'complete') {
        try {
          await saveProfile(updatedData)
          setIsComplete(true)
          
          const completeMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: ONBOARDING_QUESTIONS.complete.message,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, completeMsg])

          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        } catch (error) {
          const errorMsg: Message = {
            id: `error_${Date.now()}`,
            role: 'assistant',
            content: "Had trouble saving that. Let's try again: " + ONBOARDING_QUESTIONS[onboardingState.step as keyof typeof ONBOARDING_QUESTIONS]?.message || "Can you answer that again?",
            timestamp: new Date()
          }
          setMessages(prev => [...prev, errorMsg])
          setOnboardingState({
            step: onboardingState.step,
            collectedData: onboardingState.collectedData,
            scrapedData: onboardingState.scrapedData
          })
        }
      } else {
        // Ask next question
        const nextQuestion = ONBOARDING_QUESTIONS[nextStep as keyof typeof ONBOARDING_QUESTIONS]
        if (nextQuestion) {
          const assistantMsg: Message = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: nextQuestion.message,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, assistantMsg])
        }
      }
    } catch (error) {
      console.error('Error processing onboarding:', error)
      const errorMsg: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: "Something went wrong there. Let's try again: " + ONBOARDING_QUESTIONS[onboardingState.step as keyof typeof ONBOARDING_QUESTIONS]?.message || "Can you answer that again?",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  // Save profile to backend
  const saveProfile = async (data: OnboardingState['collectedData']) => {
    try {
      // Merge scraped data if available
      const finalData = {
        ...data,
        ...(onboardingState.scrapedData && {
          businessName: data.businessName || onboardingState.scrapedData.businessName,
          industry: data.industry || onboardingState.scrapedData.industry,
          location: {
            city: data.location?.city || onboardingState.scrapedData.location?.city || '',
            state: data.location?.state || onboardingState.scrapedData.location?.state || '',
            country: data.location?.country || onboardingState.scrapedData.location?.country || 'US',
            address: onboardingState.scrapedData.location?.address || '',
            zipCode: onboardingState.scrapedData.location?.zipCode || ''
          },
          contactInfo: {
            email: onboardingState.scrapedData.contactInfo?.email || '',
            phone: onboardingState.scrapedData.contactInfo?.phone || '',
            website: data.website || onboardingState.scrapedData.contactInfo?.website
          },
          services: (() => {
            const servicesList = data.services || onboardingState.scrapedData.services?.map((s: any) => s.name) || []
            return servicesList.map((s: any) => 
              typeof s === 'string' ? { name: s, description: '' } : s
            )
          })(),
          targetAudience: data.targetAudience || onboardingState.scrapedData.targetAudience || '',
          brandVoice: (data.brandVoice || onboardingState.scrapedData.brandVoice || 'professional') as 'friendly' | 'professional' | 'witty' | 'formal',
          customAttributes: [
            ...(data.currentPresence || []).map(p => ({ label: 'Online Presence', value: p })),
            ...(data.goals || []).map(g => ({ label: 'Goal', value: g }))
          ]
        })
      }

      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          profileData: finalData
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save profile')
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

  // Calculate total questions (varies based on whether they have a website)
  const totalQuestions = onboardingState.scrapedData ? 6 : 9
  const completedQuestions = (() => {
    const data = onboardingState.collectedData
    let count = 0
    if (data.businessName) count++
    if (data.industry) count++
    if (data.location?.city || data.location?.state) count++
    if (data.services && data.services.length > 0) count++
    if (data.targetAudience) count++
    if (data.currentPresence !== undefined) count++
    if (data.goals && data.goals.length > 0) count++
    if (data.brandVoice) count++
    if (data.website || onboardingState.scrapedData) count++
    return count
  })()

  return (
    <div className={`onboarding-chat flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-2xl ${message.role === 'user' ? 'ml-auto' : 'mr-auto'}`}>
              <div
                className={`
                  px-5 py-3 rounded-2xl
                  ${message.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-sm' 
                    : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm shadow-sm'
                  }
                `}
              >
                <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
                  {message.content}
                </p>
                <div className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Scraping progress indicator */}
        {onboardingState.isScraping && (
          <div className="flex justify-start">
            <div className="max-w-2xl">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">{onboardingState.scrapingProgress}</p>
                    {onboardingState.estimatedTimeLeft && (
                      <p className="text-xs text-blue-600 mt-1">Estimated time left: ~{onboardingState.estimatedTimeLeft} seconds</p>
                    )}
                  </div>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${100 - (onboardingState.estimatedTimeLeft || 0) / 30 * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Typing indicator */}
        {isLoading && !onboardingState.isScraping && (
          <div className="flex justify-start">
            <div className="max-w-2xl">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-5 py-3 shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-500 ml-2">Navi AI is thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Progress indicator */}
      {!isComplete && (
        <div className="px-4 sm:px-6 py-2 bg-blue-50 border-t border-blue-100">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between text-xs text-blue-700">
              <span>Setting up your profile...</span>
              <span>{completedQuestions}/{totalQuestions}</span>
            </div>
            <div className="mt-1 w-full bg-blue-200 rounded-full h-1.5">
              <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(completedQuestions / totalQuestions) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isComplete ? "Profile complete! Redirecting..." : onboardingState.isScraping ? "Scraping in progress..." : "Type your answer..."}
              disabled={isLoading || isComplete || onboardingState.isScraping}
              className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading || isComplete || onboardingState.isScraping}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
