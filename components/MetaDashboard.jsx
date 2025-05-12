import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import localforage from 'localforage'
import { supabase } from '../lib/supabase'
import { FaMoon, FaSun, FaPlusSquare, FaSignInAlt, FaLongArrowAltRight, FaPen, FaSignOutAlt, FaArchive, FaUndoAlt } from 'react-icons/fa'
import Image from 'next/image';
import Modal from '../components/Modal';
import { useTheme } from '../contexts/ThemeContext';
import MetaHeaderCard from './MetaHeaderCard'
import Link from 'next/link'

function getGreeting() {
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay()

  const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)]

  if (hour < 5 || hour >= 22) return randomChoice(['Gute Nacht', 'Hallo Nachtschwärmer', 'Na du Nachteule'])
  if (hour < 10) return randomChoice(['Guten Morgen', 'Moin', 'Frischen Morgen'])
  if (hour < 14) return randomChoice(['Servus', 'Grüß dich', 'Hallo', 'Hey', 'Yo'])
  if (hour < 18) return randomChoice(['Mahlzeit', 'Guten Tag', 'Hallöchen'])
  if (hour < 22) return randomChoice(['Guten Abend', 'Nabend', 'Schönen Abend'])
  if (day === 0 || day === 6) return 'Schönes Wochenende'
  return randomChoice(['Guten Tag', 'Hallo', 'Willkommen zurück'])
}

function formatAmount(v) {
  return parseFloat(v).toFixed(2);
}

// Helper to calculate optimized debts (sum of settlements)
function getOptimizedDebts(participants, expenses) {
  // Build net balances
  const net = {};
  participants.forEach(p => net[p.id] = 0);
  expenses.forEach(e => {
    (e.expense_shares || []).forEach(s => {
      const d = s.participant_id, c = e.paid_by, amt = parseFloat(s.share_amount);
      if (d !== c) {
        net[d] = Math.round((net[d] - amt) * 100) / 100;
        net[c] = Math.round((net[c] + amt) * 100) / 100;
      }
    });
  });
  // Find settlements
  const debtors = [], creditors = [];
  Object.entries(net).forEach(([pid, bal]) => {
    if (bal < -0.01) debtors.push({ id: pid, bal });
    else if (bal > 0.01) creditors.push({ id: pid, bal });
  });
  debtors.sort((a,b) => a.bal - b.bal); creditors.sort((a,b) => b.bal - a.bal);
  let total = 0;
  while (debtors.length && creditors.length) {
    const d = debtors[0], c = creditors[0];
    const amt = Math.round(Math.min(-d.bal, c.bal) * 100) / 100;
    if (amt < 0.01) break;
    total += amt;
    d.bal = Math.round((d.bal + amt) * 100) / 100;
    c.bal = Math.round((c.bal - amt) * 100) / 100;
    if (d.bal > -0.01) debtors.shift();
    if (c.bal < 0.01) creditors.shift();
  }
  return total;
}

