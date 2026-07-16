import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';

export default function AdminPrompt() {
  const { isAdmin, setAdminMode } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (isAdmin && !sessionStorage.getItem("adminPromptShown")) {
      setShowPrompt(true);
    }
  }, [isAdmin]);

  const handleChoice = (isDevMode: boolean) => {
    setAdminMode(isDevMode);
    sessionStorage.setItem("adminPromptShown", "true");
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl text-center animate-fade-in-up">
        <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome, Admin!</h2>
        <p className="text-gray-600 mb-8">Choose how you want to use the application for this session.</p>
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => handleChoice(true)} 
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-sm transition-colors text-lg"
          >
            Developer Mode (Edit Public Library)
          </button>
          <button 
            onClick={() => handleChoice(false)} 
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Normal User Mode (Private Only)
          </button>
        </div>
      </div>
    </div>
  );
}