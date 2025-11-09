import React from 'react'
import { Website, WebsitePage, WebsiteSection } from './types'
import Hero from './components/Hero'
import FeatureSection from './components/FeatureSection'
import TextSection from './components/TextSection'
import ImageGallerySection from './components/ImageGallerySection'
import ContactFormSection from './components/ContactFormSection'
import EmbedSection from './components/EmbedSection'
import VideoSection from './components/VideoSection'
import Header from './components/Header'
import StickyFooter from './components/StickyFooter'
import Footer from './components/Footer'

interface Props {
  website: Website
  page: WebsitePage
  onSectionClick?: (sectionId: string) => void
  selectedSectionId?: string
}

export default function Renderer({ website, page, onSectionClick, selectedSectionId }: Props) {
  const theme = website.theme

  const wrap = (section: WebsiteSection, node: React.ReactNode) => {
    const isSelected = selectedSectionId === section.id
    return (
      <div
        key={section.id}
        className={`group relative ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        onClick={onSectionClick ? () => onSectionClick(section.id) : undefined}
      >
        {node}
        {onSectionClick ? (
          <div className="pointer-events-none absolute right-2 top-2 hidden rounded bg-black/50 px-2 py-1 text-xs text-white group-hover:block">
            {section.type}
          </div>
        ) : null}
      </div>
    )
  }

  const renderSection = (section: WebsiteSection) => {
    switch (section.type) {
      case 'hero':
        return wrap(section, <Hero section={section} theme={theme} />)
      case 'feature':
        return wrap(section, <FeatureSection section={section} theme={theme} />)
      case 'text':
        return wrap(section, <TextSection section={section} theme={theme} />)
      case 'image_gallery':
        return wrap(section, <ImageGallerySection section={section} theme={theme} />)
      case 'contact_form':
        return wrap(section, <ContactFormSection section={section} theme={theme} />)
      case 'embed':
        return wrap(section, <EmbedSection section={section} theme={theme} />)
      case 'video':
        return wrap(section, <VideoSection section={section} theme={theme} />)
      default:
        return null
    }
  }

  return (
    <>
      <Header website={website} theme={theme} />
      <main className={website.primaryCta?.phoneNumber ? 'pb-20 md:pb-0' : ''}>
        {page.sections?.length ? page.sections.map(renderSection) : (
          <div className="mx-auto max-w-3xl px-6 py-12 text-center">
            <p className="text-gray-500">This page has no sections yet.</p>
          </div>
        )}
      </main>
      <Footer website={website} theme={theme} />
      <StickyFooter website={website} theme={theme} />
    </>
  )
}
