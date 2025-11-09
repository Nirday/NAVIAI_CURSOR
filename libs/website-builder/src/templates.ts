/**
 * Website Templates for SMB Owners
 * Pre-designed templates that users can choose from
 */

import { WebsiteTheme } from './types'

export interface WebsiteTemplate {
  id: string
  name: string
  description: string
  visualStyle: 'modern' | 'minimalistic' | 'professional' | 'bold' | 'elegant' | 'creative' | 'classic' | 'vibrant'
  category: 'modern' | 'classic' | 'minimal' | 'bold' | 'elegant' | 'creative' | 'professional' | 'vibrant' // Legacy support
  industryFit: string[] // Industries this template works well for
  theme: WebsiteTheme
  layoutStyle: 'centered' | 'full-width' | 'sidebar' | 'grid' | 'asymmetric'
  sectionOrder: string[] // Recommended section order
  previewImage?: string // URL to preview image
  seoOptimized: boolean // All templates are SEO-optimized
  editable: boolean // All templates are easily editable
  apiIntegrationReady: boolean // Supports external API embeds
}

/**
 * Template Library
 * 12 distinct templates covering different styles and industries
 */
export const WEBSITE_TEMPLATES: WebsiteTemplate[] = [
  // 1. Modern Professional
  {
    id: 'modern-professional',
    name: 'Modern Professional',
    description: 'Clean, contemporary design perfect for professional services, consultants, and tech companies',
    visualStyle: 'modern',
    category: 'modern',
    industryFit: ['consulting', 'technology', 'legal', 'accounting', 'professional-services'],
    seoOptimized: true,
    editable: true,
    apiIntegrationReady: true,
    theme: {
      colorPalette: {
        primary: '#2563EB', // Blue
        secondary: '#1E40AF',
        accent: '#3B82F6',
        background: '#FFFFFF',
        surface: '#F8FAFC',
        text: '#1F2937'
      },
      font: {
        heading: 'Inter',
        body: 'Inter'
      }
    },
    layoutStyle: 'centered',
    sectionOrder: ['hero', 'feature', 'text', 'image_gallery', 'contact_form']
  },

  // 2. Classic Elegance
  {
    id: 'classic-elegance',
    name: 'Classic Elegance',
    description: 'Timeless, sophisticated design ideal for luxury brands, fine dining, and high-end services',
    visualStyle: 'elegant',
    category: 'elegant',
    industryFit: ['restaurant', 'luxury', 'jewelry', 'fashion', 'hospitality', 'wedding'],
    seoOptimized: true,
    editable: true,
    apiIntegrationReady: true,
    theme: {
      colorPalette: {
        primary: '#1F2937', // Dark gray
        secondary: '#111827',
        accent: '#D4AF37', // Gold
        background: '#FFFFFF',
        surface: '#F9FAFB',
        text: '#374151'
      },
      font: {
        heading: 'Playfair Display',
        body: 'Lora'
      }
    },
    layoutStyle: 'centered',
    sectionOrder: ['hero', 'text', 'image_gallery', 'feature', 'contact_form']
  },

  // 3. Minimal Clean
  {
    id: 'minimal-clean',
    name: 'Minimal Clean',
    description: 'Simple, uncluttered design focused on content - perfect for portfolios, creatives, and wellness',
    visualStyle: 'minimalistic',
    category: 'minimal',
    industryFit: ['wellness', 'yoga', 'photography', 'design', 'coaching', 'therapy'],
    seoOptimized: true,
    editable: true,
    apiIntegrationReady: true,
    theme: {
      colorPalette: {
        primary: '#000000',
        secondary: '#4B5563',
        accent: '#10B981', // Green
        background: '#FFFFFF',
        surface: '#F9FAFB',
        text: '#111827'
      },
      font: {
        heading: 'Poppins',
        body: 'Open Sans'
      }
    },
    layoutStyle: 'centered',
    sectionOrder: ['hero', 'text', 'image_gallery', 'contact_form']
  },

  // 4. Bold & Vibrant
  {
    id: 'bold-vibrant',
    name: 'Bold & Vibrant',
    description: 'Eye-catching, energetic design for creative agencies, events, and youth-focused businesses',
    visualStyle: 'bold',
    category: 'vibrant',
    industryFit: ['events', 'marketing', 'creative-agency', 'fitness', 'entertainment', 'retail'],
    seoOptimized: true,
    editable: true,
    apiIntegrationReady: true,
    theme: {
      colorPalette: {
        primary: '#EF4444', // Red
        secondary: '#DC2626',
        accent: '#F59E0B', // Orange
        background: '#FFFFFF',
        surface: '#FEF2F2',
        text: '#1F2937'
      },
      font: {
        heading: 'Montserrat',
        body: 'Roboto'
      }
    },
    layoutStyle: 'full-width',
    sectionOrder: ['hero', 'feature', 'image_gallery', 'text', 'contact_form']
  },

  // 5. Trustworthy Business
  {
    id: 'trustworthy-business',
    name: 'Trustworthy Business',
    description: 'Professional, reliable design for contractors, home services, and local businesses',
    visualStyle: 'professional',
    category: 'professional',
    industryFit: ['contractor', 'plumbing', 'electrical', 'hvac', 'home-services', 'automotive'],
    seoOptimized: true,
    editable: true,
    apiIntegrationReady: true,
    theme: {
      colorPalette: {
        primary: '#059669', // Green
        secondary: '#047857',
        accent: '#10B981',
        background: '#FFFFFF',
        surface: '#F0FDF4',
        text: '#1F2937'
      },
      font: {
        heading: 'Roboto',
        body: 'Roboto'
      }
    },
    layoutStyle: 'centered',
    sectionOrder: ['hero', 'feature', 'text', 'image_gallery', 'contact_form']
  },

  // 6. Creative Portfolio
  {
    id: 'creative-portfolio',
    name: 'Creative Portfolio',
    description: 'Artistic, visual-first design for photographers, artists, designers, and creatives',
    visualStyle: 'creative',
    category: 'creative',
    industryFit: ['photography', 'art', 'design', 'architecture', 'interior-design', 'fashion'],
    seoOptimized: true,
    editable: true,
    apiIntegrationReady: true,
    theme: {
      colorPalette: {
        primary: '#7C3AED', // Purple
        secondary: '#6D28D9',
        accent: '#A78BFA',
        background: '#FFFFFF',
        surface: '#FAF5FF',
        text: '#1F2937'
      },
      font: {
        heading: 'Raleway',
        body: 'Source Sans Pro'
      }
    },
    layoutStyle: 'grid',
    sectionOrder: ['hero', 'image_gallery', 'text', 'feature', 'contact_form']
  },

  // 7. Medical & Health
  {
    id: 'medical-health',
    name: 'Medical & Health',
    description: 'Clean, calming design for healthcare, dental, veterinary, and wellness practices',
    visualStyle: 'professional',
    category: 'professional',
    industryFit: ['medical', 'dental', 'veterinary', 'healthcare', 'wellness', 'therapy'],
    seoOptimized: true,
    editable: true,
    apiIntegrationReady: true,
    theme: {
      colorPalette: {
        primary: '#0EA5E9', // Sky blue
        secondary: '#0284C7',
        accent: '#38BDF8',
        background: '#FFFFFF',
        surface: '#F0F9FF',
        text: '#1E293B'
      },
      font: {
        heading: 'Roboto',
        body: 'Roboto'
      }
    },
    layoutStyle: 'centered',
    sectionOrder: ['hero', 'feature', 'text', 'image_gallery', 'contact_form']
  },

  // 8. Food & Restaurant
  {
    id: 'food-restaurant',
    name: 'Food & Restaurant',
    description: 'Appetizing, warm design perfect for restaurants, cafes, bakeries, and food businesses',
    visualStyle: 'vibrant',
    category: 'vibrant',
    industryFit: ['restaurant', 'cafe', 'bakery', 'catering', 'food-truck', 'bar'],
    seoOptimized: true,
    editable: true,
    apiIntegrationReady: true,
    theme: {
      colorPalette: {
        primary: '#DC2626', // Red
        secondary: '#B91C1C',
        accent: '#F59E0B', // Orange
        background: '#FFF8F0',
        surface: '#FFFFFF',
        text: '#1F2937'
      },
      font: {
        heading: 'Crimson Text',
        body: 'Lato'
      }
    },
    layoutStyle: 'full-width',
    sectionOrder: ['hero', 'image_gallery', 'text', 'feature', 'contact_form']
  },

  // 9. E-commerce Focus
  {
    id: 'ecommerce-focus',
    name: 'E-commerce Focus',
    description: 'Product-focused design optimized for online stores, retail, and product businesses',
    visualStyle: 'modern',
    category: 'modern',
    industryFit: ['retail', 'ecommerce', 'boutique', 'gifts', 'jewelry', 'fashion'],
    seoOptimized: true,
    editable: true,
    apiIntegrationReady: true,
    theme: {
      colorPalette: {
        primary: '#1F2937', // Dark
        secondary: '#111827',
        accent: '#F59E0B', // Gold
        background: '#FFFFFF',
        surface: '#F9FAFB',
        text: '#1F2937'
      },
      font: {
        heading: 'Poppins',
        body: 'Inter'
      }
    },
    layoutStyle: 'grid',
    sectionOrder: ['hero', 'feature', 'image_gallery', 'text', 'contact_form']
  },

  // 10. Education & Training
  {
    id: 'education-training',
    name: 'Education & Training',
    description: 'Clear, organized design for schools, training centers, tutors, and educational services',
    visualStyle: 'professional',
    category: 'professional',
    industryFit: ['education', 'training', 'tutoring', 'courses', 'workshops', 'school'],
    seoOptimized: true,
    editable: true,
    apiIntegrationReady: true,
    theme: {
      colorPalette: {
        primary: '#7C3AED', // Purple
        secondary: '#6D28D9',
        accent: '#A78BFA',
        background: '#FFFFFF',
        surface: '#FAF5FF',
        text: '#1F2937'
      },
      font: {
        heading: 'Nunito',
        body: 'Open Sans'
      }
    },
    layoutStyle: 'centered',
    sectionOrder: ['hero', 'feature', 'text', 'image_gallery', 'contact_form']
  },

  // 11. Real Estate
  {
    id: 'real-estate',
    name: 'Real Estate',
    description: 'Spacious, image-rich design for real estate agents, property management, and construction',
    visualStyle: 'professional',
    category: 'professional',
    industryFit: ['real-estate', 'property-management', 'construction', 'architecture', 'interior-design'],
    seoOptimized: true,
    editable: true,
    apiIntegrationReady: true,
    theme: {
      colorPalette: {
        primary: '#1E40AF', // Blue
        secondary: '#1E3A8A',
        accent: '#3B82F6',
        background: '#FFFFFF',
        surface: '#EFF6FF',
        text: '#1F2937'
      },
      font: {
        heading: 'Roboto',
        body: 'Roboto'
      }
    },
    layoutStyle: 'grid',
    sectionOrder: ['hero', 'image_gallery', 'feature', 'text', 'contact_form']
  },

  // 12. Fitness & Sports
  {
    id: 'fitness-sports',
    name: 'Fitness & Sports',
    description: 'Energetic, dynamic design for gyms, personal trainers, sports clubs, and fitness centers',
    visualStyle: 'bold',
    category: 'bold',
    industryFit: ['fitness', 'gym', 'personal-training', 'sports', 'yoga', 'martial-arts'],
    seoOptimized: true,
    editable: true,
    apiIntegrationReady: true,
    theme: {
      colorPalette: {
        primary: '#DC2626', // Red
        secondary: '#B91C1C',
        accent: '#F59E0B', // Orange
        background: '#FFFFFF',
        surface: '#FEF2F2',
        text: '#1F2937'
      },
      font: {
        heading: 'Oswald',
        body: 'Roboto'
      }
    },
    layoutStyle: 'full-width',
    sectionOrder: ['hero', 'feature', 'image_gallery', 'text', 'contact_form']
  }
]

