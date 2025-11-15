/**
 * Website Data Validation
 * V1.5: Zod schema for validating WebsiteData JSON
 */

import { z } from 'zod'
import { Website } from './types'

// Zod schema for WebsiteTheme
const WebsiteThemeSchema = z.object({
  colorPalette: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string().optional(),
    background: z.string().optional(),
    surface: z.string().optional(),
    text: z.string().optional()
  }),
  font: z.object({
    heading: z.string(),
    body: z.string()
  })
})

// Zod schema for WebsiteSection (discriminated union)
const HeroSectionSchema = z.object({
  id: z.string(),
  type: z.literal('hero'),
  headline: z.string(),
  subheadline: z.string().optional(),
  ctaButton: z.object({
    label: z.string(),
    href: z.string()
  }).optional(),
  backgroundImageUrl: z.string().optional(),
  backgroundVideoUrl: z.string().optional()
})

const FeatureSectionSchema = z.object({
  id: z.string(),
  type: z.literal('feature'),
  items: z.array(z.object({
    icon: z.string().optional(),
    title: z.string(),
    description: z.string()
  }))
})

const TextSectionSchema = z.object({
  id: z.string(),
  type: z.literal('text'),
  content: z.string()
})

const ImageGallerySectionSchema = z.object({
  id: z.string(),
  type: z.literal('image_gallery'),
  images: z.array(z.object({
    url: z.string(),
    alt: z.string(),
    caption: z.string().optional()
  }))
})

const ContactFormSectionSchema = z.object({
  id: z.string(),
  type: z.literal('contact_form'),
  fields: z.array(z.object({
    name: z.enum(['name', 'email', 'message']),
    label: z.string(),
    required: z.boolean().optional()
  })),
  submitLabel: z.string().optional(),
  successMessage: z.string().optional()
})

const EmbedSectionSchema = z.object({
  id: z.string(),
  type: z.literal('embed'),
  embedCode: z.string()
})

const VideoSectionSchema = z.object({
  id: z.string(),
  type: z.literal('video'),
  videoUrl: z.string(),
  thumbnailUrl: z.string().optional()
})

const WebsiteSectionSchema = z.discriminatedUnion('type', [
  HeroSectionSchema,
  FeatureSectionSchema,
  TextSectionSchema,
  ImageGallerySectionSchema,
  ContactFormSectionSchema,
  EmbedSectionSchema,
  VideoSectionSchema
])

// Zod schema for WebsitePage
const WebsitePageSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  metaTitle: z.string(),
  metaDescription: z.string(),
  structuredData: z.record(z.any()).nullable(),
  sections: z.array(WebsiteSectionSchema)
})

// Zod schema for WebsiteFooter
const WebsiteFooterSchema = z.object({
  contactInfo: z.string().optional(),
  socialLinks: z.array(z.object({
    platform: z.string(),
    url: z.string()
  })).optional(),
  legalLinks: z.array(z.object({
    text: z.string(),
    slug: z.string()
  })).optional(),
  copyrightText: z.string().optional()
}).optional()

// Zod schema for Website (complete)
const WebsiteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  domain: z.string().optional(),
  theme: WebsiteThemeSchema,
  pages: z.array(WebsitePageSchema).min(1, 'At least one page is required'),
  footer: WebsiteFooterSchema,
  primaryCta: z.object({
    text: z.string(),
    phoneNumber: z.string()
  }).optional(),
  createdAt: z.date().or(z.string()), // Accept Date or ISO string
  updatedAt: z.date().or(z.string()) // Accept Date or ISO string
})

/**
 * Validate WebsiteData JSON against TypeScript interface
 * Returns field-level errors if validation fails
 */
export function validateWebsiteData(data: any): { 
  success: boolean
  website?: Website
  errors?: Array<{ field: string; message: string }>
} {
  try {
    // Parse dates if they're strings
    const parsedData = {
      ...data,
      createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt || Date.now()),
      updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt || Date.now())
    }

    const result = WebsiteSchema.safeParse(parsedData)

    if (!result.success) {
      // Convert Zod errors to field-level errors
      const errors = result.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message
      }))

      return { success: false, errors }
    }

    // Convert to Website type (ensure dates are Date objects)
    const website: Website = {
      ...result.data,
      createdAt: result.data.createdAt instanceof Date ? result.data.createdAt : new Date(result.data.createdAt),
      updatedAt: result.data.updatedAt instanceof Date ? result.data.updatedAt : new Date(result.data.updatedAt)
    }

    return { success: true, website }
  } catch (error: any) {
    return {
      success: false,
      errors: [{ field: 'root', message: error.message || 'Validation failed' }]
    }
  }
}

