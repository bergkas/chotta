/*===========================================*/
// pages/room/[id].js
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Modal from '../../components/Modal';
import PageLayout from '../../components/PageLayout';
import HeaderCard from '../../components/HeaderCard';
import ExpensesAndSettlements from '../../components/ExpensesAndSettlements';

import { supabase } from '../../lib/supabase';
import { Parser } from 'expr-eval';



import {
  FaTrashAlt,
  FaPlus,
  FaTimes,
  FaPen,
  FaArrowRight,
  FaLongArrowAltRight,
  FaLongArrowAltDown,
  FaReceipt,
  FaMoneyBillWave,
  FaSun,
  FaMoon,
  FaCalculator,
  FaRegCopy,
  FaChartBar
} from 'react-icons/fa';
import { FaMoneyBillTransfer, FaArrowRightArrowLeft } from 'react-icons/fa6';

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
  
  const now = Date.now()

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
  
  const [lastActivity, setLastActivity]               = useState(null)
  const [markedForDeletion, setMarkedForDeletion]     = useState(false)
  const [deletionScheduledAt, setDeletionScheduledAt] = useState(null)

  // calculator modal state
  const [formulas, setFormulas] = useState({});
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [currentCalcParticipant, setCurrentCalcParticipant] = useState(null);
  const [calcExpr, setCalcExpr] = useState('');


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
  
  //meta rooms
  const [isMeta, setIsMeta]             = useState(false)
  const [metaUsername, setMetaUsername] = useState('')
  
    //check if app is installed :)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

	useEffect(() => {
  		const isStandalone =
    	window.matchMedia('(display-mode: standalone)').matches ||
    	window.navigator.standalone === true
	
  		if (!isStandalone) {
    		setShowInstallBanner(true)
 		}
	}, [])
  
  // --- Fetchers ---
  
  // In deinem useCallback–Fetcher ganz oben:

 const fetchRoomDetails = useCallback(async () => {
   const { data, error } = await supabase
     .from('rooms')
     .select(`
       name,
       expired,
       last_activity,
       marked_for_deletion,
       deletion_scheduled_at
     `)
     .eq('id', id)
     .single()
    if (!error && data) {
     setRoomName(data.name)
     setExpired(data.expired)
     setLastActivity(new Date(data.last_activity))
     setMarkedForDeletion(data.marked_for_deletion)
     setDeletionScheduledAt(
       data.deletion_scheduled_at
         ? new Date(data.deletion_scheduled_at)
         : null
     )
    }
 }, [id])

  const fetchParticipants = useCallback(async () => {
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('room_id', id)
    if (data) setParticipants(data)
  }, [id])

  const fetchExpenses = useCallback(async () => {
    const { data } = await supabase
      .from('expenses')
      .select('*, expense_shares(*)')
      .eq('room_id', id)
    if (data) setExpenses(data)
  }, [id])

  const fetchTransfers = useCallback(async () => {
    const { data } = await supabase
      .from('transfers')
      .select('*')
      .eq('room_id', id)
    if (data) setTransfers(data)
  }, [id])

