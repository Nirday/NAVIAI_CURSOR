"use client"

import React from 'react'
import { Website, WebsiteTheme } from '../types'

interface Props {
  website: Website
  theme: WebsiteTheme
}

export default function StickyFooter({ website, theme }: Props) {
  const primaryCta = website.primaryCta

  // Don't render if no phone number
  if (!primaryCta?.phoneNumber) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t shadow-lg sm:block md:hidden" style={{ backgroundColor: theme.colorPalette.background }}>
      <div className="mx-auto w-full px-4 py-3">
        <a
          href={`tel:${primaryCta.phoneNumber}`}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: theme.colorPalette.primary || theme.colorPalette.accent || '#3B82F6' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          {primaryCta.text}
        </a>
      </div>
    </div>
  )
}

