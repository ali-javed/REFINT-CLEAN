'use client';

import { useEffect, useState } from 'react';
import { getBrowserSupabaseClient } from '@/utils/supabase/browser';
import UserMenu from './UserMenu';
import type { Session } from '@supabase/supabase-js';

export default function Header() {
  const [session, setSession] = useState<Session | null>(null);
  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <header className="fixed top-0 right-0 z-50 p-4">
      {session ? (
        <UserMenu 
          userName={session.user.email?.split('@')[0] || 'User'} 
          userEmail={session.user.email || ''}
        />
      ) : (
        <a
          href="/signin"
          className="rounded-full border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-sm font-medium text-zinc-300 backdrop-blur-sm transition hover:border-zinc-500 hover:text-zinc-100"
        >
          Sign in
        </a>
      )}
    </header>
  );
}
