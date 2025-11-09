"use client"

import React from 'react'
import { Website, WebsiteTheme } from '../types'

interface Props {
  website: Website
  theme: WebsiteTheme
}

export default function Footer({ website, theme }: Props) {
  const footer = website.footer
  if (!footer) return null

  return (
    <footer className="border-t py-8" style={{ backgroundColor: theme.colorPalette.surface || theme.colorPalette.background }}>
      <div className="mx-auto max-w-7xl px-6">
        {footer.contactInfo && (
          <div className="mb-4 text-sm" style={{ color: theme.colorPalette.text, fontFamily: theme.font.body }}>
            {footer.contactInfo}
          </div>
        )}
        {footer.socialLinks && footer.socialLinks.length > 0 && (
          <div className="mb-4 flex gap-4">
            {footer.socialLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:opacity-80"
                style={{ color: theme.colorPalette.text }}
              >
                {link.platform}
              </a>
            ))}
          </div>
        )}
        {footer.legalLinks && footer.legalLinks.length > 0 && (
          <div className="mb-4 flex gap-4 text-sm">
            {footer.legalLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.slug}
                className="hover:opacity-80"
                style={{ color: theme.colorPalette.text, fontFamily: theme.font.body }}
              >
                {link.text}
              </a>
            ))}
          </div>
        )}
        {footer.copyrightText && (
          <div className="text-xs" style={{ color: theme.colorPalette.text, opacity: 0.7, fontFamily: theme.font.body }}>
            {footer.copyrightText}
          </div>
        )}
      </div>
    </footer>
  )
}