// fetchRates als useCallback (stabil, keine externen Deps)
  const fetchRates = useCallback(async (base, targets) => {
    if (!base || targets.length === 0) return
    const { data } = await supabase
      .from('currency_rates')
      .select('target_currency, rate')
      .eq('base_currency', base)
      .in('target_currency', targets)
    if (data) {
      const map = Object.fromEntries(data.map((r) => [r.target_currency, r.rate]))
      setRates(map)
    }
  }, [])

  // fetchSettings als useCallback (hört auf id und fetchRates)
  const fetchSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from('room_settings')
      .select('default_currency, extra_currencies')
      .eq('room_id', id)
      .single()
    if (error || !data) return

    setSettings((s) => ({ ...s, ...data }))
    setEditSettings(data)
    // hier rufst du now fetchRates auf
    await fetchRates(data.default_currency, Object.keys(data.extra_currencies))

    const { data: latest } = await supabase
      .from('currency_rates')
      .select('updated_at')
      .eq('base_currency', data.default_currency)
      .in('target_currency', Object.keys(data.extra_currencies))
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    if (latest?.updated_at) {
      setSettings((s) => ({ ...s, last_updated: latest.updated_at }))
    }
  }, [id, fetchRates])


  useEffect(() => {
    if (!id) return
    fetchRoomDetails()
    fetchParticipants()
    fetchExpenses()
    fetchTransfers()
    fetchSettings()
  }, [
    id,
    fetchRoomDetails,
    fetchParticipants,
    fetchExpenses,
    fetchTransfers,
    fetchSettings
  ])
  
  useEffect(() => {
    if (!showSettingsModal) return;
    const base = editSettings.default_currency;
    const extras = Object.keys(editSettings.extra_currencies);
    fetchRates(base, extras);
  }, [
     showSettingsModal,
     editSettings.default_currency,
     editSettings.extra_currencies,
     fetchRates,
   ]);
  


  
  // --- Helpers ---
  const formatAmount = (v) => parseFloat(v).toFixed(2);
  const formatDate = (dt) =>
    new Date(dt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  const findName = (pid) => participants.find((p) => p.id === pid)?.name || '–';
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  
  // --- Calculator ---
  // open the calc for a given participant
  const openCalc = (pid) => {
    setCurrentCalcParticipant(pid);
    setCalcExpr(formulas[pid] || '');
    setShowCalcModal(true);
  };

  // confirm & save
  const handleCalcConfirm = () => {
    const parser = new Parser();
    try {
      const val = parser.evaluate(calcExpr || '0');
      if (typeof val !== 'number' || Number.isNaN(val)) throw new Error();
      setFormulas(f => ({ ...f, [currentCalcParticipant]: calcExpr }));
      setShowCalcModal(false);
    } catch {
      openInfo('Ungültige Rechnung');
    }
  };

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


// --- Expense Actions ---
async function addExpense() {
  if (!newExpenseTitle || !newExpenseAmount || !payerId) {
    return openInfo('Bitte Titel, Betrag und Zahler angeben.');
  }
  const total = parseFloat(newExpenseAmount);

  // 1) Validate PERCENTAGE
  if (distributionType === 'PERCENTAGE') {
    const sumPct = Object.values(percentages).reduce((s, v) => s + Number(v), 0);
    if (sumPct !== 100) {
      return openInfo('Summe der Prozente muss genau 100 % betragen.');
    }
  }

  // 2) Validate FIXED
  if (distributionType === 'FIXED') {
    const sumAmt = parseFloat(
      Object.values(amounts).reduce((s, a) => s + Number(a), 0).toFixed(2)
    );
    if (sumAmt !== total) {
      return openInfo('Einzelbeträge müssen genau dem Gesamtbetrag entsprechen.');
    }
  }

  // 3) Pre-validate BILL_SPLIT
  let billed; 
  if (distributionType === 'BILL_SPLIT') {
    const parser = new Parser();
    billed = participants.map(p => {
      const expr = formulas[p.id] || '0';
      let raw;
      try {
        raw = parser.evaluate(expr);
        if (typeof raw !== 'number' || Number.isNaN(raw)) throw new Error();
      } catch {
        throw new Error(`Ungültige Formel für ${findName(p.id)}`);
      }
      return { pid: p.id, raw };
    });
    // sum raw values, then round once
    const sumRaw = billed.reduce((acc, x) => acc + x.raw, 0);
    if (parseFloat(sumRaw.toFixed(2)) !== total) {
      return openInfo('Summe der Formeln muss dem Gesamtbetrag entsprechen.');
    }
  }

  // 4) Currency conversion
  const rate = newExpenseCurrency === settings.default_currency
    ? 1
    : rates[newExpenseCurrency] || 1;
  const converted = parseFloat((total / rate).toFixed(2));

  // 5) Insert expense
  const { data: exp, error: expError } = await supabase
    .from('expenses')
    .insert([{
      room_id:          id,
      title:            newExpenseTitle,
      amount:           converted,
      original_amount:  total,
      original_currency:newExpenseCurrency,
      converted_amount: converted,
      paid_by:          payerId,
      distribution_type:distributionType
    }])
    .select()
    .single();
  if (expError || !exp) {
    return openInfo('Fehler beim Speichern der Ausgabe.');
  }
  
  

  // 6) Build shares
  const makeShare = (pid, amt, pct) => ({
    expense_id:    exp.id,
    participant_id: pid,
    share_amount:  amt,
    ...(pct != null && { share_percent: pct })
  });
  const parser = new Parser();
  let shares = [];

  switch (distributionType) {
    case 'EQUAL_ALL':
      shares = participants.map(p =>
        makeShare(p.id, parseFloat((converted / participants.length).toFixed(2)))
      );
      break;

    case 'EQUAL_SOME':
      shares = selectedParticipants.map(pid =>
        makeShare(pid, parseFloat((converted / selectedParticipants.length).toFixed(2)))
      );
      break;

    case 'PERCENTAGE':
      shares = Object.entries(percentages).map(([pid, pct]) =>
        makeShare(pid, parseFloat(((converted * pct) / 100).toFixed(2)), Number(pct))
      );
      break;

    case 'FIXED':
      shares = Object.entries(amounts).map(([pid, amt]) =>
        makeShare(pid, parseFloat((amt / rate).toFixed(2)))
      );
      break;

    case 'BILL_SPLIT':
      shares = billed.map(x =>
        makeShare(x.pid, parseFloat(x.raw.toFixed(2)))
      );
      break;

    default:
      break;
  }

  // 7) Insert shares
  if (shares.length) {
    const { error: shareError } = await supabase
      .from('expense_shares')
      .insert(shares);
    if (shareError) {
      return openInfo('Fehler beim Speichern der Anteile.');
    }
  }
  
  //last_activity updaten
  await supabase
  .from('rooms')
  .update({ last_activity: new Date().toISOString() })
  .eq('id', id);


  // 8) Cleanup & refresh
  setNewExpenseTitle('');
  setNewExpenseAmount('');
  setPayerId('');
  setDistributionType('EQUAL_ALL');
  setSelectedParticipants([]);
  setPercentages({});
  setAmounts({});
  setFormulas({});
  fetchExpenses();
  setShowExpenseModal(false);
}


  const deleteExpense = eid => openConfirm(
  'Ausgabe löschen?',
  async () => {
    await supabase.from('expenses').delete().eq('id', eid);
    await supabase
      .from('rooms')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', id);
    fetchExpenses();
  }
);


// --- Transfer Actions ---
const completeTransfer = (from, to, amount) => openConfirm(
  `Bestätige: ${findName(from)} hat ${amount} € an ${findName(to)} überwiesen?`,
  async () => {
    // 1) Transfer anlegen
    await supabase
      .from('transfers')
      .insert([{ room_id: id, from_id: from, to_id: to, amount }]);

    // 2) last_activity updaten
    await supabase
      .from('rooms')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', id);

    // 3) Daten neu laden
    fetchTransfers();
    fetchExpenses();
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
    if (!list.length) {
      return (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
            <FaMoneyBillWave className="text-2xl text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-emerald-800 dark:text-emerald-200 font-medium">
            Keine offenen Schulden 🎉
          </p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
            Alle Ausgaben sind bereits ausgeglichen
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {list.map((e, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <FaMoneyBillTransfer className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {findName(e.from)} → {findName(e.to)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(new Date())}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatAmount(e.amount)} {settings.default_currency}
                  </div>
                </div>
              </div>
              <button
                onClick={() => completeTransfer(e.from, e.to, e.amount)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <FaMoneyBillWave />
                Begleichen
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
	const isExpired =
    deletionScheduledAt !== null &&
    deletionScheduledAt.getTime() < now;
  
async function handleExtend() {
  const nowIso = new Date().toISOString()
  const updates = {
    last_activity: nowIso,
    marked_for_deletion: false,
    deletion_scheduled_at: null,
  }
  const { error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('Error extending room:', error)
    return openInfo('Fehler beim Verlängern.')
  }
  // Lokaler State
  setLastActivity(new Date(nowIso))
  setMarkedForDeletion(false)
  setDeletionScheduledAt(null)
  openInfo('Raum um 14 Tage verlängert.')
}

// 2) Banner berechnen
// 1) Banner-Inhalt
let banner = null
if (lastActivity) {
  const daysInactive = Math.floor((now - lastActivity.getTime()) / (1000*60*60*24))
  if (daysInactive >= 14 && !markedForDeletion) {
    banner = (
      <>
        <div>Dieser Raum scheint seit <strong>{daysInactive}</strong> Tagen inaktiv zu sein. 
        Er wird in 14 Tagen gelöscht.{' '}</div>
        <button onClick={handleExtend} className={styles.btnExtend}>
          Raum verlängern <FaLongArrowAltRight />
        </button>
      </>
    )
  } else if (markedForDeletion && deletionScheduledAt) {
    const daysLeft = Math.ceil((deletionScheduledAt.getTime() - now)/(1000*60*60*24))
    banner = (
      <>
        <div>Dieser Raum wird in <strong>{daysLeft}</strong> Tagen gelöscht.{' '}</div>
        <button onClick={handleExtend} className={styles.btnExtend}>
          Raum verlängern <FaLongArrowAltRight />
        </button>
      </>
    )
  }
}


  // --- Early Returns ---
  if (!id) return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
  </div>;

  if (isExpired) {
    return (
      <PageLayout showBack={false}>
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Dieser Raum ist abgelaufen ⏳
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Leider kannst du ihn nicht mehr nutzen.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Zur Startseite
          </button>
        </div>
      </PageLayout>
    );
  }
  


  // --- Render ---
  const history = [...expenses.map(e => ({ type:'expense', date:e.date, data:e })), ...transfers.map(t=>({ type:'transfer', date:t.date, data:t }))]
    .sort((a,b) => new Date(b.date) - new Date(a.date));
    


 return (
  <PageLayout>
    {/* Inactivity Banner */}
    {banner && (
      <div className={`px-4 py-3 ${markedForDeletion ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="text-gray-800 dark:text-gray-200">
            {banner}
          </div>
          <button
            onClick={handleExtend}
            className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Raum verlängern <FaLongArrowAltRight className="ml-2" />
          </button>
        </div>
      </div>
    )}

    {/* Main Content */}
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <HeaderCard
        roomName={roomName}
        participants={participants}
        totalExpenses={totalExpenses}
        settings={settings}
        id={id}
        setRoomName={setRoomName}
        openPrompt={openPrompt}
        openInfo={openInfo}
        setManageNames={setManageNames}
        setShowManageModal={setShowManageModal}
        formatAmount={formatAmount}
      />

      {/* Toolbar */}
      <div className="flex items-stretch gap-2 mb-6 mx-1.5">
        <button
          onClick={() => {
            setEditSettings({ ...settings });
            setShowSettingsModal(true);
          }}
          className="text-sm inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow whitespace-nowrap"
        >
          <FaArrowRightArrowLeft /> Währungen
        </button>

        <button
          onClick={() => router.push(`/room/${id}/stats`)}
          className="text-sm flex items-center justify-center p-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow flex-1"
        >
          <FaChartBar className="text-gray-600 dark:text-gray-300" />
        </button>

        <button
          onClick={() => document.getElementById('optimized')?.scrollIntoView({ behavior: 'smooth' })}
          className="text-sm inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow whitespace-nowrap"
        >
          Rückzahlungen <FaLongArrowAltDown />
        </button>
      </div>

      {/* Expenses and Settlements */}
      <ExpensesAndSettlements
        history={history}
        setShowExpenseModal={setShowExpenseModal}
        deleteExpense={deleteExpense}
        deleteTransfer={deleteTransfer}
        formatDate={formatDate}
        findName={findName}
        formatAmount={formatAmount}
        settings={settings}
        optimize={optimize}
        completeTransfer={completeTransfer}
      />
    </div>

    {/* Expiry Info */}
    {expiresAt && (
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Raum-ID: {id}
          </div>
          <div className="flex items-center gap-2">
            <Image
              src="/logozf.svg"
              alt="Zebrafrog Logo"
              width={32}
              height={32}
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">2025 Zebrafrog</span>
          </div>
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
      <div className="space-y-4">
        <input
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Name"
          value={newName}
          maxLength={14}
          onChange={e => setNewName(e.target.value)}
        />
        <button 
          onClick={addParticipant}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <FaPlus /> Hinzufügen
        </button>
      </div>
    </Modal>

    {/* 2) Manage Participants */}
    <Modal
      isOpen={showManageModal}
      onClose={() => setShowManageModal(false)}
      title="Personen verwalten"
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Neue Person hinzufügen"
            value={newName}
            maxLength={14}
            onChange={e => setNewName(e.target.value)}
          />
          <button 
            onClick={addParticipant}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <FaPlus />
          </button>
        </div>
        <div className="space-y-2">
          {participants.map(p => (
            <div key={p.id} className="flex gap-2">
              <input
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={manageNames[p.id] || ''}
                onChange={e => setManageNames(m => ({ ...m, [p.id]: e.target.value }))}
              />
              <button
                onClick={() => handleDeleteClick(p)}
                className="px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <FaTrashAlt />
              </button>
            </div>
          ))}
        </div>
        <div className="text-right">
          <button
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
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Speichern
          </button>
        </div>
      </div>
    </Modal>

    {/* 3) New Expense */}
    <Modal
      isOpen={showExpenseModal}
      onClose={() => setShowExpenseModal(false)}
      title="Neue Ausgabe"
    >
      <div className="space-y-4">
        <input
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Titel"
          value={newExpenseTitle}
          onChange={e => setNewExpenseTitle(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            type="text"
            inputMode="decimal"
            placeholder="Betrag"
            value={newExpenseAmount}
            onChange={e => {
              const cleanValue = e.target.value.replace(',', '.')
              setNewExpenseAmount(cleanValue)
            }}
          />
          <select
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            value={newExpenseCurrency}
            onChange={e => setNewExpenseCurrency(e.target.value)}
          >
            <option value={settings.default_currency}>{settings.default_currency}</option>
            {Object.keys(settings.extra_currencies).map(cur => (
              <option key={cur} value={cur}>{cur}</option>
            ))}
          </select>
        </div>
        <select
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          value={payerId}
          onChange={e => setPayerId(e.target.value)}
        >
          <option value="">Wer hat bezahlt?</option>
          {participants.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          value={distributionType}
          onChange={e => setDistributionType(e.target.value)}
        >
          <option value="EQUAL_ALL">Gleich (alle)</option>
          <option value="EQUAL_SOME">Gleich (ausgewählt)</option>
          <option value="PERCENTAGE">Prozentual</option>
          <option value="FIXED">Festbeträge</option>
          <option value="BILL_SPLIT">Rechnung aufteilen</option>
        </select>

        {distributionType === 'EQUAL_SOME' && (
          <div className="grid grid-cols-2 gap-2">
            {participants.map(p => (
              <label key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedParticipants.includes(p.id)}
                  onChange={() => setSelectedParticipants(s =>
                    s.includes(p.id) ? s.filter(x => x !== p.id) : [...s, p.id]
                  )}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-gray-700 dark:text-gray-300">{p.name}</span>
              </label>
            ))}
          </div>
        )}

        {distributionType === 'PERCENTAGE' && (
          <>
            <div className="space-y-2">
              {participants.map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="text-gray-700 dark:text-gray-300 flex-1">{p.name}</span>
                  <input
                    className="w-24 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    type="text"
                    inputMode="decimal"
                    placeholder="%"
                    value={percentages[p.id] || ''}
                    onChange={e => {
                      const cleanValue = e.target.value.replace(',', '.')
                      setPercentages(m => ({ ...m, [p.id]: cleanValue }))
                    }}
                  />
                  <span className="text-gray-500 dark:text-gray-400">%</span>
                </div>
              ))}
            </div>
            <div className={`text-sm text-center p-2 rounded-lg ${
              Object.values(percentages).reduce((s, v) => s + Number(v), 0) === 100
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
              {Object.values(percentages).reduce((s, v) => s + Number(v), 0)}% von 100%
            </div>
          </>
        )}

        {distributionType === 'FIXED' && (
          <>
            <div className="space-y-2">
              {participants.map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="text-gray-700 dark:text-gray-300 flex-1">{p.name}</span>
                  <input
                    className="w-32 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    type="text"
                    inputMode="decimal"
                    placeholder={newExpenseCurrency}
                    value={amounts[p.id] || ''}
                    onChange={e => {
                      const cleanValue = e.target.value.replace(',', '.')
                      setAmounts(m => ({ ...m, [p.id]: cleanValue }))
                    }}
                  />
                  <span className="text-gray-500 dark:text-gray-400">{newExpenseCurrency}</span>
                </div>
              ))}
            </div>
            <div className={`text-sm text-center p-2 rounded-lg ${
              parseFloat(Object.values(amounts).reduce((s, a) => s + Number(a), 0).toFixed(2)) === parseFloat(newExpenseAmount)
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
              {parseFloat(Object.values(amounts).reduce((s, a) => s + Number(a), 0).toFixed(2)).toFixed(2)} {newExpenseCurrency} von {parseFloat(newExpenseAmount).toFixed(2)} {newExpenseCurrency}
            </div>
          </>
        )}

        {distributionType === 'BILL_SPLIT' && (
          <>
            <div className="space-y-2">
              {participants.map(p => {
                let value = 0;
                try {
                  value = new Parser().evaluate(formulas[p.id] || '0');
                } catch {}
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="text-gray-700 dark:text-gray-300 flex-1">{p.name}</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {value.toFixed(2)} {newExpenseCurrency}
                    </span>
                    <button
                      onClick={() => openCalc(p.id)}
                      className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      <FaCalculator />
                    </button>
                  </div>
                );
              })}
            </div>
            {(() => {
              const total = parseFloat(newExpenseAmount || 0);
              let sum = 0;
              const parser = new Parser();
              participants.forEach(p => {
                try {
                  sum += Number(parser.evaluate(formulas[p.id] || '0'));
                } catch {}
              });
              sum = parseFloat(sum.toFixed(2));

              let stateClass = 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
              if (sum === total) stateClass = 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
              else stateClass = 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300';

              return (
                <div className={`text-sm text-center p-2 rounded-lg ${stateClass}`}>
                  {sum.toFixed(2)} von {total.toFixed(2)} {newExpenseCurrency}
                </div>
              );
            })()}
          </>
        )}

        <button
          onClick={addExpense}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <FaPlus /> Hinzufügen
        </button>
      </div>
    </Modal>

    {/* 4) Confirm Dialog */}
    <Modal
      isOpen={showConfirmModal}
      onClose={() => setShowConfirmModal(false)}
      title="Bestätigen"
    >
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">{confirmMessage}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Ja
          </button>
          <button
            onClick={() => setShowConfirmModal(false)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Nein
          </button>
        </div>
      </div>
    </Modal>

    {/* 5) Prompt Dialog */}
    <Modal
      isOpen={showPromptModal}
      onClose={() => setShowPromptModal(false)}
      title="Eingabe erforderlich"
    >
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">{promptMessage}</p>
        <input
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          value={promptValue}
          onChange={e => setPromptValue(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={handlePrompt}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Speichern
          </button>
          <button
            onClick={() => setShowPromptModal(false)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </Modal>

    {/* 6) Info Dialog */}
    <Modal
      isOpen={showInfoModal}
      onClose={() => setShowInfoModal(false)}
      title="Hinweis"
    >
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">{infoMessage}</p>
        <div className="flex justify-end">
          <button
            onClick={() => setShowInfoModal(false)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Verstanden
          </button>
        </div>
      </div>
    </Modal>

    {/* 7) Delete Participant */}
    <Modal
      isOpen={showDeleteModal}
      onClose={() => setShowDeleteModal(false)}
      title="Person löschen?"
    >
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          Willst du <strong>{currentPart?.name}</strong> wirklich löschen?
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={deleteParticipant}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Ja
          </button>
          <button
            onClick={() => setShowDeleteModal(false)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Nein
          </button>
        </div>
      </div>
    </Modal>

    {/* 8) Rename Participant */}
    <Modal
      isOpen={showRenameModal}
      onClose={() => setShowRenameModal(false)}
      title="Person umbenennen"
    >
      <div className="space-y-4">
        <input
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          value={renameValue}
          onChange={e => setRenameValue(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={renameParticipant}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Speichern
          </button>
          <button
            onClick={() => setShowRenameModal(false)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </Modal>

    {/* 9) Settings */}
    <Modal
      isOpen={showSettingsModal}
      onClose={() => setShowSettingsModal(false)}
      title="Währungenseinstellungen"
    >
      <div className="space-y-6">
        <div>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Standardwährung:</strong> {settings.default_currency}
          </p>
        </div>

        <div>
          <p className="text-gray-700 dark:text-gray-300 mb-2">Zusätzliche Währungen:</p>
          <div className="grid grid-cols-2 gap-2">
            {['EUR','USD','PLN','GBP','CHF','CZK','HUF','SEK','NOK','DKK']
              .filter(cur => cur !== settings.default_currency)
              .map(cur => (
                <label key={cur} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
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
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{cur}</span>
                </label>
              ))}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <p className="font-medium text-gray-900 dark:text-white mb-2">
            Aktuelle Wechselkurse
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            1 {editSettings.default_currency} =
          </p>
          <div className="space-y-1">
            {Object.entries(rates).map(([cur, r]) => (
              <div key={cur} className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>{r.toFixed(2)}</span>
                <span>{cur}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Wechselkurse werden automatisch aktualisiert.​{' '}
          {settings.last_updated
            ? `Letzte Aktualisierung am ${new Date(settings.last_updated).toLocaleDateString('de-DE')}.`
            : ' '}
        </p>

        <button
          onClick={async () => {
            const { error } = await supabase
              .from('room_settings')
              .upsert({
                room_id: id,
                default_currency: settings.default_currency,
                extra_currencies: editSettings.extra_currencies,
                auto_update: true
              });
            if (error) openInfo('Fehler beim Speichern der Einstellungen.');
            else {
              setSettings(s => ({ ...s, extra_currencies: editSettings.extra_currencies }));
              setShowSettingsModal(false);
            }
          }}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Speichern
        </button>
      </div>
    </Modal>

    {/* Calculator Modal */}
    <Modal
      isOpen={showCalcModal}
      onClose={() => setShowCalcModal(false)}
      title={`Rechnung für ${findName(currentCalcParticipant)}`}
    >
      <div className="space-y-4">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-right text-2xl font-mono text-gray-900 dark:text-white">
          {calcExpr || '0'}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            '7','8','9','/',
            '4','5','6','*',
            '1','2','3','-',
            '0','.','DEL','+',
            '(',')','C','OK'
          ].map(key => {
            const isOp = ['/', '*', '-', '+', '(', ')', 'C', 'DEL'].includes(key);
            const isOk = key === 'OK';
            return (
              <button
                key={key}
                className={`
                  p-3 rounded-lg text-lg font-medium transition-colors
                  ${isOp ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600' : ''}
                  ${isOk ? 'bg-indigo-600 text-white hover:bg-indigo-700' : ''}
                  ${!isOp && !isOk ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}
                `}
                onClick={() => {
                  if (key === 'C') return setCalcExpr('');
                  if (key === 'DEL') return setCalcExpr(expr => expr.slice(0, -1));
                  if (key === 'OK') return handleCalcConfirm();
                  setCalcExpr(expr => expr + key);
                }}
              >
                {key === 'DEL' ? '⌫' : key}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>

  </PageLayout>
);
}

