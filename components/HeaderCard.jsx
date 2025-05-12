import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FaPen, FaPlus, FaRegCopy, FaChevronDown } from 'react-icons/fa';
import { Tooltip } from 'react-tooltip';
import { supabase } from '../lib/supabase';

const HeaderCard = ({ 
  roomName, 
  participants, 
  totalExpenses, 
  settings, 
  id, 
  setRoomName, 
  openPrompt, 
  openInfo, 
  setManageNames, 
  setShowManageModal,
  formatAmount,
  offeneSchulden
}) => {
  // For the subtle wave animation in the background
  const [wavePhase, setWavePhase] = useState(0);
  
  // Animate the wave background with minimal performance impact
  useEffect(() => {
    const interval = setInterval(() => {
      setWavePhase(prev => (prev + 0.5) % 100);
    }, 100); // Slower animation for better performance
    
    return () => clearInterval(interval);
  }, []);




  return (
    <div
      className="bg-gradient-to-br from-indigo-600/90 via-indigo-500/90 to-indigo-700/90 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden mb-6"
    >


      
      {/* Visible glow effect around the edges */}
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
        className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 opacity-5 pointer-events-none select-none"
        style={{ zIndex: 1 }}
      />
  
      {/* Room name with improved edit button and visible hover effect */}
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <h1 className="text-2xl font-bold text-white flex-1 group">
          <span className="relative z-10">{roomName}</span>
          <button
            onClick={() => openPrompt('Neuer Raumname:', roomName, async v => {
              if (!v) return;
              const { error } = await supabase
                .from('rooms')
                .update({ name: v })
                .eq('id', id);
              if (!error) setRoomName(v);
              else openInfo('Fehler beim Ändern des Raumnamens.');
            })}
            className="ml-2 inline-flex items-center justify-center h-6 w-6 rounded-full bg-white/20 text-white hover:bg-white/30 active:bg-white/40 transition-all duration-200 hover:shadow-lg hover:shadow-white/20"
            aria-label="Edit room name"
          >
            <FaPen className="text-xs" />
          </button>
        </h1>
      </div>
  
      {/* Participants  */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {participants.map((p) => (
          <span
            key={p.id}
            className="px-2.5 py-1 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full text-white text-sm"
          >
            {p.name}
          </span>
        ))}
        <button
          onClick={() => {
            setManageNames(Object.fromEntries(participants.map(p => [p.id, p.name])));
            setShowManageModal(true);
          }}
          className="px-2.5 py-1.5  backdrop-blur-sm border border-purple-300/30 rounded-full text-white text-sm hover:bg-purple-500/60 hover:shadow-lg hover:shadow-purple-500/30 active:bg-purple-600/60 transition-all duration-200 flex items-center gap-1" 
          
          aria-label="Add participant"
        >
          <FaPlus className="text-xs" />
          
        </button>
      </div>
  
      {/* Summary Row with glass effect and both metrics */}
      <div 
        className="flex items-center justify-between text-white rounded-lg p-2 mt-2 relative group overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.15)',
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 2px 8px rgba(0, 0, 0, 0.15)'
        }}
      >
        <div className="flex flex-col relative z-10">
          <span className="text-xs text-white/80">Ausgaben</span>
          <strong className="text-base bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
            {formatAmount(totalExpenses)} {settings.default_currency}
          </strong>
        </div>
        {offeneSchulden !== undefined && (
          <div className="flex flex-col items-end relative z-10">
            <span className="text-xs text-white/80">Offene Schulden</span>
            <button
              onClick={() => {
                const el = document.getElementById('optimized');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-1 text-base font-semibold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-emerald-200 hover:text-emerald-200 focus:outline-none transition-colors"
              style={{ cursor: 'pointer' }}
              title="Zu Rückzahlungen scrollen"
            >
              {formatAmount(offeneSchulden)} {settings.default_currency}
              <FaChevronDown className="text-emerald-400 ml-1" />
            </button>
          </div>
        )}
      </div>
  
      <Tooltip id="room-id-tooltip" />

    </div>
  );
}

export default HeaderCard;