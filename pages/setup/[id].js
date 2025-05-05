// pages/setup/[id].js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

export default function Setup() {
  const router = useRouter()
  const { id } = router.query

  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)

  // Falls id mal nicht in der URL ist, holen wir sie aus dem localStorage
  useEffect(() => {
    if (!id && typeof window !== 'undefined') {
      const stored = localStorage.getItem('metaRoomId')
      if (stored) {
        router.replace(`/setup/${stored}`)
      }
    }
  }, [id, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim()) {
      return alert('Bitte gib einen Nutzernamen ein')
    }
    setSaving(true)
    // Meta-Raum updaten: meta_username setzen und gleich auch den sichtbaren Raumnamen
    const { error } = await supabase
      .from('rooms')
      .update({ meta_username: username.trim(), name: username.trim() })
      .eq('id', id)
    setSaving(false)
    if (error) {
      console.error(error)
      alert('Fehler beim Speichern des Namens. Bitte versuche es erneut.')
    } else {
      // Weiterleitung zum Meta-Raum (wird dort begrüßt und kann Räume verwalten)
      router.push(`/${id}`)
    }
  }

  return (
    <main style={{
      padding: '2rem',
      maxWidth: '400px',
      margin: '0 auto',
      textAlign: 'center'
    }}>
      <h1>Fast geschafft!</h1>
      <p>Wähle bitte einen Nutzernamen, unter dem du in Chotta auftreten möchtest:</p>
      <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Dein Nutzername"
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1rem',
            marginBottom: '1rem'
          }}
          required
        />
        <button
          type="submit"
          disabled={saving}
          style={{
            width: '100%',
            padding: '0.75rem',
            fontSize: '1.1rem'
          }}
        >
          {saving ? 'Speichere…' : 'Nutzernamen speichern'}
        </button>
      </form>
    </main>
  )
}
