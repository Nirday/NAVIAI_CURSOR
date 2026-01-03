'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { HeroBlock } from './components/HeroBlock'
import { FeatureBlock } from './components/FeatureBlock'

// Check mock mode at module level
const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true' ||
                   !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                   !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Define the types for our blocks
type Block = 
  | { id: string; type: 'hero'; props: { headline: string; subheadline: string } }
  | { id: string; type: 'features'; props: { title: string; features: { name: string; description: string }[] } }

// The main Page Component
export default function WebsiteEditorPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // --- STATE ---
  // The blocks state now starts empty
  const [blocks, setBlocks] = useState<Block[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  // --- DATA FETCHING ---
  useEffect(() => {
    // Fetch the AI-generated content when userId is available
    if (!userId) return

    async function fetchContent() {
      try {
        const response = await fetch('/api/website/generate-content')
        if (!response.ok) {
          throw new Error('Failed to fetch content')
        }
        const data = await response.json()
        setBlocks(data)
      } catch (error) {
        console.error(error)
        // TODO: Add proper error handling (e.g., load default blocks)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContent()
  }, [userId]) // Run when userId is available

  const checkAuth = async () => {
    // In mock mode, skip auth entirely
    if (isMockMode) {
      setUserId('mock-user-123')
      setLoading(false)
      return
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      
      if (!session?.user?.id) {
        router.push('/login')
        return
      }

      setUserId(session.user.id)
      setLoading(false)
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/login')
      setLoading(false)
    }
  }

  // --- FUNCTIONS ---
  const moveBlockUp = (index: number) => {
    if (index === 0) return
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks]
      const [movedBlock] = newBlocks.splice(index, 1)
      newBlocks.splice(index - 1, 0, movedBlock)
      return newBlocks
    })
  }

  const moveBlockDown = (index: number) => {
    if (index === blocks.length - 1) return
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks]
      const [movedBlock] = newBlocks.splice(index, 1)
      newBlocks.splice(index + 1, 0, movedBlock)
      return newBlocks
    })
  }

  const deleteBlock = (index: number) => {
    setBlocks(prevBlocks => prevBlocks.filter((_, i) => i !== index))
  }

  const updateBlockProps = (index: number, newProps: any) => {
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks]
      const oldBlock = newBlocks[index]

      // Merge old props with new props
      newBlocks[index] = {
        ...oldBlock,
        props: {
          ...oldBlock.props,
          ...newProps,
        },
      }
      return newBlocks
    })
  }

  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">
            {loading ? 'Loading...' : 'Generating your personalized website...'}
          </p>
        </div>
      </div>
    )
  }

  if (!userId) {
    return null // Will redirect
  }

  // --- RENDER ---
  return (
    <div className="w-full">
      <div className="bg-gray-900 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Website Editor</h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
          Save & Publish
        </button>
      </div>

      <div className="p-8 space-y-4">
        {blocks.map((block, index) => (
          <div key={block.id} className="relative group border-2 border-transparent hover:border-blue-500 rounded-lg">

            {/* This renders the correct block component */}
            {block.type === 'hero' && (
              <HeroBlock
                {...block.props}
                onUpdate={(newProps) => updateBlockProps(index, newProps)}
              />
            )}
            {block.type === 'features' && <FeatureBlock {...block.props} />}

            {/* --- These are the "Up/Down/Delete" controls --- */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
              <button 
                onClick={() => moveBlockUp(index)} 
                className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={index === 0}
              >
                Up
              </button>
              <button 
                onClick={() => moveBlockDown(index)} 
                className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={index === blocks.length - 1}
              >
                Down
              </button>
              <button 
                onClick={() => deleteBlock(index)} 
                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
