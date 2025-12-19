import React from 'react'
import { EditableText } from './EditableText'

export interface FeatureBlockProps {
  title: string
  features: { name: string; description: string }[]
  onUpdate?: (newProps: Partial<FeatureBlockProps>) => void
}

export function FeatureBlock({ title, features, onUpdate }: FeatureBlockProps) {
  const updateFeature = (index: number, field: 'name' | 'description', value: string) => {
    if (!onUpdate) return
    const newFeatures = [...features]
    newFeatures[index] = { ...newFeatures[index], [field]: value }
    onUpdate({ features: newFeatures })
  }

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

