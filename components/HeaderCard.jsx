import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FaPen, FaPlus, FaRegCopy } from 'react-icons/fa';

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
  formatAmount
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
      className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-700 rounded-xl shadow-lg p-4 mb-4 relative overflow-hidden animate-fadeIn"
    >
      {/* Simple dot pattern background - mobile friendly */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] bg-[size:16px_16px]"></div>
      </div>
      
      {/* Animated gradient overlay - subtle movement */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: `linear-gradient(${wavePhase * 3.6}deg, rgba(255,255,255,0.1) 0%, rgba(85, 0, 255, 0.59) 50%, rgba(255,255,255,0.1) 100%)`,
          transition: 'background 0.5s ease-out'
        }}
      />
      
      {/* Logo with simple fade effect */}
      <div className="absolute top-4 right-4 opacity-75 transition-opacity duration-300">
        <Image
          src="/chotty_logo_full_white.svg"
          alt="Chotty Logo"
          width={90}
          height={56}
          className="drop-shadow-md"
        />
      </div>

      {/* Room name with improved edit button */}
      <div className="flex items-center gap-2 mb-4 mt-1">
        <h1 className="text-2xl font-bold text-white flex-1 transition-colors duration-300">
          {roomName}
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
            className="ml-2 inline-flex items-center justify-center h-6 w-6 rounded-full bg-white/10 text-white/80 hover:text-white hover:bg-white/20 active:bg-white/30 transition-all duration-200"
            aria-label="Edit room name"
          >
            <FaPen className="text-xs" />
          </button>
        </h1>
      </div>

      {/* Participants with improved mobile styling */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {participants.map((p) => (
          <span
            key={p.id}
            className="px-2.5 py-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full text-white text-sm active:bg-white/25 transition-all duration-200"
          >
            {p.name}
          </span>
        ))}
        <button
          onClick={() => {
            setManageNames(Object.fromEntries(participants.map(p => [p.id, p.name])));
            setShowManageModal(true);
          }}
          className="px-2.5 py-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full text-white text-sm active:bg-white/25 transition-all duration-200 flex items-center"
          aria-label="Add participant"
        >
          <FaPlus className="text-xs" />
        </button>
      </div>

      {/* Summary Row with glass effect - mobile optimized */}
      <div 
        className="flex items-center justify-between text-white rounded-lg p-2 mt-2 relative"
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
          <span className="text-xs text-white/80">Ausgaben</span>
          <strong className="text-base">
            {formatAmount(totalExpenses)} {settings.default_currency}
          </strong>
        </div>
        
        <button
          onClick={() => {
            navigator.clipboard.writeText(id);
            openInfo('Raum-ID kopiert!');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/90 active:bg-white/20 text-sm transition-colors duration-200"
        >
          <FaRegCopy /> Raum-ID
        </button>
      </div>
    </div>
  );
};

export default HeaderCard;