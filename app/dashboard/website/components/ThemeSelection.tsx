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
    id: 'emergency-response',
    title: 'The Emergency Response',
    description: 'Mobile-first design that gets customers calling you NOW, perfect for urgent local services.',
    visualColor: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', // Red gradient
    pros: [
      "Maximize 'Click-to-Call' from mobile users",
      "Embeds Service Area for Local SEO",
      'Fast loading on 4G/5G networks'
    ],
    cons: [
      "Hard to showcase complex/expensive projects",
      "Can feel 'aggressive' to casual browsers",
      'Limited space for brand storytelling'
    ],
    suitableFor: [
      'Plumbers',
      'Locksmiths',
      'Towing',
      'Urgent Care'
    ]
  },
  {
    id: 'local-showroom',
    title: 'The Local Showroom',
    description: 'Premium visual showcase that justifies higher prices and attracts discerning local customers.',
    visualColor: 'linear-gradient(135deg, #1F2937 0%, #111827 50%, #D4AF37 100%)', // Black to gold
    pros: [
      'Justifies premium pricing with high-end visuals',
      "Perfect for 'Before & After' portfolios",
      'Differentiates you from budget competitors'
    ],
    cons: [
      'Requires REAL high-quality photos (Stock photos hurt trust)',
      'Contact info is less visible than other themes',
      'Slower load times on older phones'
    ],
    suitableFor: [
      'Luxury Salons',
      'Remodelers',
      'Wedding Venues',
      'Fine Dining'
    ]
  },
  {
    id: 'community-pillar',
    title: 'The Community Pillar',
    description: 'Trust-building layout that ranks for local keywords and answers questions before customers call.',
    visualColor: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)', // Blue gradient
    pros: [
      "Builds deep trust with 'Meet the Team' sections",
      "Best for ranking for 'Service + City' keywords",
      'Reduces nuisance calls by answering FAQs upfront'
    ],
    cons: [
      'Requires significant text content (Staff bios, History)',
      "Can feel 'corporate' if not personalized",
      'Less visual impact'
    ],
    suitableFor: [
      'Dentists',
      'Law Firms',
      'Financial Advisors',
      'HVAC Installation'
    ]
  },
  {
    id: 'neighborhood-menu',
    title: 'The Neighborhood Menu',
    description: 'Streamlined ordering and inventory display that reduces phone calls and speeds up transactions.',
    visualColor: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', // Green gradient
    pros: [
      "Streamlines 'Order for Pickup' or appointments",
      'Showcases live inventory/menu availability',
      'Reduces phone time taking orders'
    ],
    cons: [
      "Requires daily updates to avoid 'Out of Stock' frustration",
      "Transactional feel (hard to tell brand story)",
      'Requires high-res product photos'
    ],
    suitableFor: [
      'Restaurants',
      'Bakeries',
      'Garden Centers',
      'Boutique Retail'
    ]
  },
  {
    id: 'town-square',
    title: 'The Town Square',
    description: 'Community-focused layout that builds repeat visits and loyal local customers through events and updates.',
    visualColor: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', // Purple gradient
    pros: [
      "Encourages repeat visits for 'Weekly Specials'",
      'Integrates live Social Media feeds deeply',
      "Builds a loyal 'Member' community"
    ],
    cons: [
      "Looks 'dead' if Event Calendar is empty",
      'High maintenance (needs weekly updates)',
      "Can distract from the primary 'Buy' button"
    ],
    suitableFor: [
      'Gyms/Yoga',
      'Breweries',
      'Coffee Shops',
      'Churches'
    ]
  }
]

interface ThemeSelectionProps {
  onSelect?: (themeId: string) => void
  onContinue?: (themeId: string) => void
  initialSelection?: string
  recommendedCategory?: string // Business category to recommend a theme for
}

export default function ThemeSelection({ 
  onSelect, 
  onContinue, 
  initialSelection,
  recommendedCategory 
}: ThemeSelectionProps) {
  
  // Helper function to check if a theme is recommended based on category
  const isRecommended = (themeId: string, category?: string): boolean => {
    if (!category) return false
    
    const categoryLower = category.toLowerCase()
    
    // Map categories to theme IDs
    const categoryToThemeMap: Record<string, string[]> = {
      'plumber': ['emergency-response'],
      'locksmith': ['emergency-response'],
      'towing': ['emergency-response'],
      'urgent care': ['emergency-response'],
      'salon': ['local-showroom'],
      'remodeler': ['local-showroom'],
      'wedding': ['local-showroom'],
      'restaurant': ['local-showroom', 'neighborhood-menu'],
      'dentist': ['community-pillar'],
      'law': ['community-pillar'],
      'financial': ['community-pillar'],
      'hvac': ['community-pillar'],
      'bakery': ['neighborhood-menu'],
      'retail': ['neighborhood-menu'],
      'gym': ['town-square'],
      'yoga': ['town-square'],
      'brewery': ['town-square'],
      'coffee': ['town-square'],
      'church': ['town-square']
    }
    
    // Check if category matches any theme
    for (const [key, themes] of Object.entries(categoryToThemeMap)) {
      if (categoryLower.includes(key) && themes.includes(themeId)) {
        return true
      }
    }
    
    return false
  }
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
            const isRecommendedTheme = isRecommended(theme.id, recommendedCategory)
            
            return (
              <div
                key={theme.id}
                onClick={() => handleThemeClick(theme.id)}
                className={`
                  relative bg-white rounded-lg border-2 transition-all duration-200 cursor-pointer
                  ${isSelected 
                    ? 'border-blue-500 ring-4 ring-blue-500 ring-opacity-20 shadow-lg' 
                    : isRecommendedTheme
                    ? 'border-purple-400 ring-2 ring-purple-400 ring-offset-2 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }
                `}
              >
                {/* Recommended Badge */}
                {isRecommendedTheme && (
                  <div className="absolute -top-3 -left-3 z-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full px-3 py-1 shadow-lg flex items-center gap-1.5 text-xs font-semibold">
                    <span>✨</span>
                    <span>Navi Recommended</span>
                  </div>
                )}
                
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
                    <ul className="space-y-1 ml-6">
                      {theme.pros.map((pro, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{pro}</span>
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
                    <ul className="space-y-1 ml-6">
                      {theme.cons.map((con, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{con}</span>
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

