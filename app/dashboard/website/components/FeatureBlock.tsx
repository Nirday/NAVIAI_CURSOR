import React from 'react'

export interface FeatureBlockProps {
  title: string
  features: { name: string; description: string }[]
}

export function FeatureBlock({ title, features }: FeatureBlockProps) {
  return (
    <div className="w-full bg-gray-800 p-12">
      <h2 className="text-3xl font-bold text-center mb-8">{title}</h2>
      <div className="grid grid-cols-3 gap-4">
        {features.map((feature, i) => (
          <div key={i} className="bg-gray-700 p-4 rounded-lg">
            <h3 className="font-semibold text-lg">{feature.name}</h3>
            <p className="text-gray-300">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

