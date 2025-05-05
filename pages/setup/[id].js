// pages/setup/[id].js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'
import styles from '../../styles/StartPages.module.css'

export default function Setup() {
  const router = useRouter()
  const { id } = router.query
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)

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
    const name = username.trim()
    if (!name) {
      alert('Bitte gib einen Nutzernamen ein')
      return
    }

    setSaving(true)
    const { error } = await supabase.from('meta_rooms').insert([{ id, username: name }])
    setSaving(false)

    if (error) {
      console.error('Fehler beim Anlegen des Meta-Raums:', error)
      alert('Fehler beim Speichern des Namens. Bitte versuche es erneut.')
    } else {
      router.push(`/install?metaId=${id}`)
    }
  }

  return (
    <div className={styles.theme}>
      <Head>
        <title>Chotta Setup</title>
        <meta name="theme-color" content="#3367D6" />
      </Head>

      {/* Header */}
      <div className={styles.headerWrapper}>
        <img
          src="/chotty_logo_centered_white.svg"
          alt="Chotty Logo"
          className={styles.logo}
        />
      </div>

      <main className={styles.hero}>
        <div style={{
          backgroundColor: '#111827',
          padding: '2rem',
          borderRadius: '12px',
          maxWidth: '480px',
          margin: '0 auto',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          <h1 className={styles.heroTitle}>Wie dürfen wir dich nennen?</h1>
          <p className={styles.heroSubtitle}>
            Wähle einen Namen, mit dem dich deine Mitmenschen in Chotta sehen.
          </p>

          <form onSubmit={handleSubmit} className={styles.formWrapper}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Dein Name oder Spitzname"
              required
              className={styles.inputField}
            />

            <button type="submit" disabled={saving} className={styles.ctaButton}>
              {saving ? 'Speichere…' : 'Loslegen'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
