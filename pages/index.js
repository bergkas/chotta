// pages/index.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { FaPlus, FaMoneyBillWave, FaTimes, FaCheck} from 'react-icons/fa';
import { FaMoneyBillTransfer } from 'react-icons/fa6';
import styles from '../styles/HomePage.module.css';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();

  // Modal-States
  const [showModal, setShowModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Handler zum Erstellen
  async function handleCreateRoom() {
    if (!groupName.trim() || !participantName.trim()) {
      setErrorMessage('Bitte Raumname und deinen Namen eingeben.');
      return;
    }

    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Raum anlegen
    const { error: roomError } = await supabase
      .from('rooms')
      .insert([{ id, name: groupName, expires_at: expiresAt.toISOString() }]);
    if (roomError) {
      setErrorMessage('Fehler beim Erstellen des Raums.');
      return;
    }

    // Teilnehmer anlegen
    const { error: partError } = await supabase
      .from('participants')
      .insert([{ room_id: id, name: participantName }]);
    if (partError) {
      setErrorMessage('Fehler beim Hinzufügen der Person.');
      return;
    }

    // Erfolgreich → weiterleiten
    router.push(`/room/${id}`);
  }

  return (
   <div className={styles.wrapper}>
      <div className={styles.pageContainer}>     
<div className={styles.logo}>
  <Image
    src="/chotty_logo_full.svg"
    alt="Chotty Logo"
    width={256}
    height={128}
  />

</div>
      <p className={styles.subtitle}>
        Ausgaben verwalten & teilen.<br />
        Automatische Währungsumrechnung.<br/>
        Optimierte Rückzahlungen über den kürzesten Weg.
      </p>

      <button
        className={styles.createButton}
        onClick={() => {
          setErrorMessage('');
          setShowModal(true);
        }}
      >
        <FaPlus /> Neuen Raum erstellen
      </button>
      
      <div className={styles.infoBox}>
		<b>Merke dir</b> nach Erstellen des Raumes <b>unbedingt die URL</b> - damit können du und deine Freunde auf den Raum zugreifen.
      </div>

	<div className={styles.textBox}>
  	<p>
    <FaCheck className={styles.checkIcon} /> Kostenlos & ohne Anmeldung
  	</p>
  	<p>
  	<FaCheck className={styles.checkIcon} /> Währungen umrechnen
	</p>
  	<p>
  	<FaCheck className={styles.checkIcon} /> Beliebig verlängerbar
	</p>
	</div>


      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Raum erstellen</h3>
              <button
                className={styles.btnClose}
                onClick={() => setShowModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              {errorMessage && (
                <div className={styles.errorBox}>{errorMessage}</div>
              )}
              <input
                className={styles.modalInput}
                type="text"
                placeholder="Raumname (max. 30 Zeichen)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={30}
              />
              <input
                className={styles.modalInput}
                type="text"
                placeholder="Dein Name (max. 14 Zeichen)"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                maxLength={14}
              />
              <button
                className={styles.btnAdd}
                onClick={handleCreateRoom}
              >
                <FaPlus /> Raum erstellen
              </button>
            </div>
          </div>
        </div>
      )}
          <div className={styles.footerLogo}>
  <Image
    src="/logozf.svg"
    alt="Zebrafrog Logo"
    width={32}
    height={32}
  />
  <span className={styles.footerText}>2025 Zebrafrog</span>
</div>
    </div>
    

</div>


  );
}
