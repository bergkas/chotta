
/*===========================================*/
// pages/room/[id].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';

import { supabase } from '../../lib/supabase';
import styles from '../../styles/RoomPage.module.css';

import {
  FaTrashAlt,
  FaPlus,
  FaTimes,
  FaPen,
  FaArrowRight,
  FaReceipt,
  FaMoneyBillWave,
  FaSun,
  FaMoon
} from 'react-icons/fa';
import { FaMoneyBillTransfer, FaArrowRightArrowLeft } from 'react-icons/fa6';

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
  
// --- Dark mode state & effects (manual only) ------------------
// 1) read the saved preference (or default to false)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('darkMode') === 'true';
  });

  // 2) on first mount, ensure our CSS vars class is on <body>
  useEffect(() => {
    document.body.classList.add('theme');
  }, []);

  // 3) when darkMode changes: toggle the .dark class *and* persist
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      window.localStorage.setItem('darkMode', 'true');
    } else {
      document.body.classList.remove('dark');
      window.localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);


  
  

  // --- State ---
  const [participants, setParticipants] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [transfers, setTransfers] = useState([]);

  const [roomName, setRoomName] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [expired, setExpired] = useState(false);

  const [settings, setSettings] = useState({
    default_currency: 'EUR',
    extra_currencies: {},
    auto_update: false,
    last_updated: null,
  });
  const [editSettings, setEditSettings] = useState(settings);
  const [rates, setRates] = useState({});

  const [newName, setNewName] = useState('');
  const [manageNames, setManageNames] = useState({});

  const [newExpenseTitle, setNewExpenseTitle] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCurrency, setNewExpenseCurrency] = useState('EUR');
  const [payerId, setPayerId] = useState('');
  const [distributionType, setDistributionType] = useState('EQUAL_ALL');
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [percentages, setPercentages] = useState({});
  const [amounts, setAmounts] = useState({});

  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);

  // Dialog payload
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(() => {});
  const [promptMessage, setPromptMessage] = useState('');
  const [promptValue, setPromptValue] = useState('');
  const [promptAction, setPromptAction] = useState(() => {});
  const [infoMessage, setInfoMessage] = useState('');

  // For delete/rename
  const [currentPart, setCurrentPart] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // --- Effects ---
  useEffect(() => {
    if (!id) return;
    fetchRoomName();
    fetchParticipants();
    fetchExpenses();
    fetchTransfers();
    fetchSettings();
  }, [id]);

  useEffect(() => {
    if (!showSettingsModal) return;
    const base = editSettings.default_currency;
    const extras = Object.keys(editSettings.extra_currencies);
    fetchRates(base, extras);
  }, [showSettingsModal, editSettings.default_currency, editSettings.extra_currencies]);

  // --- Fetchers ---
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

  async function fetchSettings() {
    const { data, error } = await supabase
      .from('room_settings')
      .select('default_currency, extra_currencies')
      .eq('room_id', id)
      .single();
    if (error || !data) return;

    setSettings((s) => ({ ...s, ...data }));
    setEditSettings(data);
    await fetchRates(data.default_currency, Object.keys(data.extra_currencies));

    const { data: latest } = await supabase
      .from('currency_rates')
      .select('updated_at')
      .eq('base_currency', data.default_currency)
      .in('target_currency', Object.keys(data.extra_currencies))
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    if (latest?.updated_at) {
      setSettings((s) => ({ ...s, last_updated: latest.updated_at }));
    }
  }

  async function fetchRates(base, targets) {
    if (!base || targets.length === 0) return;
    const { data } = await supabase
      .from('currency_rates')
      .select('target_currency, rate')
      .eq('base_currency', base)
      .in('target_currency', targets);
    if (data) {
      const map = Object.fromEntries(data.map((r) => [r.target_currency, r.rate]));
      setRates(map);
    }
  }

  // --- Helpers ---
  const formatAmount = (v) => parseFloat(v).toFixed(2);
  const formatDate = (dt) =>
    new Date(dt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  const findName = (pid) => participants.find((p) => p.id === pid)?.name || '–';
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  // --- Dialog Starters ---
  const openConfirm = (msg, action) => {
    setConfirmMessage(msg);
    setConfirmAction(() => action);
    setShowConfirmModal(true);
  };
  const handleConfirm = () => {
    confirmAction();
    setShowConfirmModal(false);
  };
  const openPrompt = (msg, def, action) => {
    setPromptMessage(msg);
    setPromptValue(def);
    setPromptAction(() => action);
    setShowPromptModal(true);
  };
  const handlePrompt = () => {
    promptAction(promptValue);
    setShowPromptModal(false);
  };
  const openInfo = (msg) => {
    setInfoMessage(msg);
    setShowInfoModal(true);
  };

  // --- Participant Actions ---
  async function addParticipant() {
    const name = newName.trim();
    if (!name) return;
    if (name.length > 14) return openInfo('Namen können max. 14 Zeichen lang sein.');

    const { data: newPart, error } = await supabase
      .from('participants')
      .insert([{ room_id: id, name }])
      .select()
      .single();
    if (error || !newPart) return openInfo('Fehler beim Hinzufügen.');

    setParticipants((p) => [...p, newPart]);
    setManageNames((m) => ({ ...m, [newPart.id]: newPart.name }));
    setNewName('');
  }

  function handleDeleteClick(p) {
    const hasPaid = expenses.some((e) => e.paid_by === p.id);
    const hasOwed = expenses.some((e) => e.expense_shares.some((s) => s.participant_id === p.id));
    const hasTransfer = transfers.some((t) => t.from_id === p.id || t.to_id === p.id);
    if (hasPaid || hasOwed || hasTransfer) {
      return openInfo('Person kann nicht gelöscht werden. Bitte zuerst Ausgaben/Überweisungen der Person löschen.');
    }
    setCurrentPart(p);
    setShowDeleteModal(true);
  }

  async function deleteParticipant() {
    if (!currentPart) return;
    await supabase.from('participants').delete().eq('id', currentPart.id);
    setShowDeleteModal(false);
    fetchParticipants();
  }

  function handleRenameClick(p) {
    setCurrentPart(p);
    setRenameValue(p.name);
    setShowRenameModal(true);
  }

  async function renameParticipant() {
    const name = renameValue.trim();
    if (!name || !currentPart) return;
    await supabase.from('participants').update({ name }).eq('id', currentPart.id);
    setShowRenameModal(false);
    fetchParticipants();
  }

  // --- Room Actions ---
  async function extendRoom() {
    if (!expiresAt) return;
    const now = new Date();
    const base = expiresAt > now ? expiresAt : now;
    const newExp = new Date(base.getTime() + 14 * 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from('rooms')
      .update({ expires_at: newExp.toISOString(), expired: false })
      .eq('id', id);

    if (error) return openInfo('Fehler beim Verlängern.');
    setExpiresAt(newExp);
    openInfo('Raum wurde um 14 Tage verlängert.');
  }

  // --- Expense Actions ---
  async function addExpense() {
    if (!newExpenseTitle || !newExpenseAmount || !payerId) return openInfo('Bitte Titel, Betrag und Zahler angeben.');
    const total = parseFloat(newExpenseAmount);

    if (distributionType === 'PERCENTAGE') {
      const sumPct = Object.values(percentages).reduce((s, v) => s + Number(v), 0);
      if (sumPct !== 100) return openInfo('Summe der Prozente muss genau 100 % betragen.');
    }
    if (distributionType === 'FIXED') {
      const sumAmt = parseFloat(Object.values(amounts).reduce((s, a) => s + Number(a), 0).toFixed(2));
      if (sumAmt !== total) return openInfo('Einzelbeträge müssen genau dem Gesamtbetrag entsprechen.');
    }

    const rate = newExpenseCurrency === settings.default_currency
      ? 1
      : rates[newExpenseCurrency] || 1;
    const converted = parseFloat((total / rate).toFixed(2));

    const { data: exp, error: expError } = await supabase
      .from('expenses')
      .insert([{ room_id: id, title: newExpenseTitle, amount: converted, original_amount: total, original_currency: newExpenseCurrency, converted_amount: converted, paid_by: payerId, distribution_type: distributionType }])
      .select()
      .single();
    if (expError || !exp) return openInfo('Fehler beim Speichern der Ausgabe.');

    const makeShare = (pid, amt, pct) => ({ expense_id: exp.id, participant_id: pid, share_amount: amt, ...(pct != null && { share_percent: pct }) });
    let shares = [];

    switch (distributionType) {
      case 'EQUAL_ALL':
        shares = participants.map(p => makeShare(p.id, parseFloat((converted / participants.length).toFixed(2))));
        break;
      case 'EQUAL_SOME':
        if (!selectedParticipants.length) return openInfo('Bitte Personen auswählen!');
        shares = selectedParticipants.map(pid => makeShare(pid, parseFloat((converted / selectedParticipants.length).toFixed(2))));
        break;
      case 'PERCENTAGE':
        shares = Object.entries(percentages).map(([pid, pct]) => makeShare(pid, parseFloat((converted * pct / 100).toFixed(2)), Number(pct)));
        break;
      case 'FIXED':
        shares = Object.entries(amounts).map(([pid, amt]) => makeShare(pid, parseFloat((amt / rate).toFixed(2))));
        break;
      default:
        break;
    }

    if (shares.length) {
      const { error: shareError } = await supabase.from('expense_shares').insert(shares);
      if (shareError) return openInfo('Fehler beim Speichern der Anteile.');
    }

    setNewExpenseTitle(''); setNewExpenseAmount(''); setPayerId(''); setDistributionType('EQUAL_ALL');
    setSelectedParticipants([]); setPercentages({}); setAmounts({});
    fetchExpenses();
    setShowExpenseModal(false);
  }

  const deleteExpense = eid => openConfirm('Ausgabe löschen?', async () => { await supabase.from('expenses').delete().eq('id', eid); fetchExpenses(); });

  // --- Transfer Actions ---
  const completeTransfer = (from, to, amount) => openConfirm(
    `Bestätige: ${findName(from)} hat ${amount} € an ${findName(to)} überwiesen?`, async () => {
      await supabase.from('transfers').insert([{ room_id: id, from_id: from, to_id: to, amount }]);
      fetchTransfers(); fetchExpenses();
    }
  );

  const deleteTransfer = tid => openConfirm('Überweisung löschen?', async () => { await supabase.from('transfers').delete().eq('id', tid); fetchTransfers(); });

  // --- Debt Optimization ---
  const round2 = x => Math.round(x * 100) / 100;
  function optimize() {
    const net = {}; participants.forEach(p => net[p.id] = 0);
    expenses.forEach(e => e.expense_shares.forEach(s => {
      const d = s.participant_id, c = e.paid_by, amt = parseFloat(s.share_amount);
      if (d !== c) { net[d] = round2(net[d] - amt); net[c] = round2(net[c] + amt); }
    }));
    transfers.forEach(t => { net[t.from_id] = round2(net[t.from_id] + parseFloat(t.amount)); net[t.to_id] = round2(net[t.to_id] - parseFloat(t.amount)); });
    const debtors = [], creditors = [];
    Object.entries(net).forEach(([pid, bal]) => { if (bal < -0.01) debtors.push({ id: pid, bal }); else if (bal > 0.01) creditors.push({ id: pid, bal }); });
    debtors.sort((a,b) => a.bal - b.bal); creditors.sort((a,b) => b.bal - a.bal);
    const settlements = [];
    while (debtors.length && creditors.length) {
      const d = debtors[0], c = creditors[0]; const amt = round2(Math.min(-d.bal, c.bal)); if (amt < 0.01) break;
      settlements.push({ from: d.id, to: c.id, amount: amt }); d.bal = round2(d.bal + amt); c.bal = round2(c.bal - amt);
      if (d.bal > -0.01) debtors.shift(); if (c.bal < 0.01) creditors.shift();
    }
    return settlements;
  }

  function renderOptimized() {
    const list = optimize();
    if (!list.length) return <p className={styles.noDebt}>Keine offenen Schulden 🎉</p>;
    return (
      <div className={styles.debtContainer}>
        {list.map((e,i) => (
          <div key={i} className={styles.debtItem}>
            <div className={styles.debtRow}>
              <FaArrowRight className={styles.debtIcon} />
              <span><strong>{findName(e.from)}</strong> an <strong>{findName(e.to)}</strong>: {formatAmount(e.amount)} €</span>
            </div>
            <button className={styles.btnConfirm} onClick={() => completeTransfer(e.from,e.to,e.amount)}>
              <FaMoneyBillWave /> Begleichen
            </button>
          </div>
        ))}
      </div>
    );
  }

  // --- Early Returns ---
  if (!id) return <div className={styles.loading}>Lade...</div>;
  if (expired) return (
    <div className={styles.roomContainer}>
      <h1>Dieser Raum ist abgelaufen ⏳</h1>
      <p>Leider kannst du ihn nicht mehr nutzen.</p>
      <button className={styles.btnAdd} onClick={() => router.push('/')}>Zur Startseite</button>
    </div>
  );

  // --- Render ---
  const history = [...expenses.map(e => ({ type:'expense', date:e.date, data:e })), ...transfers.map(t=>({ type:'transfer', date:t.date, data:t }))]
    .sort((a,b) => new Date(b.date) - new Date(a.date));

 return (
  <>
    {/* Theme wrapper: applies light or dark CSS variables */}
    <div className={`${styles.theme} ${darkMode ? styles.dark : ''}`}>
      {/* Dark mode toggle */}
      

      <div className={styles.roomContainer}>
        {/* Header */}
        <div className={styles.headerContainer}>
          <div className={styles.logo}>
            <Image
              src="/chotty_logo_full_white.svg"
              alt="Chotty Logo"
              width={96}
              height={64}
            />
          </div>
          <div className={styles.titleRow}>
            <h1 className={styles.roomTitle}>
              {roomName}
              <button
                className={styles.btnEdit}
                onClick={() =>
                  openPrompt(
                    'Neuer Raumname:',
                    roomName,
                    async v => {
                      if (!v) return;
                      const { error } = await supabase
                        .from('rooms')
                        .update({ name: v })
                        .eq('id', id);
                      if (!error) setRoomName(v);
                      else openInfo('Fehler beim Ändern des Raumnamens.');
                    }
                  )
                }
              >
                <FaPen />
              </button>
            </h1>
          </div>
          <div className={styles.participantChips}>
            {participants.map(p => (
              <span key={p.id} className={styles.chip}>
                {p.name}
              </span>
            ))}
            <button
              className={styles.iconButton}
              onClick={() => {
                setManageNames(
                  Object.fromEntries(participants.map(p => [p.id, p.name]))
                );
                setShowManageModal(true);
              }}
            >
              <FaPlus />
            </button>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.totalExpenses}>
              Ausgaben:{' '}
              <strong>
                {formatAmount(totalExpenses)} {settings.default_currency}
              </strong>
            </span>
            <button
              className={styles.anchorLink}
              onClick={() =>
                document
                  .getElementById('optimized')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Rückzahlungen ↓
            </button>
          </div>
        </div>

<div className={styles.toolbar}>
  <button
    className={styles.btnCurrency}
    onClick={() => {
      setEditSettings({ ...settings });
      setShowSettingsModal(true);
    }}
  >
    <FaArrowRightArrowLeft /> Währungen
  </button>

  <div className={styles.toolbarSpacer} />

  <button
    className={styles.btnCurrency}
    onClick={() => setDarkMode(d => !d)}
  >
    {darkMode ? <FaSun /> : <FaMoon />} {darkMode ? 'Light' : 'Dark'}
  </button>
</div>


        {/* Expenses History */}
        <section className={styles.expensesSection}>
          <div className={styles.sectionHeader}>
            <h2>Ausgabenverlauf</h2>
            <button
              className={styles.btnConfirm}
              onClick={() => setShowExpenseModal(true)}
            >
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
                    <h3>{item.data.title} </h3>
             
                    <span className={styles.flexSpacer} />
					<span>
						{item.data.original_amount.toFixed(2)}
						<sup className={styles.currency}>{item.data.original_currency}</sup>
					</span>
                    <button
                      className={styles.btnDelete}
                      onClick={() => deleteExpense(item.data.id)}
                    >
                      <FaTrashAlt />
                    </button>

                    
                  </div>
                  <div className={styles.dateTime}>
                    {formatDate(item.data.date)}
                  </div>
                  <div className={styles.paidBy}>
                    Bezahlt von <strong>{findName(item.data.paid_by)}</strong>
                  </div>
                  {item.data.original_currency !==
                    settings.default_currency && (
                    <div className={styles.currencyInfo}>
                      <FaArrowRightArrowLeft
                        className={styles.rotateIcon}
                      />
                      <span>
                        {item.data.original_amount.toFixed(2)}
                        {item.data.original_currency} →{' '}
                        {formatAmount(item.data.converted_amount)}{' '}
                        {settings.default_currency}
                      </span>
                    </div>
                  )}
                  <div className={styles.shareChips}>
                    {item.data.expense_shares?.map(s => (
                      <span
                        key={s.participant_id}
                        className={styles.chip}
                      >
                        {formatAmount(s.share_amount)}{' '}
                        {settings.default_currency}{' '}
                        {findName(s.participant_id)}
                        
                      </span>
                      
                      
                    ))}
                  </div>
                </div>
              ) : (
                <div key={idx} className={styles.transferCard}>
                  <div className={styles.expenseHeader}>
                    <FaMoneyBillWave className={styles.itemIcon} />
                    <h3>Überweisung</h3>
                    <span className={styles.flexSpacer} />
					<span>
						{formatAmount(item.data.amount)}
						<sup className={styles.currency}>{settings.default_currency}</sup>
					</span>
                    <button
                      className={styles.btnDelete}
                      onClick={() => deleteTransfer(item.data.id)}
                    >
                      <FaTrashAlt />
                    </button>
                  </div>
                  <div className={styles.dateTime}>
                    {formatDate(item.data.date)}
                  </div>
                  <div className={styles.paidBy}>
                    <strong>
                      {findName(item.data.from_id)} →{' '}
                      {findName(item.data.to_id)}
                    </strong>
                  </div>
                </div>
              )
            )
          )}
        </section>

        {/* Optimized Settlements */}
        <section
          id="optimized"
          className={styles.optimizedSection}
        >
          <div className={styles.sectionHeader}>
            <h2>Optimierte Rückzahlungen</h2>
          </div>
          {renderOptimized()}
        </section>
      </div>

      {/* Expiry Info */}
      {expiresAt && (
        <div className={styles.expiryBox}>
          <p className={styles.expiryInfo}>
            Dieser Raum ist noch{' '}
            <strong>
              {Math.max(
                0,
                Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
              )}
            </strong>{' '}
            Tage verfügbar.
            <br />
            7 Tage vor Ablauf kannst du ihn hier ganz einfach verlängern.
          </p>
          {Math.max(
            0,
            Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
          ) <= 7 && (
            <button
              className={styles.btnAdd}
              onClick={extendRoom}
            >
              Raum um 14 Tage verlängern
            </button>
          )}
          <div className={styles.roomID}>Raum-ID: {id}</div>
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
      )}

