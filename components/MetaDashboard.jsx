// components/MetaDashboard.jsx

import localforage from 'localforage'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import styles from '../styles/RoomPage.module.css'

const CACHE_KEY = (username) => `meta_${username}_rooms`


export default function MetaDashboard({ roomId, username }) {
  const router = useRouter()
  const [myRooms, setMyRooms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMyRooms()
  }, [])

  // NEU: Raum erstellen
  async function handleCreateRoom() {
    const name = prompt('Wie soll dein neuer Raum heißen?')
    if (!name) return

    setLoading(true)
    // 1) Neuen Raum in rooms anlegen
    const { data: newRoom, error: errRoom } = await supabase
      .from('rooms')
      .insert([{ name, is_meta: false }])
      .select('id')
      .single()
    if (errRoom) {
      console.error(errRoom)
      alert('Fehler beim Erstellen des Raums')
      setLoading(false)
      return
    }
    // 2) Dich als Teilnehmer hinzufügen
    const { error: errPart } = await supabase
      .from('participants')
      .insert([{ room_id: newRoom.id, name: username }])
    if (errPart) {
      console.error(errPart)
      alert('Fehler beim Hinzufügen als Teilnehmer')
      setLoading(false)
      return
    }
    // 3) Weiter zum neuen Raum
    router.push(`/room/${newRoom.id}`)
  }

  // NEU: Raum beitreten
  async function handleJoinRoom() {
    const joinId = prompt('Gib die Raum-ID ein, der du beitreten möchtest:')
    if (!joinId) return

    setLoading(true)
    // 1) Prüfen, ob Raum existiert
    const { data: room, error: errCheck } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', joinId)
      .single()
    if (errCheck || !room) {
      alert('Kein Raum mit dieser ID gefunden.')
      setLoading(false)
      return
    }
    // 2) Prüfen, ob du schon Teilnehmer bist
    const { data: existing } = await supabase
      .from('participants')
      .select('id')
      .eq('room_id', joinId)
      .eq('name', username)
    if (existing.length > 0) {
      alert('Du bist diesem Raum bereits beigetreten.')
      setLoading(false)
      router.push(`/room/${joinId}`)
      return
    }
    // 3) Beitreten
    const { error: errJoin } = await supabase
      .from('participants')
      .insert([{ room_id: joinId, name: username }])
    if (errJoin) {
      console.error(errJoin)
      alert('Fehler beim Beitreten')
      setLoading(false)
      return
    }
    // 4) Weiter zum Raum
    router.push(`/room/${joinId}`)
  }

  async function fetchMyRooms() {
  setLoading(true)

  // 1) Aus Cache laden
  const cached = await localforage.getItem(CACHE_KEY(username))
  if (cached) {
    setMyRooms(cached)
  }

  // 2) Nur online: von Supabase laden und Cache updaten
  if (navigator.onLine) {
    const { data, error } = await supabase
      .from('participants')
      .select('room_id, rooms(name)')
      .eq('name', username)

    if (!error) {
      const rooms = data.map(p => ({
        id: p.room_id,
        name: p.rooms?.name || p.room_id,
      }))
      setMyRooms(rooms)
      await localforage.setItem(CACHE_KEY(username), rooms)
    }
  }

  setLoading(false)
}


  return (
    <main className={styles.roomContainer}>
      <h1>Hallo {username}, willkommen auf der guten Seite der Schuldenteilung!</h1>

      {loading ? (
        <p className={styles.loading}>Lädt deine Räume…</p>
      ) : myRooms.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: '1rem 0' }}>
          {myRooms.map((r) => (
            <li key={r.id} style={{ marginBottom: '0.5rem' }}>
              <button
                className={styles.btnAdd}
                onClick={() => router.push(`/room/${r.id}`)}
              >
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>Du bist in noch keinen Räumen. Erstelle einen neuen oder trete einem bei.</p>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <button
          className={styles.btnAdd}
          onClick={handleCreateRoom}
          disabled={loading}
        >
          <span style={{ marginRight: '0.5rem' }}>+</span> Neuen Raum erstellen
        </button>
        <button
          className={styles.btnAdd}
          onClick={handleJoinRoom}
          disabled={loading}
        >
          <span style={{ marginRight: '0.5rem' }}>→</span> Raum beitreten
        </button>
      </div>
    </main>
  )
}
