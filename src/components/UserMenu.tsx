'use client';

import { useState } from 'react';
import { getBrowserSupabaseClient } from '@/utils/supabase/browser';

interface UserMenuProps {
  userName: string;
  userEmail: string;
}

export default function UserMenu({ userName, userEmail }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const supabase = getBrowserSupabaseClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full border border-violet-700 bg-violet-600/20 px-4 py-2 text-sm font-medium text-violet-300 backdrop-blur-sm transition hover:bg-violet-600/30 flex items-center gap-2"
      >
        <span>{userName}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl z-20">
            <div className="px-4 py-3 border-b border-zinc-800">
              <p className="text-sm font-medium text-zinc-100">{userName}</p>
              <p className="text-xs text-zinc-400 truncate">{userEmail}</p>
            </div>
            <div className="py-1">
              <a
                href="/dashboard"
                className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition"
              >
                📊 Dashboard
              </a>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-800 transition"
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