{/* ——— ALL MODALS BELOW ——— */}

{/* 1) Add Participant */}
<Modal
  isOpen={showParticipantModal}
  onClose={() => setShowParticipantModal(false)}
  title="Person hinzufügen"
>
  <input
    className={styles.modalInput}
    placeholder="Name"
    value={newName}
    maxLength={14}
    onChange={e => setNewName(e.target.value)}
  />
  <button className={styles.btnAdd} onClick={addParticipant}>
    <FaPlus /> Hinzufügen
  </button>
</Modal>

{/* 2) Manage Participants */}
<Modal
  isOpen={showManageModal}
  onClose={() => setShowManageModal(false)}
  title="Personen verwalten"
>
  <div className={`${styles.optionRow} ${styles.addRow}`}>
    <input
      className={styles.modalInput}
      placeholder="Neue Person hinzufügen"
      value={newName}
      maxLength={14}
      onChange={e => setNewName(e.target.value)}
    />
    <button className={styles.btnAdd} onClick={addParticipant}>
      <FaPlus />
    </button>
  </div>
  <div className={styles.optionList}>
    {participants.map(p => (
      <div key={p.id} className={styles.optionRow}>
        <input
          className={styles.modalInput}
          value={manageNames[p.id] || ''}
          onChange={e =>
            setManageNames(m => ({ ...m, [p.id]: e.target.value }))
          }
        />
        <button
          className={styles.btnDelete}
          onClick={() => handleDeleteClick(p)}
        >
          <FaTrashAlt />
        </button>
      </div>
    ))}
  </div>
  <div style={{ textAlign: 'right', marginTop: 16 }}>
    <button
      className={styles.btnAdd}
      onClick={async () => {
        await Promise.all(
          Object.entries(manageNames).map(async ([pid, name]) => {
            const orig = participants.find(x => x.id === pid)?.name;
            if (name && orig && name !== orig) {
              await supabase
                .from('participants')
                .update({ name })
                .eq('id', pid);
            }
          })
        );
        fetchParticipants();
        setShowManageModal(false);
      }}
    >
      Speichern
    </button>
  </div>
