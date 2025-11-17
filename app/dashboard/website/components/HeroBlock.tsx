import React from 'react'

export interface HeroBlockProps {
  headline: string
  subheadline: string
}

export function HeroBlock({ headline, subheadline }: HeroBlockProps) {
  return (
    <div className="w-full bg-gray-700 p-12 text-center">
      <h1 className="text-4xl font-bold">{headline}</h1>
      <p className="text-xl mt-4 text-gray-300">{subheadline}</p>
    </div>
  )
}

