// pages/index.js
import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function Home() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

 async function handleStart() {
  setCreating(true)
 // Meta-Raum anlegen und nur das Feld "id" zurückholen
 const { data, error } = await supabase
   .from('rooms')
   .insert([{ is_meta: true }])
   .select('id')       // holt nur die id-Spalte
   .single()           // unwrappt das Array

  setCreating(false)


 if (error || !data) {
    console.error(error)
    alert('Fehler bei der Einrichtung. Bitte versuche es erneut.')
  } else {
    localStorage.setItem('metaRoomId', data.id)
    router.push(`/setup/${data.id}`)
  }
}
  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Willkommen bei Chotta</h1>
      <p>
        Das einfachste Schuldenmanagement – komplett ohne Anmeldung.  
        Lege deine persönliche App an und teile Schulden mit Freunden.
      </p>
      <button
        onClick={handleStart}
        disabled={creating}
        style={{ fontSize: '1.2rem', padding: '0.8rem 1.5rem', marginTop: '2rem' }}
      >
        {creating ? 'Einrichtung läuft…' : 'Chotta verwenden'}
      </button>
    </main>
  )
}
