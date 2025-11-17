'use client'

import React, { useState, useEffect } from 'react'

interface EditableTextProps {
  initialValue: string
  onSave: (value: string) => void
  className?: string
}

export function EditableText({ initialValue, onSave, className }: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialValue)

  // Sync value when initialValue changes externally
  useEffect(() => {
    if (!isEditing) {
      setValue(initialValue)
    }
  }, [initialValue, isEditing])

  const handleSave = () => {
    setIsEditing(false)
    onSave(value)
  }

  if (isEditing) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
        }}
        className={`bg-gray-600 p-2 rounded-md ${className}`}
        autoFocus
      />
    )
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`hover:outline-blue-500 hover:outline-dashed hover:outline-2 p-2 cursor-pointer ${className}`}
    >
      {value || 'Click to edit'}
    </div>
  )
}

