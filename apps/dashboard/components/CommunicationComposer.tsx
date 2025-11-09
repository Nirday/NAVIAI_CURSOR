"use client"

import React, { useState } from 'react'
import { SparklesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface CommunicationComposerProps {
  userId: string
  onContentGenerated?: (content: {
    subjectLines: string[]
    selectedSubjects: string[]
    body: string
  }) => void
  skipAbTest?: boolean // If true, only allow 1 subject selection
  onSkipAbTestChange?: (skip: boolean) => void // Callback when skip toggle changes
  className?: string
}

export default function CommunicationComposer({
  userId,
  onContentGenerated,
  skipAbTest = false,
  onSkipAbTestChange,
  className = ''
}: CommunicationComposerProps) {
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subjectLines, setSubjectLines] = useState<string[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [body, setBody] = useState('')
  const [manualSubjects, setManualSubjects] = useState<string[]>(['', '', ''])
  const [showManualEntry, setShowManualEntry] = useState(false)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    setGenerating(true)
    setError(null)
    setShowManualEntry(false)

    try {
      const res = await fetch('/api/communication/generate-content', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: prompt.trim() })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to generate content')
      }

      const data = await res.json()
      
      if (!data.subjectLines || data.subjectLines.length !== 3) {
        throw new Error('AI did not generate 3 subject lines. Please use manual entry.')
      }

      setSubjectLines(data.subjectLines)
      setBody(data.body || '')
      setSelectedSubjects([]) // Reset selection
    } catch (err: any) {
      console.error('Error generating content:', err)
      setError(err.message || 'Failed to generate content')
      setShowManualEntry(true) // Show manual entry on error
    } finally {
      setGenerating(false)
    }
  }

  const handleSubjectToggle = (subject: string) => {
    if (selectedSubjects.includes(subject)) {
      // Deselect
      setSelectedSubjects(selectedSubjects.filter(s => s !== subject))
    } else {
      // Select (max 1 if skipAbTest, max 2 otherwise)
      const maxSelections = skipAbTest ? 1 : 2
      if (selectedSubjects.length < maxSelections) {
        setSelectedSubjects([...selectedSubjects, subject])
      }
    }
  }

  const handleManualSubjectChange = (index: number, value: string) => {
    const newSubjects = [...manualSubjects]
    newSubjects[index] = value
    setManualSubjects(newSubjects)
    
    // Update subjectLines if using manual entry
    if (showManualEntry) {
      setSubjectLines(newSubjects.filter(s => s.trim()))
    }
  }

  const handleUseManualSubjects = () => {
    const validSubjects = manualSubjects.filter(s => s.trim())
    if (validSubjects.length >= 2) {
      setSubjectLines(validSubjects.slice(0, 3))
      setSelectedSubjects(validSubjects.slice(0, 2))
      setShowManualEntry(false)
      setError(null)
    } else {
      setError('Please enter at least 2 subject lines')
    }
  }

  const handleSave = () => {
    const requiredSelections = skipAbTest ? 1 : 2
    if (selectedSubjects.length !== requiredSelections) {
      setError(`Please select exactly ${requiredSelections} subject line${requiredSelections > 1 ? 's' : ''}${skipAbTest ? '' : ' for A/B testing'}`)
      return
    }

    if (!body.trim()) {
      setError('Body text is required')
      return
    }

    if (onContentGenerated) {
      onContentGenerated({
        subjectLines,
        selectedSubjects,
        body: body.trim()
      })
    }
  }

  const getCharacterCount = (text: string): number => {
    return text.length
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Prompt Input */}
      <div>
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
          What would you like to communicate?
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="E.g., Announce a new service, promote a special offer, share company news..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
          disabled={generating}
        />
        <button
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          className="mt-3 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SparklesIcon className="h-4 w-4" />
          {generating ? 'Generating...' : 'Generate Content'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Manual Subject Entry */}
      {showManualEntry && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Manual Subject Line Entry
          </h3>
          <div className="space-y-3">
            {manualSubjects.map((subject, index) => (
              <div key={index}>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => handleManualSubjectChange(index, e.target.value)}
                  placeholder={`Subject line ${index + 1}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {getCharacterCount(subject)} characters
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={handleUseManualSubjects}
            className="mt-3 px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50"
          >
            Use These Subjects
          </button>
        </div>
      )}

      {/* Subject Lines Selection */}
      {subjectLines.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {skipAbTest 
              ? 'Select 1 subject line'
              : 'Select 2 subjects for A/B testing'}
          </label>
          <div className="space-y-3">
            {subjectLines.map((subject, index) => {
              const isSelected = selectedSubjects.includes(subject)
              const maxSelections = skipAbTest ? 1 : 2
              const isDisabled = !isSelected && selectedSubjects.length >= maxSelections
              
              return (
                <label
                  key={index}
                  className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : isDisabled
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSubjectToggle(subject)}
                    disabled={isDisabled}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{subject}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {getCharacterCount(subject)} characters
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
          {selectedSubjects.length < (skipAbTest ? 1 : 2) && (
            <p className="text-xs text-gray-500 mt-2">
              {selectedSubjects.length} of {skipAbTest ? 1 : 2} selected
            </p>
          )}
        </div>
      )}

      {/* Body Editor */}
      {body && (
        <div>
          <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-2">
            Message Body
            <span className="text-gray-500 font-normal ml-2">
              (The CTA is integrated inline - edit as needed)
            </span>
          </label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={10}
            placeholder="Body text will appear here after generation..."
          />
          <p className="text-xs text-gray-500 mt-1">
            {getCharacterCount(body)} characters
          </p>
        </div>
      )}

      {/* Save Button */}
      {subjectLines.length > 0 && body && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={selectedSubjects.length !== 2 || !body.trim()}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Content
          </button>
        </div>
      )}
    </div>
  )
}

