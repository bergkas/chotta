// pages/join/[id].js
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function JoinRoom() {
  const router = useRouter()
  const { id } = router.query

  useEffect(() => {
    if (!id) return

    const metaId = localStorage.getItem('metaRoomId')

    // Noch kein Benutzer? → Raum-ID merken und weiterleiten zum Setup/Install
    if (!metaId) {
      localStorage.setItem('pendingJoinRoom', id)
      router.replace('/setup')
      return
    }

    // Nutzer vorhanden? → direkt beitreten
    const join = async () => {
      try {
        const res = await fetch('/api/join-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ joinId: id, metaId }),
        })

        const result = await res.json()
        if (res.ok && result.success) {
          router.replace(`/room/${id}`)
        } else {
          alert(result.message || 'Beitritt fehlgeschlagen.')
          router.replace(`/meta/${metaId}`)
        }
      } catch (err) {
        console.error(err)
        router.replace(`/meta/${metaId}`)
      }
    }

    join()
  }, [id, router])

  return <p style={{ padding: '2rem', textAlign: 'center' }}>Tritt dem Raum bei…</p>
}
