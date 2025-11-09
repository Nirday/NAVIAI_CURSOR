import UserDetailView from '../../components/UserDetailView'

interface PageProps {
  params: { userId: string }
}

/**
 * User Detail Page
 */
export default function UserDetailPage({ params }: PageProps) {
  return <UserDetailView userId={params.userId} />
}