/**
 * Get template by ID
 */
export function getTemplateById(templateId: string): WebsiteTemplate | undefined {
  return WEBSITE_TEMPLATES.find(t => t.id === templateId)
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: WebsiteTemplate['category']): WebsiteTemplate[] {
  return WEBSITE_TEMPLATES.filter(t => t.category === category)
}

/**
 * Get templates by visual style
 */
export function getTemplatesByVisualStyle(visualStyle: WebsiteTemplate['visualStyle']): WebsiteTemplate[] {
  return WEBSITE_TEMPLATES.filter(t => t.visualStyle === visualStyle)
}

/**
 * Get templates suitable for an industry
 */
export function getTemplatesForIndustry(industry: string): WebsiteTemplate[] {
  const industryLower = industry.toLowerCase()
  return WEBSITE_TEMPLATES.filter(template =>
    template.industryFit.some(fit => industryLower.includes(fit.toLowerCase()) || fit.toLowerCase().includes(industryLower))
  )
}

/**
 * Get all templates (for selection UI)
 */
export function getAllTemplates(): WebsiteTemplate[] {
  return WEBSITE_TEMPLATES
}

/**
 * Get recommended templates for a business profile
 * Returns top 3-4 templates that best match the industry
 */
export function getRecommendedTemplates(industry: string): WebsiteTemplate[] {
  const industryLower = industry.toLowerCase()
  
  // Score each template based on industry match
  const scored = WEBSITE_TEMPLATES.map(template => {
    const matchScore = template.industryFit.reduce((score, fit) => {
      const fitLower = fit.toLowerCase()
      if (industryLower === fitLower) return score + 10 // Exact match
      if (industryLower.includes(fitLower) || fitLower.includes(industryLower)) return score + 5 // Partial match
      return score
    }, 0)
    
    return { template, score: matchScore }
  })
  
  // Sort by score and return top 4
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(item => item.template)
}

