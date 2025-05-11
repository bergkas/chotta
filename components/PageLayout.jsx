import { useRouter } from 'next/router';
import Image from 'next/image';
import { FaArrowLeft, FaSun, FaMoon } from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';

export default function PageLayout({ children, showBack = true, title = null, showHeader = true }) {
  const router = useRouter();
  const { darkMode, setDarkMode } = useTheme();

  return (
    // Main container with fixed height and scroll behavior
    <div className="flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      
      {/* Sticky Header - Fixed position instead of sticky for better reliability */}
      {showHeader && (
        <header className="fixed top-0 left-0 w-full z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showBack && (
                <button
                  onClick={() => router.back()}
                  aria-label="Go back"
                  className="p-2 rounded-full text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition-all duration-200"
                >
                  <FaArrowLeft size={16} />
                </button>
              )}
              <Image
                src="/chotty_logo_centered_white.svg"
                alt="Chotty Logo"
                width={120}
                height={32}
                className="dark:filter dark:brightness-100 filter brightness-0"
              />
            </div>
            <div className="flex items-center gap-4">
              {title && (
                <h1 className="text-lg font-medium text-gray-800 dark:text-gray-100">{title}</h1>
              )}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <FaSun size={16} /> : <FaMoon size={16} />}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content - Added padding for header and adjusted scroll behavior */}
      <main className={`flex-1 ${showHeader ? 'pt-16' : ''} overflow-y-auto`}>
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer - Modern and clean design */}
      <footer className="mt-auto bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 py-4">
        <div className="max-w-5xl mx-auto px-2">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <Image
                src="/chotty_logo_full.svg"
                alt="Chotty Logo"
                width={80}
                height={24}
                className="opacity-80 hover:opacity-100 transition-opacity duration-300 mb-1.5"
              />
            </div>
            
            <div className="flex items-center gap-0 text-gray-400 dark:text-gray-500">
              <span className="text-xs">by</span>
            </div>
            
            <div className="flex items-center gap-2 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-300">
              <Image
                src="/logozf.svg"
                alt="Zebrafrog Logo"
                width={18}
                height={18}
                className="hover:scale-110 transition-transform duration-300"
              />
              <span className="font-medium">Zebrafrog</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}