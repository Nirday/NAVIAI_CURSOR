import React from 'react'
import { HeroSection, WebsiteTheme } from '../types'

interface Props {
  section: HeroSection
  theme: WebsiteTheme
}

export default function Hero({ section, theme }: Props) {
  const { headline, subheadline, ctaButton, backgroundImageUrl, backgroundVideoUrl } = section
  const bgStyle = backgroundImageUrl
    ? { backgroundImage: `url(${backgroundImageUrl})` }
    : undefined

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ backgroundColor: theme.colorPalette.background }}
    >
      {backgroundVideoUrl ? (
        <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline>
          <source src={backgroundVideoUrl} />
        </video>
      ) : null}
      <div
        className={`relative mx-auto max-w-5xl px-6 py-24 text-center`}
        style={bgStyle}
      >
        <h1
          className="text-4xl font-bold"
          style={{ color: theme.colorPalette.text, fontFamily: theme.font.heading }}
        >
          {headline}
        </h1>
        {subheadline ? (
          <p className="mt-4 text-lg" style={{ color: theme.colorPalette.text, opacity: 0.8, fontFamily: theme.font.body }}>
            {subheadline}
          </p>
        ) : null}
        {ctaButton ? (
          <a
            href={ctaButton.href}
            className="mt-8 inline-block rounded px-5 py-3 font-medium"
            style={{ backgroundColor: theme.colorPalette.primary, color: '#ffffff' }}
          >
            {ctaButton.label}
          </a>
        ) : null}
      </div>
    </section>
  )
}
