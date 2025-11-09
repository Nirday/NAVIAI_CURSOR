"use client"

import React from 'react'
import { Website, WebsiteTheme } from '../types'

interface Props {
  website: Website
  theme: WebsiteTheme
}

export default function Header({ website, theme }: Props) {
  const primaryCta = website.primaryCta

  // Don't render if no phone number
  if (!primaryCta?.phoneNumber) {
    return null
  }

  return (
    <header className="border-b" style={{ backgroundColor: theme.colorPalette.background }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="text-xl font-bold" style={{ color: theme.colorPalette.text, fontFamily: theme.font.heading }}>
          {website.name}
        </div>
        <nav className="hidden items-center space-x-6 md:flex">
          {website.pages.map((page) => (
            <a
              key={page.id}
              href={page.slug === 'home' ? '/' : `/${page.slug}`}
              className="text-sm hover:opacity-80"
              style={{ color: theme.colorPalette.text, fontFamily: theme.font.body }}
            >
              {page.title}
            </a>
          ))}
          <a
            href={`tel:${primaryCta.phoneNumber}`}
            className="ml-4 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: theme.colorPalette.primary || theme.colorPalette.accent || '#3B82F6' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {primaryCta.text}
          </a>
        </nav>
      </div>
    </header>
  )
}