</Modal>

{/* 3) New Expense */}
<Modal
  isOpen={showExpenseModal}
  onClose={() => setShowExpenseModal(false)}
  title="Neue Ausgabe"
>
  <input
    className={styles.modalInput}
    placeholder="Titel"
    value={newExpenseTitle}
    onChange={e => setNewExpenseTitle(e.target.value)}
  />
  <div className={styles.inputRow}>
    <input
      className={`${styles.modalInput} ${styles.inputAmount}`}
      type="number"
      placeholder="Betrag"
      value={newExpenseAmount}
      onChange={e => setNewExpenseAmount(e.target.value)}
    />
    <select
      className={`${styles.modalInput} ${styles.inputCurrency}`}
      value={newExpenseCurrency}
      onChange={e => setNewExpenseCurrency(e.target.value)}
    >
      <option value={settings.default_currency}>
        {settings.default_currency} (Basis)
      </option>
      {Object.keys(settings.extra_currencies).map(cur => (
        <option key={cur} value={cur}>
          {cur} ({(rates[cur] ?? 1).toFixed(2)})
        </option>
      ))}
    </select>
  </div>
  <select
    className={styles.modalInput}
    value={payerId}
    onChange={e => setPayerId(e.target.value)}
  >
    <option value="">Wer hat bezahlt?</option>
    {participants.map(p => (
      <option key={p.id} value={p.id}>
        {p.name}
      </option>
    ))}
  </select>
  <select
    className={styles.modalInput}
    value={distributionType}
    onChange={e => setDistributionType(e.target.value)}
  >
    <option value="EQUAL_ALL">Gleich (alle)</option>
    <option value="EQUAL_SOME">Gleich (ausgewählt)</option>
    <option value="PERCENTAGE">Prozentual</option>
    <option value="FIXED">Festbeträge</option>
  </select>

  {distributionType === 'EQUAL_SOME' && (
    <div className={styles.optionGrid}>
      {participants.map(p => (
        <label key={p.id} className={styles.optionLabel}>
          <input
            type="checkbox"
            checked={selectedParticipants.includes(p.id)}
            onChange={() =>
              setSelectedParticipants(s =>
                s.includes(p.id) ? s.filter(x => x !== p.id) : [...s, p.id]
              )
            }
          />
          {p.name}
        </label>
      ))}
    </div>
  )}

  {distributionType === 'PERCENTAGE' && (
    <>
      <div className={styles.optionList}>
        {participants.map(p => (
          <div key={p.id} className={styles.optionRow}>
            <span>{p.name}</span>
            <input
              className={`${styles.modalInput} ${styles.inputSmall}`}
              type="number"
              placeholder="%"
              value={percentages[p.id] || ''}
              onChange={e =>
                setPercentages(prev => ({
                  ...prev,
                  [p.id]: e.target.value
                }))
              }
            />
            <span>%</span>
          </div>
        ))}
      </div>
      <div
        className={`${styles.inputSummary} ${
          Object.values(percentages).reduce((s, v) => s + Number(v), 0) ===
          100
            ? styles.summaryValid
            : styles.summaryInvalid
        }`}
      >
        {Object.values(percentages).reduce((s, v) => s + Number(v), 0)}% von
        100%
      </div>
    </>
  )}

  {distributionType === 'FIXED' && (
    <>
      <div className={styles.optionList}>
        {participants.map(p => (
          <div key={p.id} className={styles.optionRow}>
            <span>{p.name}</span>
            <input
              className={`${styles.modalInput} ${styles.inputSmall}`}
              type="number"
              placeholder={newExpenseCurrency}
              value={amounts[p.id] || ''}
              onChange={e =>
                setAmounts(prev => ({
                  ...prev,
                  [p.id]: e.target.value
                }))
              }
            />
            <span>{newExpenseCurrency}</span>
          </div>
        ))}
      </div>
      <div
        className={`${styles.inputSummary} ${
          parseFloat(
            Object.values(amounts)
              .reduce((s, a) => s + Number(a), 0)
              .toFixed(2)
          ) === parseFloat(newExpenseAmount)
            ? styles.summaryValid
            : styles.summaryInvalid
        }`}
      >
        {parseFloat(
          Object.values(amounts)
            .reduce((s, a) => s + Number(a), 0)
            .toFixed(2)
        ).toFixed(2)}{' '}
        {newExpenseCurrency} von {parseFloat(newExpenseAmount).toFixed(2)}{' '}
        {newExpenseCurrency}
      </div>
    </>
  )}

  <button
    className={`${styles.btnAdd} ${styles.mt4}`}
    onClick={addExpense}
  >
    <FaPlus /> Hinzufügen
  </button>
