"use client"

import React, { useState, useEffect } from 'react'
import { PlusIcon, TrashIcon, PencilIcon, XMarkIcon } from '@heroicons/react/24/outline'
import CommunicationComposer from './CommunicationComposer'
import { AutomationSequence, AutomationStep } from '@/libs/communication-hub/src/types'

interface AutomationBuilderProps {
  userId: string
  sequenceId?: string // If provided, edit existing sequence
  onSave?: (sequence: AutomationSequence) => void
  onCancel?: () => void
  className?: string
}

type StepAction = 'send_email' | 'send_sms' | 'wait'

interface StepData {
  id?: string // Only for existing steps
  action: StepAction
  subject?: string
  body?: string
  waitDays?: number
}

export default function AutomationBuilder({
  userId,
  sequenceId,
  onSave,
  onCancel,
  className = ''
}: AutomationBuilderProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<StepData[]>([])
  const [showAddStepMenu, setShowAddStepMenu] = useState(false)
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null)
  const [editingStepType, setEditingStepType] = useState<'email' | 'sms' | 'wait' | null>(null)
  const [waitDays, setWaitDays] = useState<number>(1)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (sequenceId) {
      loadSequence()
    }
  }, [sequenceId])

  const loadSequence = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/communication/automation/sequences/${sequenceId}`, {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const data = await res.json()
        const seq = data.sequence
        setName(seq.name)
        setDescription(seq.description || '')
        setSteps(seq.steps.map((s: AutomationStep) => ({
          id: s.id,
          action: s.action,
          subject: s.subject || undefined,
          body: s.body || undefined,
          waitDays: s.waitDays || undefined
        })))
      }
    } catch (error) {
      console.error('Failed to load sequence:', error)
    } finally {
      setLoading(false)
    }
  }

  const canAddWaitStep = () => {
    if (steps.length === 0) return true
    return steps[steps.length - 1].action !== 'wait'
  }

  const handleAddStep = (action: StepAction) => {
    if (action === 'wait') {
      if (!canAddWaitStep()) {
        alert('Cannot add consecutive wait steps')
        return
      }
      // Add wait step directly
      setSteps([...steps, { action: 'wait', waitDays: 1 }])
      setShowAddStepMenu(false)
    } else {
      // Open composer for send step
      setEditingStepIndex(steps.length)
      setEditingStepType(action === 'send_email' ? 'email' : 'sms')
      setShowAddStepMenu(false)
    }
  }

  const handleEditStep = (index: number) => {
    const step = steps[index]
    if (step.action === 'wait') {
      setEditingStepIndex(index)
      setEditingStepType('wait')
      setWaitDays(step.waitDays || 1)
    } else {
      setEditingStepIndex(index)
      setEditingStepType(step.action === 'send_email' ? 'email' : 'sms')
    }
  }

  const handleDeleteStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index))
  }

  const handleComposerContent = (content: {
    subjectLines: string[]
    selectedSubjects: string[]
    body: string
  }) => {
    if (editingStepIndex === null || editingStepType === null || editingStepType === 'wait') return

    const newStep: StepData = {
      action: editingStepType === 'email' ? 'send_email' : 'send_sms',
      subject: editingStepType === 'email' ? content.selectedSubjects[0] : undefined,
      body: content.body
    }

    if (editingStepIndex === steps.length) {
      // Adding new step
      setSteps([...steps, newStep])
    } else {
      // Editing existing step
      const updatedSteps = [...steps]
      updatedSteps[editingStepIndex] = { ...updatedSteps[editingStepIndex], ...newStep }
      setSteps(updatedSteps)
    }

    setEditingStepIndex(null)
    setEditingStepType(null)
  }

  const handleSaveWaitStep = () => {
    if (editingStepIndex === null) return

    const newStep: StepData = {
      action: 'wait',
      waitDays
    }

    if (editingStepIndex === steps.length) {
      // Adding new step
      setSteps([...steps, newStep])
    } else {
      // Editing existing step
      const updatedSteps = [...steps]
      updatedSteps[editingStepIndex] = { ...updatedSteps[editingStepIndex], ...newStep }
      setSteps(updatedSteps)
    }

    setEditingStepIndex(null)
    setEditingStepType(null)
    setWaitDays(1)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a sequence name')
      return
    }

    if (steps.length === 0) {
      alert('Please add at least one step')
      return
    }

    setSaving(true)
    try {
      const url = sequenceId
        ? `/api/communication/automation/sequences/${sequenceId}`
        : '/api/communication/automation/sequences'
      
      const method = sequenceId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          steps: steps.map(step => ({
            action: step.action,
            subject: step.subject,
            body: step.body,
            waitDays: step.waitDays
          }))
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save sequence')
      }

      const data = await res.json()
      if (onSave) {
        onSave(data.sequence)
      }
    } catch (error: any) {
      console.error('Error saving sequence:', error)
      alert(`Failed to save sequence: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const getStepPreview = (step: StepData): string => {
    if (step.action === 'wait') {
      return `Wait ${step.waitDays || 1} day${(step.waitDays || 1) > 1 ? 's' : ''}`
    } else if (step.action === 'send_email') {
      return step.subject ? `Email: ${step.subject}` : 'Email (no subject)'
    } else {
      // send_sms
      return step.body ? `SMS: ${step.body.substring(0, 50)}${step.body.length > 50 ? '...' : ''}` : 'SMS (no content)'
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading...</div>
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {sequenceId ? 'Edit Automation Sequence' : 'Create Automation Sequence'}
        </h2>
        <p className="text-gray-600">Build a follow-up sequence for new leads</p>
      </div>

      {/* Trigger (Static) */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
        <p className="text-sm font-medium text-gray-900">
          Trigger: <span className="text-gray-600">When a new lead is added</span>
        </p>
      </div>

      {/* Sequence Details */}
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Sequence Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="E.g., New Lead Welcome Sequence"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this sequence..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>
      </div>

      {/* Steps List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Steps</h3>
        {steps.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center border border-gray-200 rounded-md">
            No steps yet. Add your first step below.
          </p>
        ) : (
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 border border-gray-300 rounded-md bg-white"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {step.action === 'wait' ? '⏱️ Wait' : step.action === 'send_email' ? '📧 Send Email' : '💬 Send SMS'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{getStepPreview(step)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditStep(index)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Edit step"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteStep(index)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete step"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Step Menu */}
        <div className="mt-4 relative">
          <button
            onClick={() => setShowAddStepMenu(!showAddStepMenu)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
          >
            <PlusIcon className="h-4 w-4" />
            Add Step
          </button>
          {showAddStepMenu && (
            <div className="absolute z-10 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg">
              <button
                onClick={() => handleAddStep('send_email')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                📧 Send Email
              </button>
              <button
                onClick={() => handleAddStep('send_sms')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                💬 Send SMS
              </button>
              <button
                onClick={() => handleAddStep('wait')}
                disabled={!canAddWaitStep()}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⏱️ Wait
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || steps.length === 0}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Sequence'}
        </button>
      </div>

      {/* Composer Modal (for Email/SMS steps) */}
      {editingStepType !== null && editingStepType !== 'wait' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingStepIndex === steps.length ? 'Add' : 'Edit'} {editingStepType === 'email' ? 'Email' : 'SMS'} Step
                </h3>
                <button
                  onClick={() => {
                    setEditingStepIndex(null)
                    setEditingStepType(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <CommunicationComposer
                userId={userId}
                onContentGenerated={(content) => {
                  handleComposerContent(content)
                  setEditingStepIndex(null)
                  setEditingStepType(null)
                }}
                skipAbTest={true} // Automation steps don't support A/B testing
              />
            </div>
          </div>
        </div>
      )}

      {/* Wait Step Modal */}
      {editingStepType === 'wait' && editingStepIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingStepIndex === steps.length ? 'Add' : 'Edit'} Wait Step
              </h3>
              <button
                onClick={() => {
                  setEditingStepIndex(null)
                  setEditingStepType(null)
                  setWaitDays(1)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="waitDays" className="block text-sm font-medium text-gray-700 mb-2">
                  Wait Duration (Days) *
                </label>
                <input
                  id="waitDays"
                  type="number"
                  min="1"
                  value={waitDays}
                  onChange={(e) => setWaitDays(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum: 1 day</p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setEditingStepIndex(null)
                    setEditingStepType(null)
                    setWaitDays(1)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveWaitStep}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

