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
      
      {/* Meta Dashboard ID */}
      <div className="max-w-4xl mx-auto mt-8 p-4 sm:p-6">
        <div className="bg-gradient-to-br from-gray-700/90 via-gray-600/90 to-gray-800/90 rounded-xl p-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
          </div>
          <div className="relative">
            <p className="text-white mb-2 text-center text-xs">
              <strong>Deine Meta Dashboard ID:</strong><br></br> {id}
            </p>
            <p className="text-white/80 text-xs text-center">
              Speichere diese ID, um dein Konto wiederherzustellen, falls du den Zugriff verlierst.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
