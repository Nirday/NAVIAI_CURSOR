'use client'

import { useRouter } from 'next/navigation'
import ThemeSelection from '../components/ThemeSelection'

export default function ThemeSelectionPage() {
  const router = useRouter()

  const handleThemeSelect = (themeId: string) => {
    console.log('Theme selected:', themeId)
    // You can store this in state, localStorage, or send to API
  }

  const handleContinue = (themeId: string) => {
    console.log('Continuing with theme:', themeId)
    // Navigate to next step or save theme selection
    // Example: router.push(`/dashboard/website?theme=${themeId}`)
    router.push('/dashboard/website')
  }

  return (
    <ThemeSelection
      onSelect={handleThemeSelect}
      onContinue={handleContinue}
    />
  )
}

