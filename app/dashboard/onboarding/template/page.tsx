import React from 'react'
import { redirect } from 'next/navigation'

// --- Mock Data for the Templates ---
const templates = [
  {
    id: 'modern',
    title: 'Modern',
    description: 'A sleek, professional design for service-based businesses.',
    imageUrl: '/images/template-modern.png', // You will need to add placeholder images here
    pros: ['Clean and easy to navigate', 'Loads very fast on mobile', 'Focuses on "Call to Action" buttons'],
    cons: ['Less space for large images', 'Minimalist style might be too simple for some'],
  },
  {
    id: 'classic',
    title: 'Classic',
    description: 'A traditional, elegant design perfect for bakeries, cafes, or artisans.',
    imageUrl: '/images/template-classic.png', // This is the "Bella's Bakery" style
    pros: ['Warm and inviting feel', 'Great for showing off product photos', 'Timeless look'],
    cons: ['Heavier on images, can load slower', 'Less "corporate" feel'],
  },
  {
    id: 'bold',
    title: 'Bold',
    description: 'A high-impact, visual-first design for brands that want to stand out.',
    imageUrl: '/images/template-bold.png',
    pros: ['Big, beautiful hero image', 'Makes a strong first impression', 'Great for portfolios'],
    cons: ['Relies heavily on you having high-quality photos', 'May distract from text content'],
  },
]

// --- Server Action to Handle Selection ---
// This function will run when a user clicks "Select"
async function selectTemplate(formData: FormData) {
  'use server'
  const templateId = formData.get('templateId') as string
  console.log('User selected template:', templateId)
  // TODO: Add logic here to save the user's choice (e.g., in Supabase)

  // After "saving," redirect to the website editor
  redirect('/dashboard/website')
}

// --- The Page Component ---
export default function TemplateSelectorPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Website's Starting Point</h1>
        <p className="text-lg text-gray-600">
          Select a template that best fits your business. You can customize everything later.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col border border-gray-200">
            {/* Template Preview Image */}
            <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-b border-gray-200">
              <div className="text-center">
                <div className="text-4xl mb-2">{template.id === 'modern' ? '🌐' : template.id === 'classic' ? '🏛️' : '🎨'}</div>
                <span className="text-gray-500 text-sm font-medium">{template.title} Template</span>
              </div>
            </div>

            <div className="p-6 flex-grow">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">{template.title}</h2>
              <p className="text-gray-600 mb-4">{template.description}</p>

              <h3 className="font-semibold text-gray-900 mb-2">Pros:</h3>
              <ul className="list-disc list-inside mb-4 text-sm text-gray-700 space-y-1">
                {template.pros.map((pro, i) => (
                  <li key={i} className="text-green-700">{pro}</li>
                ))}
              </ul>

              <h3 className="font-semibold text-gray-900 mb-2">Cons:</h3>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {template.cons.map((con, i) => (
                  <li key={i} className="text-red-700">{con}</li>
                ))}
              </ul>
            </div>

            <form action={selectTemplate} className="p-6 bg-gray-50 border-t border-gray-200">
              <input type="hidden" name="templateId" value={template.id} />
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                Select {template.title}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}

