import React from 'react'
import { ImageGallerySection as ImageGallerySectionType, WebsiteTheme } from '../types'

interface Props {
  section: ImageGallerySectionType
  theme: WebsiteTheme
}

export default function ImageGallerySection({ section, theme }: Props) {
  const images = section.images || []

  if (!images.length) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded border p-6 text-center" style={{ borderColor: theme.colorPalette.surface }}>
          <p style={{ color: theme.colorPalette.text, opacity: 0.7 }}>Image Gallery section - add images to display.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {images.map((img, idx) => (
          <figure key={idx} className="overflow-hidden rounded border" style={{ borderColor: theme.colorPalette.surface }}>
            <img src={img.url} alt={img.alt} className="h-48 w-full object-cover" />
            {img.caption ? (
              <figcaption className="p-2 text-sm" style={{ color: theme.colorPalette.text, fontFamily: theme.font.body }}>
                {img.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  )
}
