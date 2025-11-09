import React from 'react'
import { VideoSection as VideoSectionType, WebsiteTheme } from '../types'

interface Props {
  section: VideoSectionType
  theme: WebsiteTheme
}

export default function VideoSection({ section, theme }: Props) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <div className="overflow-hidden rounded border" style={{ borderColor: theme.colorPalette.surface }}>
        <video className="w-full" controls>
          <source src={section.videoUrl} />
        </video>
        {section.caption ? (
          <p className="p-2 text-sm" style={{ color: theme.colorPalette.text, fontFamily: theme.font.body }}>
            {section.caption}
          </p>
        ) : null}
      </div>
    </section>
  )
}
