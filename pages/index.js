// pages/index.js
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import styles from '../styles/StartPages.module.css'
import { FaCheckCircle } from 'react-icons/fa'

export default function Home() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const getMetaId = () =>
    typeof window !== 'undefined' ? localStorage.getItem('metaRoomId') : null

  // 1) make createAndSetupMeta stable
  const createAndSetupMeta = useCallback(async () => {
    setBusy(true)
    const { data: room, error } = await supabase
      .from('rooms')
      .insert([{}])
      .select('id')
      .single()
    setBusy(false)

    if (error || !room) {
      console.error(error)
      alert('Fehler bei der Einrichtung.')
      return
    }

    localStorage.setItem('metaRoomId', room.id)
    router.replace(`/setup/${room.id}`)
  }, [router])

  // 2) reuse it for the button handler
  const handleStart = createAndSetupMeta

  // 3) include it in the deps of your effect
  useEffect(() => {
    if (typeof window === 'undefined') return
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    const metaId = getMetaId()

    if (isStandalone) {
      if (metaId) {
        router.replace(`/meta/${metaId}`)
      } else {
        createAndSetupMeta()
      }
    }
  }, [createAndSetupMeta])

  const benefits = [
    'Super simpel: Sofort nutzbar ohne Anmeldung',
    'Komplett kostenlos',
    'Beliebig viele Räume & Teilnehmer',
    'Mehrere Währungen mit automatischer Umrechnung',
    'Formel-Editor für faire Aufteilungen (z. B. bei Essensrechnungen)'
  ]

  return (
    <div className={styles.theme}>
      {/* Logo Header */}
      <div className={styles.headerWrapper}>
        <img
          src="/chotty_logo_centered_white.svg"
          alt="Chotty Logo"
          className={styles.logo}
        />
      </div>

      <main className={styles.hero}>
        <div className={styles.introCard}>
          <h1 className={styles.heroTitle}>Willkommen bei Chotta 👋</h1>
          <span className={styles.heroSubtitle}>
            The new kid in the Schulden-Splitter-Block
          </span>
          <p className={styles.heroSection}>
            Deine clevere Lösung zum Schuldenverwalten mit Freund:innen – ganz ohne Konto, ohne E-Mail, ohne Stress.
          </p>
          
          <div className={styles.screenshotPlaceholder}>
            [Platzhalter für Screenshot]
          </div>

          <p className={styles.heroText}>
            Chotta ist die einfachste Art, Ausgaben zu teilen und Schulden transparent zu verwalten – ideal für WGs, Reisen, Gruppen oder Alltag.
            Keine Registrierung. Keine Werbung. Einfach direkt loslegen.
          </p>

          <ul className={styles.benefitsList}>
            {benefits.map((text, i) => (
              <li key={i} className={styles.benefitItem}>
                <FaCheckCircle className={styles.benefitIcon} />
                <span className={styles.benefitText}>{text}</span>
              </li>
            ))}
          </ul>

          <div className={styles.screenshotPlaceholder}>
            [Platzhalter für Screenshot]
          </div>

          <button
            onClick={handleStart}
            disabled={busy}
            className={styles.ctaButton}
          >
            {busy ? 'Bitte warten…' : 'Chotta jetzt starten'}
          </button>
        </div>
      </main>
    </div>
  )
}
