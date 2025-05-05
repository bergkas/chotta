// pages/install.js
import Head from 'next/head'
import { useEffect, useState } from 'react'
import styles from '../styles/StartPages.module.css'
import { FaShareSquare, FaEllipsisV, FaPlusSquare, FaCheckCircle } from 'react-icons/fa'

export default function Install() {
  const [metaId, setMetaId] = useState(null)
  const [canInstall, setCanInstall] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    const meta = localStorage.getItem('metaRoomId')
    setMetaId(meta)

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const installApp = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setCanInstall(false)
    }
  }

  return (
    <div className={styles.theme}>
      <Head>
        {metaId && <link rel="manifest" href={`/api/manifest/${metaId}`} />}
        <meta name="theme-color" content="#3367D6" />
        <title>Chotta installieren</title>
      </Head>

      <div className={styles.headerWrapper}>
        <img
          src="/chotty_logo_centered_white.svg"
          alt="Chotty Logo"
          className={styles.logo}
        />
      </div>

      <main className={styles.hero}>
        <div className={styles.introCard}>
          <h1 className={styles.heroTitle}>Last step: Chotta als App laden</h1>


          <p className={styles.heroText}>
            Die meisten Browser unterstützen die Installation über das Teilen-Menü oder das Drei-Punkte-Menü in der Ecke.
          </p>


<div className={styles.installGuideContainer}>

      
      {/* iOS-Anleitung */}
      <div className={styles.platformGuide}>
        <div className={styles.platformHeader}>
          <div className={styles.platformBadge}>iOS (Safari)</div>
        </div>
        
        <ol className={styles.installSteps}>
          <li className={styles.stepItem}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepContent}>
              <FaShareSquare className={styles.stepIcon} />
              <span className={styles.stepText}>Tippe auf das Teilen-Symbol unten in der Mitte</span>
            </div>
          </li>
          <li className={styles.stepItem}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepContent}>
              <FaPlusSquare className={styles.stepIcon} />
              <span className={styles.stepText}>Scrolle nach unten und wähle Zum Home-Bildschirm</span>
            </div>
          </li>
          <li className={styles.stepItem}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepContent}>
              <FaCheckCircle className={styles.stepIcon} />
              <span className={styles.stepText}>Tippe auf Hinzufügen rechts oben ✨</span>
            </div>
          </li>
        </ol>
      </div>
      
      {/* Android-Anleitung */}
      <div className={styles.platformGuide}>
        <div className={styles.platformHeader}>
          <div className={styles.platformBadge}>Android (Chrome)</div>
        </div>
        
        <ol className={styles.installSteps}>
          <li className={styles.stepItem}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepContent}>
              <FaEllipsisV className={styles.stepIcon} />
              <span className={styles.stepText}>Tippe auf die drei Punkte (Menü) oben rechts</span>
            </div>
          </li>
          <li className={styles.stepItem}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepContent}>
              <FaPlusSquare className={styles.stepIcon} />
              <span className={styles.stepText}>Wähle Zum Startbildschirm hinzufügen</span>
            </div>
          </li>
          <li className={styles.stepItem}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepContent}>
              <FaCheckCircle className={styles.stepIcon} />
              <span className={styles.stepText}>Tippe auf Installieren ✨</span>
            </div>
          </li>
        </ol>
      </div>
    </div>

          {canInstall && (
            <button className={styles.ctaButton} onClick={installApp}>
              Jetzt direkt installieren
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
