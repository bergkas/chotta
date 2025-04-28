import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const router = useRouter();

  async function createRoom() {
    const id = uuidv4(); // Erstelle eine einzigartige ID für den Raum
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 Tage in die Zukunft

    const { data, error } = await supabase
      .from('rooms')
      .insert([{ id, expires_at: expiresAt.toISOString() }]); // Raum + Ablaufdatum in der DB anlegen

    if (error) {
      console.error('Fehler beim Erstellen des Raums:', error);
      alert('Fehler beim Erstellen des Raums');
      return;
    }

    router.push(`/room/${id}`); // Weiterleiten in den neuen Raum
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '20px' }}>Kohlekasse 🧮</h1>
      <button 
        onClick={createRoom} 
        style={{
          fontSize: '1.2rem',
          padding: '10px 20px',
          backgroundColor: '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        ➕ Neuen Raum erstellen
      </button>
    </div>
  );
}