export default function MetaDashboard({ roomId }) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [myRooms, setMyRooms] = useState([])
  const [archivedRooms, setArchivedRooms] = useState([])
  const [roomDetails, setRoomDetails] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active') // 'active' or 'archived'
  
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptMessage, setPromptMessage] = useState('');
  const [promptValue, setPromptValue] = useState('');
  const [promptCallback, setPromptCallback] = useState(null);
  
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCurrency, setNewRoomCurrency] = useState('EUR');

  const { darkMode, setDarkMode } = useTheme();

  const [showArchiveConfirmModal, setShowArchiveConfirmModal] = useState(false);
  const [roomToArchive, setRoomToArchive] = useState(null);

  useEffect(() => {
    document.body.classList.add('theme')
  }, [])

  useEffect(() => {
    if (!roomId) return
    ;(async () => {
      try {
        const { data: userData } = await supabase
          .from('meta_rooms')
          .select('username')
          .eq('id', roomId)
          .single()
        if (userData) setUsername(userData.username)

        // Fetch all rooms for this user
        const { data: roomData } = await supabase
          .from('participants')
          .select(`
            room_id,
            rooms (
              name
            )
          `)
          .eq('user_id', roomId)

        // Fetch archived rooms for this user
        const { data: archivedData, error: archivedError } = await supabase
          .from('archived_rooms')
          .select('room_id')
          .eq('user_id', roomId)

        if (archivedError) {
          console.error('Error fetching archived rooms:', archivedError);
          return;
        }

        console.log('Archived data:', archivedData);
        const archivedRoomIds = new Set(archivedData?.map(a => a.room_id) || []);
        console.log('Archived room IDs:', Array.from(archivedRoomIds));

        // Split rooms into active and archived
        const activeRooms = roomData
          ?.filter(r => r.room_id && r.rooms?.name && !archivedRoomIds.has(r.room_id))
          .map((r) => ({
            id: r.room_id,
            name: r.rooms.name,
          })) || []

        const archived = roomData
          ?.filter(r => r.room_id && r.rooms?.name && archivedRoomIds.has(r.room_id))
          .map((r) => ({
            id: r.room_id,
            name: r.rooms.name,
          })) || []

        console.log('Processed archived rooms:', archived);

        setMyRooms(activeRooms)
        setArchivedRooms(archived)

        // Fetch details for all rooms
        const allDetails = {}
        console.log('Fetching details for rooms:', [...activeRooms, ...archived].map(r => r.id));
        await Promise.all(
          [...activeRooms, ...archived].map(async (room) => {
            try {
              console.log('Fetching details for room:', room.id);
              const [participants, expenses, settings] = await Promise.all([
                fetchParticipants(room.id),
                fetchExpenses(room.id),
                fetchSettings(room.id),
              ])
              console.log('Room details fetched:', {
                roomId: room.id,
                hasParticipants: !!participants,
                hasExpenses: !!expenses,
                hasSettings: !!settings
              });
              if (participants && expenses && settings) {
                allDetails[room.id] = { participants, expenses, settings }
              }
            } catch (error) {
              console.error(`Error fetching details for room ${room.id}:`, error)
            }
          })
        )
        console.log('All room details:', allDetails);
        setRoomDetails(allDetails)
      } catch (error) {
        console.error('Error fetching meta dashboard data:', error)
      } finally {
        setLoading(false)
      }
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
      .select('*, expense_shares(*)')
      .eq('room_id', id)
    return data || []
  }

  async function fetchSettings(id) {
    const { data } = await supabase
      .from('room_settings')
      .select('default_currency')
      .eq('room_id', id)
      .single()
    return data || { default_currency: 'EUR' }
  }

  function getTotal(roomId) {
    const exps = roomDetails[roomId]?.expenses || []
    return exps.reduce((sum, e) => sum + (e.amount || 0), 0).toFixed(2)
  }

  function openCreateRoomModal() {
    setNewRoomName('');
    setNewRoomCurrency('EUR');
    setShowCreateRoomModal(true);
  }

  async function handleCreateRoom() {
    if (!newRoomName) return;
    const { data: newRoom, error } = await supabase
      .from('rooms')
      .insert([{ name: newRoomName }])
      .select('id')
      .single();
    if (error) {
      alert('Fehler beim Erstellen');
      return;
    }
    // Teilnehmer hinzufügen
    await supabase.from('participants').insert([
      { room_id: newRoom.id, user_id: roomId, name: username }
    ]);
    // Settings mit Standardwährung anlegen
    await supabase.from('room_settings').insert({
      room_id:         newRoom.id,
      default_currency: newRoomCurrency,
      extra_currencies: {}
    });
    router.push(`/room/${newRoom.id}`);
  }

  async function handleJoinRoom() {
    openPrompt('Raum-ID zum Beitreten:', '', async (joinId) => {
      if (!joinId) return;

      const { data: room, error } = await supabase
        .from('rooms')
        .select('id')
        .eq('id', joinId)
        .single();

      if (error || !room) {
        openPrompt('Raum nicht gefunden. Bitte überprüfe die ID.', joinId, () => {});
        return;
      }

      const { data: existing } = await supabase
        .from('participants')
        .select('id')
        .eq('room_id', joinId)
        .eq('user_id', roomId);

      if (existing?.length > 0) {
        router.push(`/room/${joinId}`);
        return;
      }

      const { error: joinError } = await supabase
        .from('participants')
        .insert([
          { 
            room_id: joinId, 
            user_id: roomId, 
            name: username 
          }
        ]);

      if (joinError) {
        openPrompt('Fehler beim Beitreten des Raums. Bitte versuche es erneut.', joinId, () => {});
        return;
      }

      router.push(`/room/${joinId}`);
    });
  }

  function openPrompt(message, defaultValue, callback) {
    setPromptMessage(message);
    setPromptValue(defaultValue);
    setPromptCallback(() => callback);
    setShowPromptModal(true);
  }

  function handlePrompt() {
    if (promptCallback) promptCallback(promptValue);
    setShowPromptModal(false);
  }

  // roomId (prop) is the user ID from meta_rooms
  // roomIdToArchive/roomIdToUnarchive is the room's ID
  const handleArchiveRoom = async (roomIdToArchive) => {
    // Check if already archived
    const { data: existing, error: checkError } = await supabase
      .from('archived_rooms')
      .select('id')
      .eq('room_id', roomIdToArchive)
      .eq('user_id', roomId)
      .maybeSingle();
    if (existing) {
      console.warn('Room is already archived.');
      return;
    }
    if (checkError) {
      console.error('Error checking archived room:', checkError);
      return;
    }
    const { error } = await supabase
      .from('archived_rooms')
      .insert([{ 
        room_id: roomIdToArchive,
        user_id: roomId
      }]);
    if (error) {
      console.error('Error archiving room:', error);
      return;
    }
    // Move room from active to archived
    const roomToMove = myRooms.find(r => r.id === roomIdToArchive);
    if (roomToMove) {
      setMyRooms(prev => prev.filter(r => r.id !== roomIdToArchive));
      setArchivedRooms(prev => [...prev, roomToMove]);
    }
    setShowArchiveConfirmModal(false);
    setRoomToArchive(null);
  };

  const handleUnarchiveRoom = async (roomIdToUnarchive) => {
    const { error } = await supabase
      .from('archived_rooms')
      .delete()
      .eq('room_id', roomIdToUnarchive)
      .eq('user_id', roomId);

    if (error) {
      console.error('Error unarchiving room:', error);
      return;
    }

    // Move room from archived to active
    const roomToMove = archivedRooms.find(r => r.id === roomIdToUnarchive);
    if (roomToMove) {
      setArchivedRooms(prev => prev.filter(r => r.id !== roomIdToUnarchive));
      setMyRooms(prev => [...prev, roomToMove]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen  z-0">
      <main className="max-w-2xl mx-auto p-4 sm:p-6">
        <MetaHeaderCard 
          username={username}
          onUsernameChange={() => openPrompt('Neuer Name:', username, async (v) => {
            if (!v) return;
            const { error } = await supabase
              .from('meta_rooms')
              .update({ username: v })
              .eq('id', roomId);
            if (!error) setUsername(v);
            else openPrompt('Fehler beim Ändern des Namens.', v, () => {});
          })}
        />

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'active'
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Aktive Räume
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'archived'
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Archivierte Räume
          </button>
        </div>

        {/* Room List */}
        {(activeTab === 'active' ? myRooms : archivedRooms).length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {activeTab === 'active' ? 'Deine Räume' : 'Archivierte Räume'}
            </h3>
            {(activeTab === 'active' ? myRooms : archivedRooms).map((room, index) => {
              const details = roomDetails[room.id]
              if (!details || !details.participants || !details.settings) {
                console.warn('Skipping room due to missing details:', room.id, details);
                return null;
              }
              const isArchived = activeTab === 'archived';
              return (
                <div
                  key={room.id}
                  {...(!isArchived && { onClick: () => router.push(`/room/${room.id}`) })}
                  className={
                    'bg-gradient-to-br from-indigo-600/90 via-indigo-500/90 to-indigo-700/90 rounded-xl shadow-lg p-4 relative overflow-hidden group animate-fadeIn hover:shadow-xl transition-all duration-300 ' +
                    (isArchived ? 'cursor-not-allowed' : 'cursor-pointer')
                  }
                  title={isArchived ? 'You need to unarchive this room before you can open it again' : undefined}
                >
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                  </div>
                  <div 
                    className="absolute inset-0 opacity-40 pointer-events-none"
                  />
                  {/*  glow effect around the edges */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-x-0 top-0 h-8 bg-white opacity-10 blur-xl"></div>
                    <div className="absolute inset-x-0 bottom-0 h-8 bg-purple-400 opacity-20 blur-xl"></div>
                    <div className="absolute inset-y-0 left-0 w-8 bg-white opacity-10 blur-xl"></div>
                    <div className="absolute inset-y-0 right-0 w-8 bg-purple-400 opacity-20 blur-xl"></div>
                  </div>
                  {/* Coins background image */}
                  <img
                    src="/icon_coins.png"
                    alt=""
                    aria-hidden="true"
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-40 h-40 opacity-10 pointer-events-none select-none"
                    style={{ zIndex: 1 }}
                  />
                  {/* Room Header */}
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <h1 className="text-xl font-bold text-white group-hover:text-indigo-50 transition-colors duration-300">
                      {room.name}
                    </h1>
                    {isArchived ? (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleUnarchiveRoom(room.id);
                        }}
                        className="flex flex-row gap-1 justify-center items-center text-xs text-white-400"
                        title="Un-Archive Room"
                      >
                        <FaUndoAlt />Aktivieren
                      </button>
                    ) : (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleArchiveRoom(room.id);
                        }}
                        className="flex flex-row gap-1 justify-center items-center text-xs text-white-400"
                        title="Raum archivieren"
                      >
                        <FaArchive />Archivieren
                      </button>
                    )}
                  </div>
                  {/* Participants */}
                  <div className="flex flex-wrap gap-1.5 mb-4 relative z-10">
                    {details.participants.map((p) => (
                      <span
                        key={p.id}
                        className="px-2.5 py-1 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full text-white text-sm"
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                  {/* Summary Row */}
                  <div 
                    className="flex items-center justify-between text-white rounded-lg py-1 px-3 relative z-10"
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 2px 8px rgba(0, 0, 0, 0.15)'
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-white/80">Ausgaben</span>
                      <span className="text-base font-semibold text-white">
                        {getTotal(room.id)} {details.settings.default_currency}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-white/80">Offene Schulden</span>
                      <span className="text-base font-semibold text-white">
                        {(() => {
                          const d = details;
                          if (!d || !d.participants || !d.expenses) return '0.00';
                          return formatAmount(getOptimizedDebts(d.participants, d.expenses));
                        })()} {details.settings.default_currency}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 animate-fadeIn">
            {activeTab === 'active' ? (
              <>
                <div className="w-20 h-20 mx-auto mb-4 text-indigo-400 dark:text-indigo-500 animate-bounce">
                  <FaPlusSquare className="w-full h-full" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Du bist in noch keinen Räumen. Erstelle einen neuen oder tritt einem bei!
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <button
                    onClick={openCreateRoomModal}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-500 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <FaPlusSquare /> Raum erstellen
                  </button>
                  <button
                    onClick={handleJoinRoom}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <FaSignInAlt /> Raum beitreten
                  </button>
                </div>
              </>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Keine archivierten Räume vorhanden.
              </p>
            )}
          </div>
        )}

        {/* Action Buttons - Only show if active rooms exist */}
        {activeTab === 'active' && myRooms.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
            <button
              onClick={openCreateRoomModal}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-500 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <FaPlusSquare /> Raum erstellen
            </button>
            <button
              onClick={handleJoinRoom}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <FaSignInAlt /> Raum beitreten
            </button>
          </div>
        )}

        {/* Archive Confirmation Modal */}
        <Modal
          isOpen={showArchiveConfirmModal}
          onClose={() => {
            setShowArchiveConfirmModal(false);
            setRoomToArchive(null);
          }}
          title="Raum archivieren"
        >
          <div className="space-y-4">
            <p className="text-gray-300">
              Möchtest du diesen Raum wirklich archivieren? Du kannst ihn später jederzeit wieder finden.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowArchiveConfirmModal(false);
                  setRoomToArchive(null);
                }}
                className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleArchiveRoom}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Archivieren
              </button>
            </div>
          </div>
        </Modal>

        {/* Modals */}
        <Modal
          isOpen={showPromptModal}
          onClose={() => setShowPromptModal(false)}
          title="Eingabe erforderlich"
        >
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">{promptMessage}</p>
            <input
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                onClick={() => setShowPromptModal(false)}
              >
                Abbrechen
              </button>
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                onClick={handlePrompt}
              >
                Speichern
              </button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={showCreateRoomModal}
          onClose={() => setShowCreateRoomModal(false)}
          title="Neuen Raum erstellen"
        >
          <div className="space-y-4">
            <input
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              placeholder="Raumname"
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Standardwährung
              </label>
              <select
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                value={newRoomCurrency}
                onChange={e => setNewRoomCurrency(e.target.value)}
              >
                {['EUR','USD','PLN','GBP','CHF','CZK','HUF','SEK','NOK','DKK'].map(cur => (
                  <option key={cur} value={cur}>{cur}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Achtung, Standardwährung kann später nicht mehr geändert werden!
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                onClick={() => setShowCreateRoomModal(false)}
              >
                Abbrechen
              </button>
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                onClick={handleCreateRoom}
              >
                Erstellen
              </button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  )
}
