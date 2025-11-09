import React from 'react'
import { TextSection as TextSectionType, WebsiteTheme } from '../types'

interface Props {
  section: TextSectionType
  theme: WebsiteTheme
}

export default function TextSection({ section, theme }: Props) {
  const content = section.content || ''

  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      {content ? (
        <div className="prose" style={{ color: theme.colorPalette.text, fontFamily: theme.font.body }}>
          {content}
        </div>
      ) : (
        <div className="rounded border p-6 text-center" style={{ borderColor: theme.colorPalette.surface }}>
          <p style={{ color: theme.colorPalette.text, opacity: 0.7 }}>Text section - add content to display.</p>
        </div>
      )}
    </section>
  )
}
