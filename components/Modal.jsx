import { FaTimes } from 'react-icons/fa';
import React from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-gradient-to-br from-indigo-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
          <button 
            className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            onClick={onClose}
          >
            <FaTimes />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}