// pages/room/[id].js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  FaTrashAlt,
  FaPlus,
  FaTimes,
  FaEdit,
  FaArrowRight,
  FaReceipt,
  FaMoneyBillWave
} from 'react-icons/fa';
import styles from '../../styles/RoomPage.module.css';

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button className={styles.btnClose} onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

export default function Room() {
  const router = useRouter();
  const { id } = router.query;

  // --- States ---
  const [participants, setParticipants] = useState([]);
  const [expenses, setExpenses]           = useState([]);
  const [transfers, setTransfers]         = useState([]);
  const [roomName, setRoomName]           = useState('');
  const [expiresAt, setExpiresAt]         = useState(null);
  const [expired, setExpired]             = useState(false);

  const [newName, setNewName]             = useState('');
  const [newExpenseTitle, setNewExpenseTitle] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [payerId, setPayerId]             = useState('');
  const [distributionType, setDistributionType] = useState('EQUAL_ALL');
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [percentages, setPercentages]     = useState({});
  const [amounts, setAmounts]             = useState({});

  // modal flags
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal]         = useState(false);
  const [showConfirmModal, setShowConfirmModal]         = useState(false);
  const [showPromptModal, setShowPromptModal]           = useState(false);
  const [showInfoModal, setShowInfoModal]               = useState(false);
  const [showDeleteModal, setShowDeleteModal]           = useState(false);
  const [showRenameModal, setShowRenameModal]           = useState(false);

  // payload for confirm/prompt/info
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction]   = useState(() => {});
  const [promptMessage, setPromptMessage]   = useState('');
  const [promptValue, setPromptValue]       = useState('');
  const [promptAction, setPromptAction]     = useState(() => {});
  const [infoMessage, setInfoMessage]       = useState('');

  // for delete/rename flows
  const [currentPart, setCurrentPart]       = useState(null);
  const [renameValue, setRenameValue]       = useState('');

  // --- Fetches ---
  useEffect(() => {
    if (!id) return;
    fetchParticipants();
    fetchExpenses();
    fetchTransfers();
    fetchRoomName();
  }, [id]);

  async function fetchParticipants() {
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('room_id', id);
    if (data) setParticipants(data);
  }
  async function fetchExpenses() {
    const { data } = await supabase
      .from('expenses')
      .select('*, expense_shares(*)')
      .eq('room_id', id);
    if (data) setExpenses(data);
  }
  async function fetchTransfers() {
    const { data } = await supabase
      .from('transfers')
      .select('*')
      .eq('room_id', id);
    if (data) setTransfers(data);
  }
