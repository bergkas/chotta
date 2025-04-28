// pages/index.js
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { FaPlus } from 'react-icons/fa';
import styles from '../styles/HomePage.module.css';

export default function Home() {
  const router = useRouter();

  async function createRoom() {
    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from('rooms')
      .insert([{ id, expires_at: expiresAt.toISOString() }]);

    if (error) {
      console.error('Fehler beim Erstellen des Raums:', error);
      alert('Fehler beim Erstellen des Raums');
      return;
    }

    router.push(`/room/${id}`);
  }

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.title}>SchotterShare</h1>
      <p className={styles.subtitle}>
        Die einfachste Art, Gruppenausgaben zu verwalten.<br/>
        Ideal für Urlaub, WGs oder Events.
      </p>

      <button onClick={createRoom} className={styles.createButton}>
        <FaPlus /> Neuen Raum erstellen
      </button>
      <div className={styles.infoBox}>Merke dir, nachdem du einen Raum erstellt hast, unbedingt die URL - über sie können du und deine Freunde auf den Raum zugreifen </div>

      <div className={styles.infoBox}>
      	➔ Ohne Registrierung und Anmeldung<br/>
        ➔ Räume sind 14 Tagen verfügbar.<br/>
        ➔ Verlängerung jederzeit möglich.
      </div>
    </div>
  );
}
