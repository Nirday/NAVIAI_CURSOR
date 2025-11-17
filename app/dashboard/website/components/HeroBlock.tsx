import React from 'react'
import { EditableText } from './EditableText'

export interface HeroBlockProps {
  headline: string
  subheadline: string
  // Add a function to handle updates
  onUpdate: (newProps: Partial<HeroBlockProps>) => void
}

export function HeroBlock({ headline, subheadline, onUpdate }: HeroBlockProps) {
  return (
    <div className="w-full bg-gray-700 p-12 text-center">
      <EditableText
        initialValue={headline}
        onSave={(newValue) => onUpdate({ headline: newValue })}
        className="text-4xl font-bold"
      />
      <EditableText
        initialValue={subheadline}
        onSave={(newValue) => onUpdate({ subheadline: newValue })}
        className="text-xl mt-4 text-gray-300"
      />
    </div>
  )
}