async function fetchRoomName() {
  const { data } = await supabase
    .from('rooms')
    .select('name, expires_at, expired')
    .eq('id', id)
    .single();
  if (data) {
    setRoomName(data.name);
    setExpiresAt(new Date(data.expires_at));
    setExpired(data.expired);
  }
}


  // --- Helpers ---
  const formatAmount = (a) => parseFloat(a).toFixed(2);
  const formatDate   = (dt) =>
    new Date(dt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  const findName     = (pid) =>
    participants.find((p) => p.id === pid)?.name || '–';

  // --- Dialog Starters ---
  const openConfirm = (msg, action) => {
    setConfirmMessage(msg);
    setConfirmAction(() => action);
    setShowConfirmModal(true);
  };
  const openPrompt = (msg, def, action) => {
    setPromptMessage(msg);
    setPromptValue(def);
    setPromptAction(() => action);
    setShowPromptModal(true);
  };
  const openInfo = (msg) => {
    setInfoMessage(msg);
    setShowInfoModal(true);
  };

  // --- Dialog Handlers ---
  const handleConfirm = () => {
    confirmAction();
    setShowConfirmModal(false);
  };
  const handlePrompt = () => {
    promptAction(promptValue);
    setShowPromptModal(false);
  };

  // --- Actions: Participant ---
  async function addParticipant() {
    if (!newName.trim()) return;
    if (newName.length > 14) {
      openInfo('Namen können max. 14 Zeichen lang sein.');
      return;
    }
    await supabase.from('participants').insert([{ room_id: id, name: newName }]);
    setNewName('');
    fetchParticipants();
    setShowParticipantModal(false);
  }

  const handleDeleteClick = (p) => {
    const hasPaid     = expenses.some((e) => e.paid_by === p.id);
    const hasOwed     = expenses.some((e) => e.expense_shares.some((s) => s.participant_id === p.id));
    const hasTransfer = transfers.some((t) => t.from_id === p.id || t.to_id === p.id);
    if (hasPaid || hasOwed || hasTransfer) {
  openInfo(
    'Person kann nicht gelöscht werden. Bitte zuerst Ausgaben/Überweisungen der Person löschen.'
  );
} else {
  setCurrentPart(p);
  setShowDeleteModal(true);
}
  };
  const deleteParticipant = async () => {
    await supabase.from('participants').delete().eq('id', currentPart.id);
    setShowDeleteModal(false);
    fetchParticipants();
  };

  const handleRenameClick = (p) => {
    setCurrentPart(p);
    setRenameValue(p.name);
    setShowRenameModal(true);
  };
  const renameParticipant = async () => {
    if (!renameValue.trim()) return;
    await supabase.from('participants').update({ name: renameValue }).eq('id', currentPart.id);
    setShowRenameModal(false);
    fetchParticipants();
  };

  // --- Actions: Room ---
  const extendRoom = async () => {
    if (!expiresAt) return;
    const now    = new Date();
    const base   = expiresAt > now ? expiresAt : now;
    const newExp = new Date(base.getTime() + 14 * 24 * 60 * 60 * 1000);

 	const { error } = await supabase
  	 	.from('rooms')
   		.update({
     expires_at: newExp.toISOString(),
     expired: false
   	})
   	.eq('id', id);
    	if (!error) {
      		setExpiresAt(newExp);
      		openInfo('Raum wurde um 14 Tage verlängert.');
    	} else {
      		openInfo('Fehler beim Verlängern.');
    	}
  	};

  // --- Actions: Expense ---
  const addExpense = async () => {
    if (!newExpenseTitle || !newExpenseAmount || !payerId) {
      return openConfirm('Bitte Titel, Betrag und Zahler angeben!', () => {});
    }
    const total = parseFloat(newExpenseAmount);
    const { data: exp, error } = await supabase
      .from('expenses')
      .insert([{
        room_id: id,
        title: newExpenseTitle,
        amount: total,
        paid_by: payerId,
        distribution_type: distributionType
      }])
      .select().single();
    if (error) return openConfirm('Fehler beim Speichern der Ausgabe.', () => {});
    const mk = (pid, amt, pct) => ({ expense_id: exp.id, participant_id: pid, share_amount: amt, ...(pct != null && { share_percent: pct }) });
    let shares = [];
    switch (distributionType) {
      case 'EQUAL_ALL':
        shares = participants.map((p) => mk(p.id, parseFloat((total / participants.length).toFixed(2))));
        break;
      case 'EQUAL_SOME':
        if (!selectedParticipants.length) return openConfirm('Bitte Personen auswählen!', () => {});
        shares = selectedParticipants.map((pid) => mk(pid, parseFloat((total / selectedParticipants.length).toFixed(2))));
        break;
      case 'PERCENTAGE':
        if (Object.values(percentages).reduce((s, v) => s + Number(v), 0) !== 100)
          return openConfirm('Summe der Prozente muss 100% sein.', () => {});
        shares = Object.entries(percentages).map(([pid, p]) => mk(pid, parseFloat(((total * p) / 100).toFixed(2)), Number(p)));
        break;
      case 'FIXED':
        if (parseFloat(Object.values(amounts).reduce((s, a) => s + Number(a), 0).toFixed(2)) !== total)
          return openConfirm('Einzelbeträge ergeben nicht Gesamtbetrag.', () => {});
        shares = Object.entries(amounts).map(([pid, a]) => mk(pid, parseFloat(Number(a).toFixed(2))));
        break;
      default:
        break;
    }
    if (shares.length) await supabase.from('expense_shares').insert(shares);
    // reset
    setNewExpenseTitle('');
    setNewExpenseAmount('');
    setPayerId('');
    setDistributionType('EQUAL_ALL');
    setSelectedParticipants([]);
    setPercentages({});
    setAmounts({});
    fetchExpenses();
    setShowExpenseModal(false);
  };

  const deleteExpense = (eid) =>
    openConfirm('Ausgabe löschen?', async () => {
      await supabase.from('expenses').delete().eq('id', eid);
      fetchExpenses();
    });

  // --- Actions: Transfer ---
  const completeTransfer = (fromId, toId, amount) =>
    openConfirm(
      `Bestätige: ${findName(fromId)} hat ${amount} € an ${findName(toId)} überwiesen?`,
      async () => {
        await supabase.from('transfers').insert([{ room_id: id, from_id: fromId, to_id: toId, amount }]);
        fetchTransfers();
        fetchExpenses();
      }
    );

  const deleteTransfer = (tid) =>
    openConfirm('Überweisung löschen?', async () => {
      await supabase.from('transfers').delete().eq('id', tid);
      fetchTransfers();
    });

// --- Neuer Debt-Optimization-Greedy-Ansatz ---
const round2 = (x) => Math.round(x * 100) / 100;

const optimize = () => {
  // 1) Net-Balance pro Teilnehmer ermitteln
  const netBalance = {};
  participants.forEach((p) => {
    netBalance[p.id] = 0;
  });

  // 1a) Ausgaben: jeder Anteil zieht vom Schuldner und gibt dem Zahler 
  expenses.forEach((e) => {
    e.expense_shares.forEach((s) => {
      const debtor   = s.participant_id;
      const creditor = e.paid_by;
      if (debtor === creditor) return;
      const amt = parseFloat(s.share_amount);
      netBalance[debtor]   = round2(netBalance[debtor]   - amt);
      netBalance[creditor] = round2(netBalance[creditor] + amt);
    });
  });

  // 1b) Transfers: vom Sender abziehen, dem Empfänger gutschreiben
  transfers.forEach((t) => {
    const from = t.from_id;
    const to   = t.to_id;
    const amt  = parseFloat(t.amount);
    netBalance[from] = round2(netBalance[from] + amt);
    netBalance[to]   = round2(netBalance[to]   - amt);
  });

  // 2) Debitoren (negativ) und Kreditoren (positiv) sammeln
  const debtors  = [];
  const creditors = [];
  Object.entries(netBalance).forEach(([id, bal]) => {
    if (bal < -0.01) debtors.push({ id, bal });
    else if (bal >  0.01) creditors.push({ id, bal });
  });

  // 3) Sortieren: stärkster Schuldner zuerst, stärkster Gläubiger zuerst
  debtors.sort((a, b) => a.bal - b.bal);
  creditors.sort((a, b) => b.bal - a.bal);

  // 4) Paarweises Ausgleichen
  const settlements = [];
  while (debtors.length && creditors.length) {
    const debtor   = debtors[0];
    const creditor = creditors[0];
    const payment  = Math.min(-debtor.bal, creditor.bal);
    const amt      = round2(payment);
    if (amt < 0.01) break;

    // Ticket eintragen
    settlements.push({ from: debtor.id, to: creditor.id, amount: amt });

    // Balances anpassen
    debtor.bal   = round2(debtor.bal   + amt);
    creditor.bal = round2(creditor.bal - amt);

    // Fertige Teilnehmer entfernen
    if (debtor.bal > -0.01)      debtors.shift();
    if (creditor.bal <  0.01)    creditors.shift();
  }

  return settlements; // Liste von {from, to, amount}
};


const renderOptimized = () => {
  const list = optimize(); // jetzt Array von { from, to, amount }

  if (!list.length) {
    return <p className={styles.noDebt}>Keine offenen Schulden 🎉</p>;
  }

  return (
<div className={styles.debtContainer}>
  {list.map((e, i) => (
    <div key={i} className={styles.debtItem}>
      {/* Zeile mit Icon + Details */}
      <div className={styles.debtRow}>
        <FaArrowRight className={styles.debtIcon} />
        <span>
          <strong>{findName(e.from)}</strong> an{' '}
          <strong>{findName(e.to)}</strong>: {formatAmount(e.amount)} €
        </span>
      </div>
      {/* Button ganz unten */}
      <button
        className={styles.btnConfirm}
        onClick={() => completeTransfer(e.from, e.to, e.amount)}
      >
        <FaMoneyBillWave /> Begleichen
      </button>
    </div>
  ))}
</div>

  );
};


  // --- Early Returns ---
  if (!id) return <div className={styles.loading}>Lade...</div>;
  if (expired)
    return (
      <div className={styles.roomContainer}>
        <h1>Dieser Raum ist abgelaufen ⏳</h1>
        <p>Leider kannst du ihn nicht mehr nutzen.</p>
        <button className={styles.btnAdd} onClick={() => router.push('/')}>
          Zur Startseite
        </button>
      </div>
    );

  // --- Main Render ---
  const history = [
    ...expenses.map((e) => ({ type: 'expense', date: e.date, data: e })),
    ...transfers.map((t) => ({ type: 'transfer', date: t.date, data: t }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <>
      <div className={styles.roomContainer}>
        {/* Header + Teilnehmer */}
        <div className={styles.headerContainer}>
          <div className={styles.titleRow}>
            <h1 className={styles.roomTitle}>Raum: {roomName}</h1>
            
            <button className={styles.btnEdit} onClick={() => openPrompt('Neuer Raumname:', roomName, async (v) => {
              if (!v) return;
              const { error } = await supabase.from('rooms').update({ name: v }).eq('id', id);
              if (!error) setRoomName(v);
              else openInfo('Fehler beim Ändern des Raumnamens.');
            })}>
              <FaEdit />
            </button>
          </div>
          <div className={styles.participantChips}>
            {participants.map((p) => (
              <div key={p.id} className={styles.chip}>
                {p.name}
                <button className={styles.btnEdit} onClick={() => handleRenameClick(p)}>
                  <FaEdit />
                </button>
                <button className={styles.btnDelete} onClick={() => handleDeleteClick(p)}>
                  <FaTrashAlt />
                </button>
              </div>
            ))}
            <button className={styles.iconButton} onClick={() => setShowParticipantModal(true)}>
              <FaPlus />
            </button>
          </div>
        </div>



        {/* Ausgaben Verlauf */}
        <section className={styles.expensesSection}>
          <div className={styles.sectionHeader}>
            <h2>Ausgabenverlauf</h2>
            <button className={styles.btnConfirm} onClick={() => setShowExpenseModal(true)}>
              Hinzufügen <FaPlus />
            </button>
          </div>
          {history.length === 0 ? (
            <p className={styles.noData}>Keine Einträge.</p>
          ) : (
            history.map((item, idx) =>
              item.type === 'expense' ? (
                <div key={idx} className={styles.expenseCardSmall}>
                  <div className={styles.expenseHeader}>
                    <FaReceipt className={styles.itemIcon} />
                    <h3>{item.data.title}</h3>
                    <span className={styles.flexSpacer} />
                    <span>{formatAmount(item.data.amount)} €</span>
                    <button className={styles.btnDelete} onClick={() => deleteExpense(item.data.id)}>
                      <FaTrashAlt />
                    </button>
                  </div>
                  <div className={styles.dateTime}>{formatDate(item.data.date)}</div>
     			 <div className={styles.paidBy}>
	       		 Bezahlt von <strong>{findName(item.data.paid_by)}</strong>
      			 </div>


                  <div className={styles.shareChips}>
                    {item.data.expense_shares?.map((s) => (
                      <span key={s.participant_id} className={styles.chip}>
                        {formatAmount(s.share_amount)} € {findName(s.participant_id)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div key={idx} className={styles.transferCard}>
                  <div className={styles.expenseHeader}>
                    <FaMoneyBillWave className={styles.itemIcon} />
                    <h3>
                      Überweisung: {findName(item.data.from_id)} → {findName(item.data.to_id)}
                    </h3>
                    <span className={styles.flexSpacer} />
                    <span>{formatAmount(item.data.amount)} €</span>
                    <button className={styles.btnDelete} onClick={() => deleteTransfer(item.data.id)}>
                      <FaTrashAlt />
                    </button>
                  </div>
                  <div className={styles.dateTime}>{formatDate(item.data.date)}</div>
                </div>
              )
            )
          )}
        </section>

        {/* Optimierte Rückzahlungen */}
        <section className={styles.optimizedSection}>
          <div className={styles.sectionHeader}>
            <h2>Optimierte Rückzahlungen</h2>
          </div>
          {renderOptimized()}
        </section>
      </div>
      
              {/* Ablauf-Info */}
        {expiresAt && (
          <div className={styles.expiryBox}>
            <p className={styles.expiryInfo}>
              Dieser Raum ist noch <strong>{Math.max(0, Math.ceil((expiresAt - Date.now()) / (1000*60*60*24)))}</strong> Tage verfügbar.<br />
              7 Tage vor Ablauf kannst du ihn hier ganz einfach verlängern.
            </p>
            {Math.max(0, Math.ceil((expiresAt - Date.now()) / (1000*60*60*24))) <= 7 && (
              <button className={styles.btnAdd} onClick={extendRoom}>
                Raum um 14 Tage verlängern
              </button>
            )}
            <div className={styles.roomID}>Raum-ID: {id}</div>
          </div>
          
        )}

      {/* Modals */}
      <Modal isOpen={showParticipantModal} onClose={() => setShowParticipantModal(false)} title="Teilnehmer hinzufügen">
        <input
          className={styles.modalInput}
          placeholder="Name"
          value={newName}
          maxLength={14}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button className={styles.btnAdd} onClick={addParticipant}>
          <FaPlus /> Hinzufügen
        </button>
      </Modal>

      <Modal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="Neue Ausgabe">
<input
  className={styles.modalInput}
  placeholder="Titel"
  value={newExpenseTitle}
  onChange={(e) => setNewExpenseTitle(e.target.value)}
/>
<input
  className={styles.modalInput}
  type="number"
  placeholder="Betrag"
  value={newExpenseAmount}
  onChange={(e) => setNewExpenseAmount(e.target.value)}
/>
<select
  className={styles.modalInput}
  value={payerId}
  onChange={(e) => setPayerId(e.target.value)}
>
  <option value="">Wer hat bezahlt?</option>
  {participants.map((p) => (
    <option key={p.id} value={p.id}>
      {p.name}
    </option>
  ))}
</select>
<select
  className={styles.modalInput}
  value={distributionType}
  onChange={(e) => setDistributionType(e.target.value)}
>
  <option value="EQUAL_ALL">Gleich (alle)</option>
  <option value="EQUAL_SOME">Gleich (ausgewählt)</option>
  <option value="PERCENTAGE">Prozentual</option>
  <option value="FIXED">Festbeträge</option>
</select>

{distributionType === 'EQUAL_SOME' && (
  <div className={styles.optionGrid}>
    {participants.map((p) => (
      <label key={p.id} className={styles.optionLabel}>
        <input
          type="checkbox"
          checked={selectedParticipants.includes(p.id)}
          onChange={() =>
            setSelectedParticipants((prev) =>
              prev.includes(p.id)
                ? prev.filter((x) => x !== p.id)
                : [...prev, p.id]
            )
          }
        />
        {p.name}
      </label>
    ))}
  </div>
)}

{distributionType === 'PERCENTAGE' && (
  <div className={styles.optionList}>
    {participants.map((p) => (
      <div key={p.id} className={styles.optionRow}>
        <span>{p.name}</span>
        <input
          className={`${styles.modalInput} ${styles.inputSmall}`}
          type="number"
          placeholder="%"
          value={percentages[p.id] || ''}
          onChange={(e) =>
            setPercentages((prev) => ({
              ...prev,
              [p.id]: e.target.value
            }))
          }
        />
        <span>%</span>
      </div>
    ))}
  </div>
)}

{distributionType === 'FIXED' && (
  <div className={styles.optionList}>
    {participants.map((p) => (
      <div key={p.id} className={styles.optionRow}>
        <span>{p.name}</span>
        <input
          className={`${styles.modalInput} ${styles.inputSmall}`}
          type="number"
          placeholder="€"
          value={amounts[p.id] || ''}
          onChange={(e) =>
            setAmounts((prev) => ({
              ...prev,
              [p.id]: e.target.value
            }))
          }
        />
        <span>€</span>
      </div>
    ))}
  </div>
)}

<button
  className={`${styles.btnAdd} ${styles.mt4}`}
  onClick={addExpense}
>
  <FaPlus /> Hinzufügen
</button>
      </Modal>

      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Bestätigen">
        <p>{confirmMessage}</p>
        <div className={styles.confirmButtons}>
          <button className={styles.btnAdd} onClick={handleConfirm}>Ja</button>
          <button className={styles.btnClose} onClick={() => setShowConfirmModal(false)}>Nein</button>
        </div>
      </Modal>
      
    
    {/* Raumname bearbeiten */}
      <Modal isOpen={showPromptModal} onClose={() => setShowPromptModal(false)} title="Raumname ändern">
        <p>{promptMessage}</p>
        <input className={styles.modalInput} value={promptValue} onChange={(e) => setPromptValue(e.target.value)} />
        <div className={styles.confirmButtons}>
          <button className={styles.btnAdd} onClick={handlePrompt}>Speichern</button>
          <button className={styles.btnClose} onClick={() => setShowPromptModal(false)}>Abbrechen</button>
        </div>
      </Modal>

      {/* Teilnehmer löschen */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Person löschen?">
        <p>Willst du <strong>{currentPart?.name}</strong> wirklich löschen?</p>
        <div className={styles.confirmButtons}>
          <button className={styles.btnAdd} onClick={deleteParticipant}>Ja</button>
          <button className={styles.btnClose} onClick={() => setShowDeleteModal(false)}>Nein</button>
        </div>
      </Modal>

      {/* Teilnehmer umbenennen */}
      <Modal isOpen={showRenameModal} onClose={() => setShowRenameModal(false)} title="Person umbenennen">
        <input
          className={styles.modalInput}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
        />
        <div className={styles.confirmButtons}>
          <button className={styles.btnAdd} onClick={renameParticipant}>Speichern</button>
          <button className={styles.btnClose} onClick={() => setShowRenameModal(false)}>Abbrechen</button>
        </div>
      </Modal>

{/* Info-Modal */}
<Modal
  isOpen={showInfoModal}
  onClose={() => setShowInfoModal(false)}
  title="Hinweis"
>

<p>{infoMessage}</p>
 <div className={styles.confirmButtons}>
   <button className={styles.btnAdd} onClick={() => setShowInfoModal(false)}>
     Verstanden
   </button>
 </div>
</Modal>

    </>
  );
}
