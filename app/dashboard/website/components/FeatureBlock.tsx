import React from 'react'
import { EditableText } from './EditableText'

export interface FeatureBlockProps {
  title: string
  features: { name: string; description: string }[]
  onUpdate?: (newProps: Partial<FeatureBlockProps>) => void
  theme?: 'luxury_black_gold' | 'default' // Optional theme prop
}

export function FeatureBlock({ title, features, onUpdate, theme = 'default' }: FeatureBlockProps) {
  const updateFeature = (index: number, field: 'name' | 'description', value: string) => {
    if (!onUpdate) return
    const newFeatures = [...features]
    newFeatures[index] = { ...newFeatures[index], [field]: value }
    onUpdate({ features: newFeatures })
  }

  const isLuxury = theme === 'luxury_black_gold'

  // Luxury theme rendering
  if (isLuxury) {
    return (
      <div className="w-full bg-neutral-900 p-12">
        {onUpdate ? (
          <EditableText
            initialValue={title}
            onSave={(newValue) => onUpdate({ title: newValue })}
            className="text-4xl font-serif text-white text-center mb-16"
          />
        ) : (
          <h2 className="text-4xl font-serif text-white text-center mb-16">{title}</h2>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div 
              key={i} 
              className="group relative bg-neutral-900 border border-neutral-800 p-8 hover:border-amber-500 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/20"
            >
              {onUpdate ? (
                <>
                  <EditableText
                    initialValue={feature.name}
                    onSave={(newValue) => updateFeature(i, 'name', newValue)}
                    className="text-2xl font-serif text-white mb-4"
                  />
                  <EditableText
                    initialValue={feature.description}
                    onSave={(newValue) => updateFeature(i, 'description', newValue)}
                    className="text-gray-400 text-sm leading-relaxed mb-6"
                  />
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-serif text-white mb-4">{feature.name}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6">{feature.description}</p>
                  <span className="text-amber-500 text-xs font-bold uppercase tracking-widest group-hover:text-white transition-colors">
                    Learn More &rarr;
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Default theme rendering
  return (
    <div className="w-full bg-gray-800 p-12">
      {onUpdate ? (
        <EditableText
          initialValue={title}
          onSave={(newValue) => onUpdate({ title: newValue })}
          className="text-3xl font-bold text-center mb-8"
        />
      ) : (
        <h2 className="text-3xl font-bold text-center mb-8">{title}</h2>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((feature, i) => (
          <div key={i} className="bg-gray-700 p-4 rounded-lg">
            {onUpdate ? (
              <>
                <EditableText
                  initialValue={feature.name}
                  onSave={(newValue) => updateFeature(i, 'name', newValue)}
                  className="font-semibold text-lg mb-2"
                />
                <EditableText
                  initialValue={feature.description}
                  onSave={(newValue) => updateFeature(i, 'description', newValue)}
                  className="text-gray-300"
                />
              </>
            ) : (
              <>
                <h3 className="font-semibold text-lg">{feature.name}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

