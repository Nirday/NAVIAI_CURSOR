"use client"

import React, { useState, useEffect } from 'react'
import { Contact } from '@/libs/contact-hub/src/types'
import { PlusIcon, PencilIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import ContactDetailView from './ContactDetailView'

interface ContactsDashboardProps {
  userId: string
  className?: string
  onContactClick?: (contact: Contact) => void
}

type SortField = 'name' | 'email' | 'created_at'
type SortOrder = 'asc' | 'desc'

export default function ContactsDashboard({
  userId,
  className = '',
  onContactClick
}: ContactsDashboardProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [allTags, setAllTags] = useState<string[]>([])

  useEffect(() => {
    fetchContacts()
    fetchTags()
  }, [userId, searchQuery, tagFilter, sortBy, sortOrder])

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (tagFilter) params.set('tag', tagFilter)
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortOrder)

      const res = await fetch(`/api/contacts?${params.toString()}`, {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const data = await res.json()
        setContacts(data.contacts || [])
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/contacts/tags', {
        headers: { 'x-user-id': userId }
      })
      if (res.ok) {
        const data = await res.json()
        setAllTags(data.tags || [])
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const handleSaveContact = async (contactData: any) => {
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contactData)
      })

      if (res.ok) {
        setShowAddModal(false)
        fetchContacts()
        fetchTags()
      } else {
        const error = await res.json()
        alert(`Failed to create contact: ${error.error}`)
      }
    } catch (error: any) {
      console.error('Error creating contact:', error)
      alert(`Failed to create contact: ${error.message}`)
    }
  }

  const handleSaveTags = async (contactId: string, tags: string[]) => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/tags`, {
        method: 'PATCH',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tags })
      })

      if (res.ok) {
        setShowTagModal(false)
        setSelectedContact(null)
        fetchContacts()
        fetchTags()
      } else {
        const error = await res.json()
        alert(`Failed to update tags: ${error.error}`)
      }
    } catch (error: any) {
      console.error('Error updating tags:', error)
      alert(`Failed to update tags: ${error.message}`)
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) return null
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  const getTagColor = (tag: string) => {
    // Billing status tags
    if (tag === 'active_customer') return 'bg-green-100 text-green-800'
    if (tag === 'trial_user') return 'bg-blue-100 text-blue-800'
    if (tag === 'canceled_customer') return 'bg-red-100 text-red-800'
    // Default
    return 'bg-gray-100 text-gray-800'
  }

  // If contact detail is selected, show detail view
  if (selectedContact) {
    return (
      <div className={`rounded-lg border bg-white ${className}`}>
        <ContactDetailView
          contactId={selectedContact.id}
          userId={userId}
          onBack={() => setSelectedContactId(null)}
        />
      </div>
    )
  }

  return (
    <div className={`rounded-lg border bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">Contacts</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4" />
          Add Contact
        </button>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 space-y-3">
        <div className="flex gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* Tag Filter */}
          <div className="w-64">
            <input
              type="text"
              placeholder="Filter by tag..."
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-6 text-center text-gray-500">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <p>No contacts found.</p>
          <p className="text-sm mt-2">Add your first contact to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Name {getSortIcon('name')}
                </th>
                <th
                  onClick={() => handleSort('email')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Email {getSortIcon('email')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th
                  onClick={() => handleSort('created_at')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Date Added {getSortIcon('created_at')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contacts.map((contact) => (
                <tr
                  key={contact.id}
                  onClick={() => {
                    if (onContactClick) {
                      onContactClick(contact)
                    } else {
                      setSelectedContactId(contact.id)
                    }
                  }}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {contact.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contact.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contact.phone || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-wrap gap-2">
                      {contact.tags.length > 0 ? (
                        contact.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTagColor(tag)}`}
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-xs">No tags</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(contact.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedContact(contact)
                        setShowTagModal(true)
                      }}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <PencilIcon className="h-4 w-4" />
                      Manage Tags
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <AddContactModal
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveContact}
          allTags={allTags}
        />
      )}

      {/* Manage Tags Modal */}
      {showTagModal && selectedContact && (
        <ManageTagsModal
          contact={selectedContact}
          allTags={allTags}
          onClose={() => {
            setShowTagModal(false)
            setSelectedContact(null)
          }}
          onSave={(tags) => handleSaveTags(selectedContact.id, tags)}
        />
      )}
    </div>
  )
}

// Add Contact Modal
function AddContactModal({
  onClose,
  onSave,
  allTags
}: {
  onClose: () => void
  onSave: (data: any) => void
  allTags: string[]
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      alert('Email is required')
      return
    }
    onSave({ firstName, lastName, email, phone, tags: selectedTags })
  }

  const addTag = (tag: string) => {
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Contact</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) addTag(e.target.value)
                  e.target.value = ''
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select existing tag...</option>
                {allTags.filter(t => !selectedTags.includes(t)).map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Or add new tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (newTag.trim()) {
                      addTag(newTag.trim())
                      setNewTag('')
                    }
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Add Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Manage Tags Modal
function ManageTagsModal({
  contact,
  allTags,
  onClose,
  onSave
}: {
  contact: Contact
  allTags: string[]
  onClose: () => void
  onSave: (tags: string[]) => void
}) {
  const [selectedTags, setSelectedTags] = useState<string[]>(contact.tags || [])
  const [newTag, setNewTag] = useState('')

  const addTag = (tag: string) => {
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Manage Tags for {contact.name}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2 min-h-[60px] p-2 border border-gray-200 rounded-md">
              {selectedTags.length > 0 ? (
                selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-gray-400 text-sm">No tags</span>
              )}
            </div>
            <div className="flex gap-2">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) addTag(e.target.value)
                  e.target.value = ''
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select existing tag...</option>
                {allTags.filter(t => !selectedTags.includes(t)).map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Or add new tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (newTag.trim()) {
                      addTag(newTag.trim())
                      setNewTag('')
                    }
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(selectedTags)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Save Tags
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

