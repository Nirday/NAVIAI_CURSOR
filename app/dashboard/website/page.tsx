'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { HeroBlock } from './components/HeroBlock'
import { FeatureBlock } from './components/FeatureBlock'
import ThemeSelection from './components/ThemeSelection'

// Define the types for our blocks
type Block = 
  | { id: string; type: 'hero'; props: { headline: string; subheadline: string } }
  | { id: string; type: 'features'; props: { title: string; features: { name: string; description: string }[] } }

// The main Page Component
export default function WebsiteEditorPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // --- STATE ---
  // Theme selection state - if null, show theme selection screen
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  
  // The blocks state now starts empty
  const [blocks, setBlocks] = useState<Block[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [websiteTheme, setWebsiteTheme] = useState<'luxury_black_gold' | 'default'>('default')
  const [seoSchema, setSeoSchema] = useState<any>(null)
  const [businessProfile, setBusinessProfile] = useState<any>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  // --- DATA FETCHING ---
  useEffect(() => {
    // Fetch the user's profile and website data when userId is available
    if (!userId) return

    async function fetchContent() {
      try {
        // PRIORITY 1: Check for module_config first (AI-generated content takes precedence)
        const profileResponse = await fetch('/api/profile')
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          const profile = profileData.profile
          
          // Set businessProfile for ThemeSelection component
          setBusinessProfile({
            businessName: profile?.businessName,
            industry: profile?.industry,
            location: profile?.location,
            contactInfo: profile?.contactInfo,
            services: profile?.services
          })
          
          console.log('📊 Profile fetched:', { 
            hasProfile: !!profile,
            hasModuleConfig: !!profile?.module_config,
            moduleConfig: profile?.module_config
          })
          
          // Use module_config data from onboarding if available
          const moduleConfig = profile?.module_config
          const websiteBuilder = moduleConfig?.website_builder
          
          console.log('🏗️ Website Builder Config:', {
            hasWebsiteBuilder: !!websiteBuilder,
            heroHeadline: websiteBuilder?.hero_headline,
            subheadline: websiteBuilder?.subheadline,
            servicesCount: websiteBuilder?.services_list?.length || 0,
            services: websiteBuilder?.services_list
          })
          
          if (websiteBuilder && (websiteBuilder.hero_headline || websiteBuilder.services_list?.length > 0 || websiteBuilder.sections)) {
            console.log('✅ Initializing blocks with AI-generated content')
            
            // Extract theme and SEO schema
            const detectedTheme = websiteBuilder.theme || 'default'
            setWebsiteTheme(detectedTheme === 'luxury_black_gold' ? 'luxury_black_gold' : 'default')
            
            if (websiteBuilder.seo_schema) {
              setSeoSchema(websiteBuilder.seo_schema)
            }
            
            // Check for new structure with sections (has full SEO descriptions)
            const servicesSection = websiteBuilder.sections?.find((s: any) => s.type === 'services_grid')
            const heroSection = websiteBuilder.hero || websiteBuilder
            
            // Initialize with onboarding data - USE THE AI-GENERATED HEADLINES
            const initialBlocks: Block[] = [
              {
                id: 'hero-1',
                type: 'hero',
                props: {
                  headline: heroSection.headline || websiteBuilder.hero_headline || profile?.businessName || 'Welcome to Our Business',
                  subheadline: heroSection.subheadline || websiteBuilder.subheadline || `Your trusted partner in ${profile?.industry || 'business'}`
                }
              }
            ]
            
            // Add services as features - Use sections if available (has full SEO descriptions), otherwise fallback to services_list
            if (servicesSection && servicesSection.items && servicesSection.items.length > 0) {
              // Use full SEO descriptions from AI
              initialBlocks.push({
                id: 'features-1',
                type: 'features',
                props: {
                  title: servicesSection.title || 'Our Premier Fleet & Services',
                  features: servicesSection.items.map((item: any) => ({
                    name: item.title,
                    description: item.description || `Professional ${item.title.toLowerCase()} services tailored to your needs.`
                  }))
                }
              })
            } else if (websiteBuilder.services_list && websiteBuilder.services_list.length > 0) {
              // Fallback to services_list (basic descriptions)
              initialBlocks.push({
                id: 'features-1',
                type: 'features',
                props: {
                  title: 'Our Services',
                  features: websiteBuilder.services_list.map((service: string) => ({
                    name: service,
                    description: `Professional ${service.toLowerCase()} services tailored to your needs.`
                  }))
                }
              })
            }
            
            console.log('📦 Setting blocks:', initialBlocks)
            setBlocks(initialBlocks)
            setIsLoading(false)
            return
          } else {
            console.warn('⚠️ No website_builder config found, checking for existing website')
          }
        } else {
          console.error('❌ Failed to fetch profile:', profileResponse.status)
        }

        // PRIORITY 2: If no module_config, try to get existing website
        const websiteResponse = await fetch('/api/website/me')
        if (websiteResponse.ok) {
          const websiteData = await websiteResponse.json()
          if (websiteData.website && websiteData.website.pages && websiteData.website.pages.length > 0) {
            // Convert website pages to blocks format
            const convertedBlocks: Block[] = []
            websiteData.website.pages.forEach((page: any) => {
              page.sections?.forEach((section: any) => {
                if (section.type === 'hero') {
                  convertedBlocks.push({
                    id: section.id || `hero-${Date.now()}`,
                    type: 'hero',
                    props: {
                      headline: section.headline || page.title || 'Welcome',
                      subheadline: section.subheadline || section.description || ''
                    }
                  })
                } else if (section.type === 'feature' || section.type === 'features') {
                  convertedBlocks.push({
                    id: section.id || `features-${Date.now()}`,
                    type: 'features',
                    props: {
                      title: section.title || 'Our Services',
                      features: section.features || section.items || []
                    }
                  })
                }
              })
            })
            if (convertedBlocks.length > 0) {
              console.log('📦 Loading existing website blocks')
              setBlocks(convertedBlocks)
              setIsLoading(false)
              return
            }
          }
        }

        // PRIORITY 3: Fallback to default blocks if nothing else worked

        // Fallback: Generate content using AI
        const response = await fetch('/api/website/generate-content')
        if (!response.ok) {
          throw new Error('Failed to fetch content')
        }
        const data = await response.json()
        setBlocks(data)
      } catch (error) {
        console.error(error)
        // Default blocks if everything fails
        setBlocks([
          {
            id: 'hero-1',
            type: 'hero',
            props: {
              headline: 'Welcome to Our Business',
              subheadline: 'Your trusted partner for professional services'
            }
          },
          {
            id: 'features-1',
            type: 'features',
            props: {
              title: 'Our Services',
              features: [
                { name: 'Service 1', description: 'Professional service tailored to your needs.' },
                { name: 'Service 2', description: 'Quality solutions for your business.' },
                { name: 'Service 3', description: 'Expert support when you need it.' }
              ]
            }
          }
        ])
      } finally {
        setIsLoading(false)
      }
    }

    fetchContent()
  }, [userId]) // Run when userId is available

  const checkAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      
      if (!session?.user?.id) {
        router.push('/login')
        return
      }

      setUserId(session.user.id)
      setLoading(false)
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/login')
      setLoading(false)
    }
  }

  // --- FUNCTIONS ---
  const moveBlockUp = (index: number) => {
    if (index === 0) return
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks]
      const [movedBlock] = newBlocks.splice(index, 1)
      newBlocks.splice(index - 1, 0, movedBlock)
      return newBlocks
    })
  }

  const moveBlockDown = (index: number) => {
    if (index === blocks.length - 1) return
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks]
      const [movedBlock] = newBlocks.splice(index, 1)
      newBlocks.splice(index + 1, 0, movedBlock)
      return newBlocks
    })
  }

  const deleteBlock = (index: number) => {
    setBlocks(prevBlocks => prevBlocks.filter((_, i) => i !== index))
  }

  const updateBlockProps = (index: number, newProps: any) => {
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks]
      const oldBlock = newBlocks[index]

      // Merge old props with new props
      newBlocks[index] = {
        ...oldBlock,
        props: {
          ...oldBlock.props,
          ...newProps,
        },
      }
      return newBlocks
    })
  }

  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">
            {loading ? 'Loading...' : 'Generating your personalized website...'}
          </p>
        </div>
      </div>
    )
  }

  if (!userId) {
    return null // Will redirect
  }

  // --- SAVE FUNCTION ---
  const handleSave = async () => {
    if (!userId) return
    
    try {
      setIsLoading(true)
      
      // Convert blocks to Website format
      const sections = blocks.map(block => {
        if (block.type === 'hero') {
          return {
            id: block.id,
            type: 'hero' as const,
            headline: block.props.headline,
            subheadline: block.props.subheadline
          }
        } else if (block.type === 'features') {
          return {
            id: block.id,
            type: 'feature' as const,
            items: block.props.features.map((f: any) => ({
              title: f.name,
              description: f.description
            }))
          }
        }
        return null
      }).filter(Boolean)
      
      const website = {
        id: `website-${userId}`,
        userId,
        name: 'My Website',
        theme: {
          colorPalette: {
            primary: '#3B82F6',
            secondary: '#1E40AF',
            accent: '#F59E0B',
            background: '#FFFFFF',
            surface: '#F8FAFC',
            text: '#1F2937'
          },
          font: {
            heading: 'Inter',
            body: 'Inter'
          }
        },
        pages: [{
          id: 'home-page',
          slug: 'home',
          title: 'Home',
          metaTitle: 'Home',
          metaDescription: 'Welcome to our website',
          structuredData: null,
          sections
        }],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      const response = await fetch('/api/website/save', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ website })
      })
      
      if (response.ok) {
        alert('Website saved successfully!')
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }
    } catch (error: any) {
      console.error('Error saving website:', error)
      alert(`Failed to save website: ${error.message || 'Please try again.'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle theme selection
  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId)
    // Map theme IDs to website theme values if needed
    if (themeId === 'visual-immersion') {
      setWebsiteTheme('luxury_black_gold')
    } else {
      setWebsiteTheme('default')
    }
  }

  // Handle theme change (go back to selection)
  const handleChangeTheme = () => {
    setSelectedTheme(null)
  }

  // --- RENDER ---
  // If no theme selected, show theme selection screen
  if (selectedTheme === null) {
    return (
      <div className="w-full h-full bg-gray-50">
        <ThemeSelection
          onSelect={handleThemeSelect}
          onContinue={handleThemeSelect}
          businessProfile={businessProfile}
        />
      </div>
    )
  }

  // If theme is selected, show the editor
  return (
    <>
      {/* JSON-LD Schema for SEO */}
      {seoSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(seoSchema) }}
        />
      )}
      <div className="w-full min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white">Website Builder</h1>
          <p className="text-purple-100 text-sm mt-1">Edit your website content and preview changes</p>
        </div>
        <div className="flex gap-3 items-center">
          <button 
            onClick={handleChangeTheme}
            className="bg-purple-500 hover:bg-purple-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Change Theme
          </button>
          <button 
            onClick={handleSave}
            disabled={isLoading}
            className="bg-white hover:bg-gray-100 text-purple-600 font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {blocks.length === 0 && !isLoading && (
        <div className="p-8 text-center">
          <p className="text-gray-500 text-lg mb-4">No content yet. Your website will be generated from your onboarding data.</p>
          <button
            onClick={() => {
              setBlocks([
                {
                  id: `hero-${Date.now()}`,
                  type: 'hero',
                  props: {
                    headline: 'Welcome to Our Business',
                    subheadline: 'Your trusted partner for professional services'
                  }
                }
              ])
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg"
          >
            Add Hero Block
          </button>
        </div>
      )}

      <div className="max-w-6xl mx-auto p-8 space-y-6 bg-white rounded-lg shadow-sm">
        <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-sm text-blue-800">
            <strong>Preview:</strong> This is how your website will look. Click on any text to edit it.
          </p>
        </div>
        {blocks.map((block, index) => (
          <div key={block.id} className="relative group border-2 border-transparent hover:border-blue-500 rounded-lg">

            {/* This renders the correct block component */}
            {block.type === 'hero' && (
              <HeroBlock
                {...block.props}
                onUpdate={(newProps) => updateBlockProps(index, newProps)}
              />
            )}
            {block.type === 'features' && (
              <FeatureBlock
                {...block.props}
                theme={websiteTheme}
                onUpdate={(newProps) => updateBlockProps(index, newProps)}
              />
            )}

            {/* --- These are the "Up/Down/Delete" controls --- */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
              <button 
                onClick={() => moveBlockUp(index)} 
                className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={index === 0}
              >
                Up
              </button>
              <button 
                onClick={() => moveBlockDown(index)} 
                className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={index === blocks.length - 1}
              >
                Down
              </button>
              <button 
                onClick={() => deleteBlock(index)} 
                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
    </>
  )
}
