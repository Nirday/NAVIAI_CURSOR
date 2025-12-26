'use client'

import React, { useState } from 'react'
import { Check, AlertCircle, CheckCircle2 } from 'lucide-react'

export interface ThemeOption {
  id: string
  title: string
  description: string
  visualColor: string // hex code or gradient
  pros: string[]
  cons: string[]
  suitableFor: string[]
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'rapid-converter',
    title: 'The Rapid Converter',
    description: 'Action-first design optimized for immediate conversions and clear CTAs.',
    visualColor: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', // Red gradient
    pros: [
      'High-contrast CTAs drive immediate action',
      'Minimal friction in conversion flow',
      'Mobile-optimized for quick decisions',
      'A/B test friendly structure'
    ],
    cons: [
      'Less visual storytelling space',
      'May feel transactional to some audiences',
      'Requires strong copywriting'
    ],
    suitableFor: [
      'Lead generation services',
      'Appointment booking',
      'Quote requests',
      'Event registrations'
    ]
  },
  {
    id: 'visual-immersion',
    title: 'The Visual Immersion',
    description: 'Luxury, media-heavy experience that showcases your brand through stunning visuals.',
    visualColor: 'linear-gradient(135deg, #1F2937 0%, #111827 50%, #D4AF37 100%)', // Black to gold
    pros: [
      'Premium brand perception',
      'Showcases products/services beautifully',
      'High engagement through media',
      'Memorable first impression'
    ],
    cons: [
      'Slower load times if not optimized',
      'Requires high-quality media assets',
      'May distract from conversion goals'
    ],
    suitableFor: [
      'Luxury brands',
      'Photography studios',
      'Interior design',
      'Wedding services',
      'High-end retail'
    ]
  },
  {
    id: 'trust-authority',
    title: 'The Trust & Authority',
    description: 'Info-rich, corporate grid layout that builds credibility through content density.',
    visualColor: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)', // Blue gradient
    pros: [
      'Establishes expertise quickly',
      'SEO-friendly content structure',
      'Professional corporate appearance',
      'Supports detailed service explanations'
    ],
    cons: [
      'Can feel information-heavy',
      'Requires substantial content creation',
      'May overwhelm mobile users'
    ],
    suitableFor: [
      'Professional services',
      'Consulting firms',
      'Legal practices',
      'Financial advisors',
      'B2B companies'
    ]
  },
  {
    id: 'digital-storefront',
    title: 'The Digital Storefront',
    description: 'E-commerce focused layout optimized for product browsing and inventory display.',
    visualColor: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', // Green gradient
    pros: [
      'Product-first navigation',
      'Shopping cart integration ready',
      'Category-based organization',
      'Inventory showcase optimized'
    ],
    cons: [
      'Less suitable for service-only businesses',
      'Requires product photography',
      'Needs inventory management setup'
    ],
    suitableFor: [
      'Online stores',
      'Product retailers',
      'Marketplace sellers',
      'Catalog businesses'
    ]
  },
  {
    id: 'community-hub',
    title: 'The Community Hub',
    description: 'Event-focused, newsletter-driven layout that fosters engagement and community.',
    visualColor: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', // Purple gradient
    pros: [
      'Event calendar integration',
      'Newsletter signup prominence',
      'Community engagement features',
      'Social proof showcase'
    ],
    cons: [
      'Requires regular content updates',
      'Event management overhead',
      'May need email marketing tools'
    ],
    suitableFor: [
      'Event organizers',
      'Community centers',
      'Non-profits',
      'Membership organizations',
      'Local businesses with events'
    ]
  }
]

interface ThemeSelectionProps {
  onSelect?: (themeId: string) => void
  onContinue?: (themeId: string) => void
  initialSelection?: string
}

export default function ThemeSelection({ 
  onSelect, 
  onContinue, 
  initialSelection 
}: ThemeSelectionProps) {
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(initialSelection || null)

  const handleThemeClick = (themeId: string) => {
    setSelectedThemeId(themeId)
    onSelect?.(themeId)
  }

  const handleContinue = () => {
    if (selectedThemeId) {
      onContinue?.(selectedThemeId)
    }
  }

  return (
    <div className="w-full h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Choose Your Website Structure
        </h1>
        <p className="text-gray-600 text-lg">
          Select a theme that aligns with your business strategy and goals.
        </p>
      </div>

      {/* Theme Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {THEME_OPTIONS.map((theme) => {
            const isSelected = selectedThemeId === theme.id
            
            return (
              <div
                key={theme.id}
                onClick={() => handleThemeClick(theme.id)}
                className={`
                  relative bg-white rounded-lg border-2 transition-all duration-200 cursor-pointer
                  ${isSelected 
                    ? 'border-blue-500 ring-4 ring-blue-500 ring-opacity-20 shadow-lg' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }
                `}
              >
                {/* Selection Badge */}
                {isSelected && (
                  <div className="absolute -top-3 -right-3 z-10 bg-blue-500 text-white rounded-full p-1.5 shadow-lg">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}

                {/* Browser Window Preview */}
                <div className="relative h-32 rounded-t-lg overflow-hidden">
                  {/* Browser Chrome */}
                  <div className="absolute top-0 left-0 right-0 h-8 bg-gray-800 flex items-center gap-1.5 px-3 z-10">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                  {/* Theme Preview */}
                  <div 
                    className="w-full h-full"
                    style={{ background: theme.visualColor }}
                  />
                </div>

                {/* Card Body */}
                <div className="p-6">
                  {/* Title & Description */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {theme.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    {theme.description}
                  </p>

                  {/* Pros Section */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Advantages
                      </span>
                    </div>
                    <ul className="space-y-1.5 ml-6">
                      {theme.pros.map((pro, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Cons Section */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Trade-offs
                      </span>
                    </div>
                    <ul className="space-y-1.5 ml-6">
                      {theme.cons.map((con, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Best For Section */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 block">
                      Best For
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {theme.suitableFor.map((type, index) => (
                        <span
                          key={index}
                          className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Continue Button */}
      <div className="bg-white border-t border-gray-200 px-6 py-6">
        <div className="max-w-7xl mx-auto flex justify-end">
          <button
            onClick={handleContinue}
            disabled={!selectedThemeId}
            className={`
              px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200
              ${selectedThemeId
                ? 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transform hover:scale-105'
                : 'bg-gray-300 cursor-not-allowed'
              }
            `}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