</Modal>

{/* 4) Confirm Dialog */}
<Modal
  isOpen={showConfirmModal}
  onClose={() => setShowConfirmModal(false)}
  title="Bestätigen"
>
  <p>{confirmMessage}</p>
  <div className={styles.confirmButtons}>
    <button className={styles.btnAdd} onClick={handleConfirm}>
      Ja
    </button>
    <button
      className={styles.btnClose}
      onClick={() => setShowConfirmModal(false)}
    >
      Nein
    </button>
  </div>
</Modal>

{/* 5) Prompt Dialog */}
<Modal
  isOpen={showPromptModal}
  onClose={() => setShowPromptModal(false)}
  title="Eingabe erforderlich"
>
  <p>{promptMessage}</p>
  <input
    className={styles.modalInput}
    value={promptValue}
    onChange={e => setPromptValue(e.target.value)}
  />
  <div className={styles.confirmButtons}>
    <button className={styles.btnAdd} onClick={handlePrompt}>
      Speichern
    </button>
    <button
      className={styles.btnClose}
      onClick={() => setShowPromptModal(false)}
    >
      Abbrechen
    </button>
  </div>
</Modal>

{/* 6) Info Dialog */}
<Modal
  isOpen={showInfoModal}
  onClose={() => setShowInfoModal(false)}
  title="Hinweis"
