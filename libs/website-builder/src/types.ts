export interface WebsiteTheme {
  colorPalette: {
    primary: string
    secondary: string
    accent?: string
    background?: string
    surface?: string
    text?: string
  }
  font: {
    heading: string
    body: string
  }
}

export interface WebsiteFooter {
  contactInfo?: string
  socialLinks?: { platform: string; url: string; }[]
  legalLinks?: { text: string; slug: string; }[]
  copyrightText?: string
}

export interface WebsitePage {
  id: string
  slug: string
  title: string
  metaTitle: string
  metaDescription: string
  structuredData: Record<string, any> | null
  sections: WebsiteSection[]
}

export interface Website {
  id: string
  userId: string
  name: string
  domain?: string
  theme: WebsiteTheme
  pages: WebsitePage[]
  footer?: WebsiteFooter
  primaryCta?: {
    text: string
    phoneNumber: string
  }
  createdAt: Date
  updatedAt: Date
}

// Discriminated union for sections
export type WebsiteSection =
  | HeroSection
  | FeatureSection
  | TextSection
  | ImageGallerySection
  | ContactFormSection
  | EmbedSection
  | VideoSection

export interface BaseSection {
  id: string
  type: string
}

export interface HeroSection extends BaseSection {
  type: 'hero'
  headline: string
  subheadline?: string
  ctaButton?: {
    label: string
    href: string
  }
  backgroundImageUrl?: string
  backgroundVideoUrl?: string
}

export interface FeatureSection extends BaseSection {
  type: 'feature'
  title?: string
  items: Array<{
    icon?: string
    title: string
    description: string
  }>
}

export interface TextSection extends BaseSection {
  type: 'text'
  content: string // rich text (e.g., Markdown or HTML string)
}

export interface ImageGallerySection extends BaseSection {
  type: 'image_gallery'
  images: Array<{
    url: string
    alt: string
    caption?: string
  }>
}

export interface ContactFormSection extends BaseSection {
  type: 'contact_form'
  fields: Array<{
    name: 'name' | 'email' | 'message'
    label: string
    required?: boolean
  }>
  submitLabel?: string
  successMessage?: string
}

export interface EmbedSection extends BaseSection {
  type: 'embed'
  htmlContent: string
}

export interface VideoSection extends BaseSection {
  type: 'video'
  videoUrl: string
  caption?: string
}
