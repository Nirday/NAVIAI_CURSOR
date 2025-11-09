"use client"

import React, { useState, useEffect } from 'react'
import { Website, WebsitePage, WebsiteSection, HeroSection, FeatureSection, TextSection, ImageGallerySection } from '@/libs/website-builder/src/types'
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface WebsiteEditorProps {
  userId: string
  className?: string
}

export default function WebsiteEditor({ userId, className = '' }: WebsiteEditorProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [website, setWebsite] = useState<Website | null>(null)
  const [selectedPageSlug, setSelectedPageSlug] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [searchConsoleConnected, setSearchConsoleConnected] = useState(false)

  useEffect(() => {
    fetchWebsite()
    checkSearchConsoleConnection()
    
    // Warn before leaving with unsaved changes
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const fetchWebsite = async () => {
    try {
      const res = await fetch('/api/website/me', {
        headers: { 'x-user-id': userId }
      })
      if (!res.ok) throw new Error(`Failed to load website (${res.status})`)
      const json = await res.json()
      const w = json.website as Website | null
      setWebsite(w)
      setSelectedPageSlug(w?.pages?.[0]?.slug || null)
      setHasUnsavedChanges(false)
    } catch (e: any) {
      setError(e?.message || 'Failed to load website')
    } finally {
      setLoading(false)
    }
  }

  const checkSearchConsoleConnection = async () => {
    try {
      const res = await fetch('/api/connections?platform=google_search_console', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const data = await res.json()
        setSearchConsoleConnected(data.connected || false)
      }
    } catch (e) {
      // Fail silently
    }
  }

  const handleSaveAndPublish = async () => {
    if (!website) return

    setSaving(true)
    setSaveMessage(null)

    try {
      const res = await fetch('/api/website/update', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ websiteData: website })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update website')
      }

      if (data.saved && data.published) {
        setSaveMessage({ type: 'success', text: 'Website updated and published successfully!' })
        setHasUnsavedChanges(false)
      } else if (data.saved && !data.published) {
        setSaveMessage({ 
          type: 'error', 
          text: 'Your changes are saved, but the publish failed. We are retrying in the background.' 
        })
        setHasUnsavedChanges(false) // Data is saved, so no unsaved changes
      }
    } catch (e: any) {
      setSaveMessage({ type: 'error', text: e?.message || 'Failed to update website' })
    } finally {
      setSaving(false)
    }
  }

  const updateWebsite = (updater: (prev: Website) => Website) => {
    setWebsite((prev) => {
      if (!prev) return prev
      return updater(prev)
    })
    setHasUnsavedChanges(true)
  }

  const selectedPage = website?.pages.find(p => p.slug === selectedPageSlug) || null

  if (loading) {
    return <div className={`p-6 ${className}`}>Loading website...</div>
  }

  if (error) {
    return <div className={`p-6 text-red-600 ${className}`}>{error}</div>
  }

  if (!website) {
    return <div className={`p-6 ${className}`}>No website yet. Generate one from chat.</div>
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with Save & Publish Button */}
      <div className="border-b bg-white p-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Website Editor</h1>
        <div className="flex items-center gap-4">
          {!searchConsoleConnected && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span>Your website is live, but we can't notify Google. </span>
              <a
                href={`/api/auth/callback/search-console/initiate?userId=${userId}`}
                className="text-blue-600 hover:underline font-medium"
              >
                Connect Google Search Console
              </a>
            </div>
          )}
          {saveMessage && (
            <div className={`flex items-center gap-2 text-sm ${
              saveMessage.type === 'success' ? 'text-green-600' : 'text-amber-600'
            }`}>
              {saveMessage.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5" />
              )}
              <span>{saveMessage.text}</span>
            </div>
          )}
          <button
            onClick={handleSaveAndPublish}
            disabled={saving || !hasUnsavedChanges}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            🚀 Save & Publish Website
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Page Navigation Sidebar */}
        <aside className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Pages</h2>
            <ul className="space-y-1">
              {website.pages.map((page) => (
                <li key={page.id}>
                  <button
                    onClick={() => setSelectedPageSlug(page.slug)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedPageSlug === page.slug
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium">{page.title}</div>
                    <div className="text-xs opacity-75">/{page.slug}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main Form Editor */}
        <main className="flex-1 overflow-y-auto p-6 bg-white">
          {selectedPage ? (
            <PageEditor
              page={selectedPage}
              website={website}
              onUpdate={(updatedPage) => {
                updateWebsite(prev => ({
                  ...prev,
                  pages: prev.pages.map(p => p.slug === selectedPage.slug ? updatedPage : p)
                }))
              }}
            />
          ) : (
            <div className="text-gray-500">Select a page to edit</div>
          )}
        </main>
      </div>
    </div>
  )
}

interface PageEditorProps {
  page: WebsitePage
  website: Website
  onUpdate: (page: WebsitePage) => void
}

function PageEditor({ page, website, onUpdate }: PageEditorProps) {
  const updatePage = (updater: (prev: WebsitePage) => WebsitePage) => {
    onUpdate(updater(page))
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Meta */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold mb-4">{page.title}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meta Title
            </label>
            <input
              type="text"
              value={page.metaTitle}
              onChange={(e) => updatePage(prev => ({ ...prev, metaTitle: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meta Description
            </label>
            <textarea
              value={page.metaDescription}
              onChange={(e) => updatePage(prev => ({ ...prev, metaDescription: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Sections */}
      {page.sections.map((section, index) => (
        <SectionForm
          key={section.id}
          section={section}
          index={index}
          onUpdate={(updated) => {
            updatePage(prev => ({
              ...prev,
              sections: prev.sections.map(s => s.id === section.id ? updated : s)
            }))
          }}
          onDelete={() => {
            updatePage(prev => ({
              ...prev,
              sections: prev.sections.filter(s => s.id !== section.id)
            }))
          }}
        />
      ))}
    </div>
  )
}

interface SectionFormProps {
  section: WebsiteSection
  index: number
  onUpdate: (section: WebsiteSection) => void
  onDelete: () => void
}

function SectionForm({ section, index, onUpdate, onDelete }: SectionFormProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const renderSectionFields = () => {
    switch (section.type) {
      case 'hero': {
        const s = section as HeroSection
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Headline *
              </label>
              <input
                type="text"
                required
                value={s.headline}
                onChange={(e) => onUpdate({ ...s, headline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sub-headline
              </label>
              <input
                type="text"
                value={s.subheadline || ''}
                onChange={(e) => onUpdate({ ...s, subheadline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hero Image
              </label>
              {s.backgroundImageUrl && (
                <div className="mb-2">
                  <img src={s.backgroundImageUrl} alt="Hero" className="w-full h-48 object-cover rounded-md" />
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  Upload Image
                </button>
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  AI-Generate Image
                </button>
              </div>
            </div>
          </div>
        )
      }
      case 'feature': {
        const s = section as FeatureSection
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Services / Features
              </label>
              <div className="space-y-3">
                {s.items.map((item, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-600">Service {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdate({
                            ...s,
                            items: s.items.filter((_, i) => i !== idx)
                          })
                        }}
                        className="text-red-600 text-sm hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Service name"
                        value={item.title}
                        onChange={(e) => {
                          onUpdate({
                            ...s,
                            items: s.items.map((x, i) => i === idx ? { ...x, title: e.target.value } : x)
                          })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <textarea
                        placeholder="Service description"
                        value={item.description}
                        onChange={(e) => {
                          onUpdate({
                            ...s,
                            items: s.items.map((x, i) => i === idx ? { ...x, description: e.target.value } : x)
                          })
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    onUpdate({
                      ...s,
                      items: [...s.items, { title: '', description: '' }]
                    })
                  }}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
                >
                  ➕ Add New Service
                </button>
              </div>
            </div>
          </div>
        )
      }
      case 'text': {
        const s = section as TextSection
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              value={s.content}
              onChange={(e) => onUpdate({ ...s, content: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={6}
            />
          </div>
        )
      }
      case 'image_gallery': {
        const s = section as ImageGallerySection
        return (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gallery Images
            </label>
            <div className="space-y-3">
              {s.images.map((img, idx) => (
                <div key={idx} className="border border-gray-200 rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-600">Image {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdate({
                          ...s,
                          images: s.images.filter((_, i) => i !== idx)
                        })
                      }}
                      className="text-red-600 text-sm hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                  {img.url && (
                    <div className="mb-2">
                      <img src={img.url} alt={img.alt} className="w-full h-32 object-cover rounded-md" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Image URL"
                      value={img.url}
                      onChange={(e) => {
                        onUpdate({
                          ...s,
                          images: s.images.map((x, i) => i === idx ? { ...x, url: e.target.value } : x)
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <input
                      type="text"
                      placeholder="Alt text"
                      value={img.alt}
                      onChange={(e) => {
                        onUpdate({
                          ...s,
                          images: s.images.map((x, i) => i === idx ? { ...x, alt: e.target.value } : x)
                        })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  onUpdate({
                    ...s,
                    images: [...s.images, { url: '', alt: '' }]
                  })
                }}
                className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
              >
                ➕ Add Image
              </button>
            </div>
          </div>
        )
      }
      default:
        return <div className="text-gray-500 text-sm">Section type "{section.type}" editor not implemented</div>
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg">
      <div
        className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            ▼ {section.type.charAt(0).toUpperCase() + section.type.slice(1).replace('_', ' ')} Section
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="text-red-600 text-sm hover:underline"
        >
          Delete
        </button>
      </div>
      {isExpanded && (
        <div className="p-4">
          {renderSectionFields()}
        </div>
      )}
    </div>
  )
}

