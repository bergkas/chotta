import { FaPen } from 'react-icons/fa';

export default function MetaHeaderCard({ username, onUsernameChange }) {
  return (
    <div className="mb-8 animate-fadeIn">
      <h1 className="text-2xl font-medium text-gray-900 dark:text-white">
        {getGreeting()},
      </h1>
      <div className="flex items-center gap-2 group">
        <h2 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700 bg-clip-text text-transparent group-hover:from-indigo-500 group-hover:to-indigo-600 transition-all duration-300">
          {username}
        </h2>
        <button
          onClick={onUsernameChange}
          className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 hover:scale-110"
        >
          <FaPen />
        </button>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
} 