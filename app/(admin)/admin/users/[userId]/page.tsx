import UserDetailView from '../../components/UserDetailView'

interface PageProps {
  params: Promise<{ userId: string }>
}

/**
 * User Detail Page
 */
export default async function UserDetailPage({ params }: PageProps) {
  const { userId } = await params
  return <UserDetailView userId={userId} />
}

