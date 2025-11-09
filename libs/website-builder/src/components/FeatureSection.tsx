import React from 'react'
import { FeatureSection as FeatureSectionType, WebsiteTheme } from '../types'

interface Props {
  section: FeatureSectionType
  theme: WebsiteTheme
}

export default function FeatureSection({ section, theme }: Props) {
  const items = section.items || []
  const hasItems = items.length > 0

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {hasItems ? (
          items.map((item, idx) => (
            <div key={idx} className="rounded border p-6" style={{ borderColor: theme.colorPalette.surface }}>
              {item.icon ? <div className="mb-3 text-3xl">{item.icon}</div> : null}
              <h3 className="text-xl font-semibold" style={{ color: theme.colorPalette.text, fontFamily: theme.font.heading }}>
                {item.title}
              </h3>
              <p className="mt-2" style={{ color: theme.colorPalette.text, opacity: 0.9, fontFamily: theme.font.body }}>
                {item.description}
              </p>
            </div>
          ))
        ) : (
          <div className="col-span-2 rounded border p-6 text-center" style={{ borderColor: theme.colorPalette.surface }}>
            <p style={{ color: theme.colorPalette.text, opacity: 0.7 }}>Feature section - add items to display.</p>
          </div>
        )}
      </div>
    </section>
  )
}
