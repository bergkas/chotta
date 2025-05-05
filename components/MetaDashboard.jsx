import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import localforage from 'localforage'
import { supabase } from '../lib/supabase'
import { FaMoon, FaSun,  FaPlusSquare, FaSignInAlt, FaLongArrowAltRight } from 'react-icons/fa'
import styles from '../styles/RoomPage.module.css'

function getGreeting() {
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay()

  const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)]

  if (hour < 5) return randomChoice(['Gute Nacht', 'Hallo Nachtschwärmer', 'Na du Nachteule'])
  if (hour < 10) return randomChoice(['Guten Morgen', 'Moin', 'Frischen Morgen'])
  if (hour < 14) return randomChoice(['Servus', 'Grüß dich', 'Hallo'])
  if (hour < 18) return randomChoice(['Mahlzeit', 'Guten Tag', 'Hallöchen'])
  if (hour < 22) return randomChoice(['Guten Abend', 'Nabend', 'Schönen Abend'])
  if (day === 0 || day === 6) return 'Schönes Wochenende'
  return randomChoice(['Guten Tag', 'Hallo', 'Willkommen zurück'])
}

export default function MetaDashboard({ roomId }) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [myRooms, setMyRooms] = useState([])
  const [roomDetails, setRoomDetails] = useState({})
  const [loading, setLoading] = useState(true)

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('darkMode') !== 'false'
  })

  useEffect(() => {
    document.body.classList.add('theme')
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark')
      window.localStorage.setItem('darkMode', 'true')
    } else {
      document.body.classList.remove('dark')
      window.localStorage.setItem('darkMode', 'false')
    }
  }, [darkMode])

  useEffect(() => {
    if (!roomId) return
    ;(async () => {
      const { data: userData } = await supabase
        .from('meta_rooms')
        .select('username')
        .eq('id', roomId)
        .single()
      if (userData) setUsername(userData.username)

      const { data: roomData } = await supabase
        .from('participants')
        .select('room_id, rooms(name)')
        .eq('user_id', roomId)

      const rooms = roomData.map((r) => ({
        id: r.room_id,
        name: r.rooms?.name || r.room_id,
      }))
      setMyRooms(rooms)

      const allDetails = {}
      await Promise.all(
        rooms.map(async (room) => {
          const [participants, expenses] = await Promise.all([
            fetchParticipants(room.id),
            fetchExpenses(room.id),
          ])
          allDetails[room.id] = { participants, expenses }
        })
      )
      setRoomDetails(allDetails)
      setLoading(false)
    })()
  }, [roomId])

  async function fetchParticipants(id) {
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('room_id', id)
    return data || []
  }

  async function fetchExpenses(id) {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('room_id', id)
    return data || []
  }

  function getTotal(roomId) {
    const exps = roomDetails[roomId]?.expenses || []
    return exps.reduce((sum, e) => sum + (e.amount || 0), 0).toFixed(2)
  }

  async function handleCreateRoom() {
    const name = prompt('Wie soll dein neuer Raum heißen?')
    if (!name) return

    const { data: newRoom, error } = await supabase
      .from('rooms')
      .insert([{ name }])
      .select('id')
      .single()
    if (error) {
      alert('Fehler beim Erstellen')
      return
    }

    await supabase.from('participants').insert([
      { room_id: newRoom.id, user_id: roomId, name: username },
    ])
    router.push(`/room/${newRoom.id}`)
  }

  async function handleJoinRoom() {
    const joinId = prompt('Raum-ID zum Beitreten:')
    if (!joinId) return

    const { data: room, error } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', joinId)
      .single()
    if (error || !room) {
      alert('Raum nicht gefunden')
      return
    }

    const { data: existing } = await supabase
      .from('participants')
      .select('id')
      .eq('room_id', joinId)
      .eq('user_id', roomId)

    if (existing.length > 0) {
      router.push(`/room/${joinId}`)
      return
    }

    await supabase.from('participants').insert([
      { room_id: joinId, user_id: roomId, name: username },
    ])
    router.push(`/room/${joinId}`)
  }

  if (loading) {
    return <p className={styles.loading}>Lade Daten…</p>
  }

  return (
  <div className={`${styles.theme} ${darkMode ? styles.dark : ''}`}>
  
    {/* HEADER unabhängig von .roomContainer */}
  <div
    style={{
      position: 'sticky',
	  top: 0,
	  zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      background: 'linear-gradient(135deg, #4f46e5, #3227B0)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      marginBottom: '0rem',
      animation: 'fadeInDown 0.6s ease'
    }}
  >
    <img
      src="/chotty_logo_centered_white.svg"
      alt="Chotty Logo"
      style={{
        height: '32px',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
      }}
    />
    <button className={styles.btnDarkMode} onClick={() => setDarkMode((d) => !d)}>
      {darkMode ? <FaSun /> : <FaMoon />} {darkMode ? 'Light' : 'Dark'}
    </button>
  </div>
  
    <main className={styles.roomContainer}>
      
      


      {/* Begrüßung */}
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '1.75rem',
            fontWeight: 500,
            color: 'var(--text)',
            lineHeight: 1.2
          }}
        >
          {getGreeting()},
        </h1>
        <h2
          style={{
            margin: 0,
            fontSize: '2.25rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #4f46e5, #3227B0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          {username}
        </h2>
      </div>

      {/* Raumliste */}
      {myRooms.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600 }}>
            Deine Räume
          </h3>
          {myRooms.map((room) => {
            const details = roomDetails[room.id]
            if (!details) return null
            return (
              <div
                key={room.id}
                className={styles.roomCard}
                style={{ cursor: 'pointer' }}
                onClick={() => router.push(`/room/${room.id}`)}
              >
                <div className={styles.titleRow}>
                  <h1 className={styles.roomTitle}>{room.name}</h1>
                </div>

                <div className={styles.participantChips}>
                  {details.participants.map((p) => (
                    <span key={p.id} className={styles.chip}>
                      {p.name}
                    </span>
                  ))}
                </div>

                <div className={styles.summaryRow}>
                  <span className={styles.totalExpenses}>
                    Ausgaben: <strong>{getTotal(room.id)} €</strong>
                  </span>
				  <span
  						style={{
  						fontSize: '0.9em',
    					display: 'inline-flex',
   						alignItems: 'center',
    					gap: '0.2rem'
  						}}
					>
  						zum Raum <FaLongArrowAltRight style={{ verticalAlign: 'middle', fontSize: '1rem' }} />
				  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p>Du bist in noch keinen Räumen. Erstelle einen neuen oder tritt einem bei!</p>
      )}

      {/* Aktionen */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1em', marginTop: '2.5rem' }}>
        <button className={styles.btnAdd} onClick={handleCreateRoom}>
          <FaPlusSquare /> Raum erstellen
        </button>
        <button className={styles.btnAdd} onClick={handleJoinRoom}>
          <FaSignInAlt /> Raum beitreten
        </button>
      </div>
    </main>
  </div>
)
}
