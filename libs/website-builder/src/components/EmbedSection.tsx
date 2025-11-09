import React from 'react'
import { EmbedSection as EmbedSectionType, WebsiteTheme } from '../types'

interface Props {
  section: EmbedSectionType
  theme: WebsiteTheme
}

export default function EmbedSection({ section, theme }: Props) {
  const html = section.htmlContent || ''

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      {html ? (
        <div className="relative w-full" style={{ minHeight: '400px' }}>
          <iframe
            srcDoc={html}
            sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            className="w-full border-0"
            style={{ minHeight: '400px' }}
            title="Embedded content"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="rounded border p-6 text-center" style={{ borderColor: theme.colorPalette.surface }}>
          <p style={{ color: theme.colorPalette.text, opacity: 0.7 }}>Embed section - add HTML to display.</p>
        </div>
      )}
    </section>
  )
}