>
  <p>{infoMessage}</p>
  <div className={styles.confirmButtons}>
    <button
      className={styles.btnAdd}
      onClick={() => setShowInfoModal(false)}
    >
      Verstanden
    </button>
  </div>
</Modal>

{/* 7) Delete Participant */}
<Modal
  isOpen={showDeleteModal}
  onClose={() => setShowDeleteModal(false)}
  title="Person löschen?"
>
  <p>
    Willst du <strong>{currentPart?.name}</strong> wirklich löschen?
  </p>
  <div className={styles.confirmButtons}>
    <button className={styles.btnAdd} onClick={deleteParticipant}>
      Ja
    </button>
    <button
      className={styles.btnClose}
      onClick={() => setShowDeleteModal(false)}
    >
      Nein
    </button>
  </div>
</Modal>

{/* 8) Rename Participant */}
<Modal
  isOpen={showRenameModal}
  onClose={() => setShowRenameModal(false)}
  title="Person umbenennen"
>
  <input
    className={styles.modalInput}
    value={renameValue}
    onChange={e => setRenameValue(e.target.value)}
  />
  <div className={styles.confirmButtons}>
    <button className={styles.btnAdd} onClick={renameParticipant}>
      Speichern
    </button>
    <button
      className={styles.btnClose}
      onClick={() => setShowRenameModal(false)}
    >
      Abbrechen
    </button>
  </div>
