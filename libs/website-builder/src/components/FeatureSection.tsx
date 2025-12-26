import React from 'react'
import { FeatureSection as FeatureSectionType, WebsiteTheme } from '../types'

interface Props {
  section: FeatureSectionType
  theme: WebsiteTheme
  websiteTheme?: string // Optional theme identifier (e.g., "luxury_black_gold")
}

export default function FeatureSection({ section, theme, websiteTheme }: Props) {
  const items = section.items || []
  const hasItems = items.length > 0
  const isLuxury = websiteTheme === 'luxury_black_gold' || theme.colorPalette.accent === '#D4AF37' || theme.colorPalette.accent === '#F59E0B'

  // Luxury theme styling
  if (isLuxury) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-20 bg-neutral-900">
        {section.title && (
          <h2 className="text-4xl font-serif text-white text-center mb-16" style={{ fontFamily: theme.font.heading }}>
            {section.title}
          </h2>
        )}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {hasItems ? (
            items.map((item, idx) => (
              <div 
                key={idx} 
                className="group relative bg-neutral-900 border border-neutral-800 p-8 hover:border-amber-500 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/20"
              >
                {item.icon ? (
                  <div className="mb-4 text-4xl text-amber-500">{item.icon}</div>
                ) : null}
                <h3 className="text-2xl font-serif text-white mb-4" style={{ fontFamily: theme.font.heading }}>
                  {item.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6" style={{ fontFamily: theme.font.body }}>
                  {item.description}
                </p>
                <span className="text-amber-500 text-xs font-bold uppercase tracking-widest group-hover:text-white transition-colors">
                  Learn More &rarr;
                </span>
              </div>
            ))
          ) : (
            <div className="col-span-3 rounded border border-neutral-800 p-6 text-center bg-neutral-900">
              <p className="text-gray-400 opacity-70">Feature section - add items to display.</p>
            </div>
          )}
        </div>
      </section>
    )
  }

  // Default theme styling
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      {section.title && (
        <h2 className="text-3xl font-semibold text-center mb-12" style={{ color: theme.colorPalette.text, fontFamily: theme.font.heading }}>
          {section.title}
        </h2>
      )}
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
