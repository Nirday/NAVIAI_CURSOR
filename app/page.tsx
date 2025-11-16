import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect the user from the root URL (/) to the /dashboard page
  redirect('/dashboard')

  // This part is optional, but good practice
  return null
}

