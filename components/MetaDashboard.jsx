import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import localforage from 'localforage'
import { supabase } from '../lib/supabase'
import { FaMoon, FaSun,  FaPlusSquare, FaSignInAlt, FaLongArrowAltRight, FaPen } from 'react-icons/fa'
import Image from 'next/image';
import Modal from '../components/Modal';
import { useTheme } from '../contexts/ThemeContext';
import MetaHeaderCard from './MetaHeaderCard'

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

export default function MetaDashboard({ roomId }) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [myRooms, setMyRooms] = useState([])
  const [roomDetails, setRoomDetails] = useState({})
  const [loading, setLoading] = useState(true)
  
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptMessage, setPromptMessage] = useState('');
  const [promptValue, setPromptValue] = useState('');
  const [promptCallback, setPromptCallback] = useState(null);
  
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCurrency, setNewRoomCurrency] = useState('EUR');

  const { darkMode, setDarkMode } = useTheme();

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

        const { data: roomData } = await supabase
          .from('participants')
          .select('room_id, rooms(name)')
          .eq('user_id', roomId)

        // Filter out any rooms with null names or IDs
        const rooms = roomData
          ?.filter(r => r.room_id && r.rooms?.name)
          .map((r) => ({
            id: r.room_id,
            name: r.rooms.name,
          })) || []

        setMyRooms(rooms)

        const allDetails = {}
        await Promise.all(
          rooms.map(async (room) => {
            try {
              const [participants, expenses, settings] = await Promise.all([
                fetchParticipants(room.id),
                fetchExpenses(room.id),
                fetchSettings(room.id),
              ])
              // Only add to details if we have valid data
              if (participants && expenses && settings) {
                allDetails[room.id] = { participants, expenses, settings }
              }
            } catch (error) {
              console.error(`Error fetching details for room ${room.id}:`, error)
            }
          })
        )
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
      .select('*')
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
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

        {/* Room List */}
        {myRooms.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Deine Räume
            </h3>
            {myRooms.map((room, index) => {
              const details = roomDetails[room.id]
              if (!details?.participants) return null
              return (
                <div
                  key={room.id}
                  onClick={() => router.push(`/room/${room.id}`)}
                  className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-700 rounded-xl shadow-lg p-4 relative overflow-hidden group cursor-pointer animate-fadeIn hover:shadow-xl transition-all duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Simple dot pattern background */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] bg-[size:16px_16px]"></div>
                  </div>

                  {/* Room Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-bold text-white group-hover:text-indigo-50 transition-colors duration-300">
                      {room.name}
                    </h1>
                    <span className="text-white/80 text-sm">
                      {details.participants.length} {details.participants.length === 1 ? 'Person' : 'Personen'}
                    </span>
                  </div>

                  {/* Participants */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {details.participants.map((p) => (
                      <span
                        key={p.id}
                        className="px-2.5 py-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full text-white text-sm"
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>

                  {/* Summary Row */}
                  <div 
                    className="flex items-center justify-between text-white rounded-lg p-3 relative"
                    style={{
                      background: 'rgba(255,255,255,0.12)',
                      boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {/* Simple gradient accent */}
                    <div 
                      className="absolute inset-0 opacity-30"
                      style={{
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, transparent 100%)',
                        borderRadius: '0.5rem',
                        zIndex: -1
                      }}
                    />
                    
                    <div className="flex flex-col">
                      <span className="text-sm text-white/80">Ausgaben</span>
                      <strong className="text-base">
                        {getTotal(room.id)} {details.settings.default_currency}
                      </strong>
                    </div>
                    
                    <span className="flex items-center gap-1 text-white/90 group-hover:text-white transition-colors duration-300">
                      zum Raum <FaLongArrowAltRight className="transform group-hover:translate-x-1 transition-transform duration-300" />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 animate-fadeIn">
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
                <FaPlusSquare className="animate-pulse" /> Raum erstellen
              </button>
              <button
                onClick={handleJoinRoom}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <FaSignInAlt /> Raum beitreten
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons - Only show if rooms exist */}
        {myRooms.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
            <button
              onClick={openCreateRoomModal}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-500 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <FaPlusSquare className="animate-pulse" /> Raum erstellen
            </button>
            <button
              onClick={handleJoinRoom}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <FaSignInAlt /> Raum beitreten
            </button>
          </div>
        )}
      </main>


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
    </div>
  )
}