</Modal>

{/* 9) Settings */}
<Modal
  isOpen={showSettingsModal}
  onClose={() => setShowSettingsModal(false)}
  title="Währungenseinstellungen"
>
  <label>Standard-Währung:</label>
  <select
    className={styles.modalInput}
    value={editSettings.default_currency}
    onChange={e =>
      setEditSettings(s => ({
        ...s,
        default_currency: e.target.value
      }))
    }
  >
    {['EUR','USD','PLN','GBP','CHF','CZK','HUF','SEK','NOK','DKK'].map(
      cur => (
        <option key={cur} value={cur}>
          {cur}
        </option>
      )
    )}
  </select>

  <label>Zusätzliche Währungen:</label>
  <div className={styles.optionGrid}>
    {['EUR','USD','PLN','GBP','CHF','CZK','HUF','SEK','NOK','DKK'].map(
      cur => (
        <label key={cur} className={styles.optionLabel}>
          <input
            type="checkbox"
            checked={!!editSettings.extra_currencies[cur]}
            onChange={e => {
              const extras = { ...editSettings.extra_currencies };
              if (e.target.checked) extras[cur] = 1;
              else delete extras[cur];
              setEditSettings(s => ({
                ...s,
                extra_currencies: extras
              }));
            }}
          />
          {cur}
        </label>
      )
    )}
  </div>

  <div className={styles.rateList}>
    <h4>
      Aktuelle Wechselkurse (1 {editSettings.default_currency} = …)
    </h4>
    {Object.entries(rates).map(([cur, r]) => (
      <div key={cur} className={styles.optionRow}>
        <span>{r.toFixed(2)}</span>
        <span>{cur}</span>
      </div>
    ))}
  </div>

  <p className={styles.rateInfoText}>
    Wechselkurse werden automatisch alle 72 Stunden aktualisiert.​{' '}
    {settings.last_updated
      ? `Letzte Aktualisierung am ${new Date(
          settings.last_updated
        ).toLocaleDateString('de-DE')}.`
      : 'Noch keine Aktualisierung erfolgt.'}
  </p>

  <button
    className={styles.btnAdd}
    onClick={async () => {
      const { error } = await supabase
        .from('room_settings')
        .upsert({
          room_id: id,
          default_currency: editSettings.default_currency,
          extra_currencies: editSettings.extra_currencies,
          auto_update: true
        });
      if (error) openInfo('Fehler beim Speichern der Einstellungen.');
      else {
        setSettings(editSettings);
        setShowSettingsModal(false);
      }
    }}
  >
    Speichern
  </button>
</Modal>


      </div>
    </>
  );
}

