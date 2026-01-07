'use client'

import { useState } from 'react'

interface WebsiteDraftPreviewProps {
  draft: any
  businessName: string
  onApprove?: () => void
  onEdit?: () => void
}

export default function WebsiteDraftPreview({ draft, businessName, onApprove, onEdit }: WebsiteDraftPreviewProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('hero')

  if (!draft) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Generating your website draft...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">🎨 Your Website Draft</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Here's your {draft.modelName} website structure with SEO-optimized content and image placeholders.
        </p>
      </div>

      {/* SEO Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-blue-100">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>🔍</span> SEO & Meta Tags
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-600">Page Title</label>
            <p className="text-gray-800 mt-1">{draft.seo?.title || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600">Meta Description</label>
            <p className="text-gray-800 mt-1">{draft.seo?.description || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600">Open Graph</label>
            <p className="text-gray-800 mt-1">{draft.seo?.og || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600">Schema Types</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {draft.seo?.schema?.map((schema: string, i: number) => (
                <span key={i} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                  {schema}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Page Sections */}
      <div className="space-y-4">
        {draft.sections?.map((section: any, index: number) => (
          <div
            key={section.id || index}
            className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
          >
            {/* Section Header */}
            <div
              className="px-6 py-4 bg-gray-50 border-b border-gray-200 cursor-pointer flex items-center justify-between"
              onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{section.icon || '📄'}</span>
                <div>
                  <h3 className="font-bold text-gray-800">{section.title}</h3>
                  <p className="text-sm text-gray-500">{section.type}</p>
                </div>
              </div>
              <span className="text-gray-400 text-xl">
                {expandedSection === section.id ? '−' : '+'}
              </span>
            </div>

            {/* Section Content */}
            {expandedSection === section.id && (
              <div className="p-6">
                {/* Headline */}
                {section.headline && (
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Headline</label>
                    <h2 className="text-2xl font-bold text-gray-800 mt-1">{section.headline}</h2>
                  </div>
                )}

                {/* Subheadline */}
                {section.subheadline && (
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Subheadline</label>
                    <p className="text-lg text-gray-600 mt-1">{section.subheadline}</p>
                  </div>
                )}

                {/* Image Placeholder */}
                {section.image && (
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Image</label>
                    <div className="mt-2 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                      <div className="text-4xl mb-2">📷</div>
                      <p className="font-semibold text-gray-700">{section.image.alt}</p>
                      <p className="text-sm text-gray-500 mt-1">{section.image.description}</p>
                      <p className="text-xs text-gray-400 mt-2">Recommended: {section.image.recommendedSize || '1920x1080px'}</p>
                    </div>
                  </div>
                )}

                {/* Content */}
                {section.content && (
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Content</label>
                    <div className="mt-2 text-gray-700 whitespace-pre-wrap">{section.content}</div>
                  </div>
                )}

                {/* Items List (Services, Fleet, etc.) */}
                {section.items && section.items.length > 0 && (
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-500 uppercase">
                      {section.itemsLabel || 'Items'}
                    </label>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {section.items.map((item: any, i: number) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <p className="font-medium text-gray-800">{item.name || item}</p>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                          {item.price && (
                            <p className="text-sm font-semibold text-blue-600 mt-1">{item.price}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA */}
                {section.cta && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Call to Action</label>
                    <button className="mt-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                      {section.cta.text || section.cta}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            Edit Sections
          </button>
        )}
        {onApprove && (
          <button
            onClick={onApprove}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
          >
            Approve & Build Website →
          </button>
        )}
      </div>
    </div>
  )
}

