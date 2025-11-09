"use client"

import React, { useState } from 'react'
import { ContactFormSection as ContactFormSectionType, WebsiteTheme } from '../types'

interface Props {
  section: ContactFormSectionType
  theme: WebsiteTheme
}

export default function ContactFormSection({ section, theme }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  })

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Get current domain
      const domain = window.location.host

      const response = await fetch('/api/leads/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          domain
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit form')
      }

      setSuccess(true)
      // Reset form
      setFormData({ name: '', email: '', phone: '', message: '' })
    } catch (err: any) {
      console.error('Form submission error:', err)
      setError(err?.message || 'Sorry, something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (success) {
    return (
      <section className="mx-auto max-w-xl px-6 py-12 text-center">
        <p style={{ color: theme.colorPalette.text, fontFamily: theme.font.body }}>
          {section.successMessage || 'Thanks! We will get back to you soon.'}
        </p>
      </section>
    )
  }

  const fields = section.fields?.length
    ? section.fields
    : [
        { name: 'name' as const, label: 'Name', required: true },
        { name: 'email' as const, label: 'Email', required: true },
        { name: 'message' as const, label: 'Message', required: true }
      ]

  return (
    <section className="mx-auto max-w-xl px-6 py-12">
      <form onSubmit={onSubmit} className="space-y-4">
        {fields.map((f) => (
          <div key={f.name} className="flex flex-col">
            <label className="mb-1 text-sm" style={{ color: theme.colorPalette.text }}>{f.label}</label>
            {f.name === 'message' ? (
              <textarea
                className="rounded border p-2"
                required={f.required}
                value={formData.message}
                onChange={(e) => handleChange('message', e.target.value)}
                rows={4}
              />
            ) : (
              <input
                type={f.name === 'email' ? 'email' : 'text'}
                className="rounded border p-2"
                required={f.required}
                value={formData[f.name as keyof typeof formData]}
                onChange={(e) => handleChange(f.name, e.target.value)}
              />
            )}
          </div>
        ))}
        {error && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded px-4 py-2 disabled:opacity-50"
          style={{ backgroundColor: theme.colorPalette.primary, color: '#ffffff' }}
        >
          {section.submitLabel || (submitting ? 'Sending…' : 'Send')}
        </button>
      </form>
    </section>
  )
}
