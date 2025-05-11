// pages/meta/[id].js
import { useRouter } from 'next/router'
import MetaDashboard from '../../components/MetaDashboard'
import PageLayout from '../../components/PageLayout'

export default function MetaPage() {
  const router = useRouter()
  const { id } = router.query

  // Falls noch keine ID da ist, nichts rendern
  if (!id) return null

  return (
    <PageLayout showBack={false} title="Meta Dashboard">
      <MetaDashboard roomId={id} />
    </PageLayout>
  )
}
