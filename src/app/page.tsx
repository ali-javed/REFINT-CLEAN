'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import UploadForm from '@/components/UploadForm';
import { getBrowserSupabaseClient } from '@/utils/supabase/browser';

export default function HomePage() {
  const supabase = useMemo(() => {
    try {
      return getBrowserSupabaseClient();
    } catch {
      return null;
    }
  }, []);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <main className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center">
      <div className="w-full max-w-xl px-4">
        {session && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 flex items-center justify-between">
            <p className="text-xs text-slate-600">Logged in as <span className="font-semibold">{session.user.email}</span></p>
            <button
              onClick={async () => {
                await supabase?.auth.signOut();
              }}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline"
            >
              Sign out
            </button>
          </div>
        )}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-3">
            Verify references
          </h1>
          <p className="text-sm sm:text-base text-slate-500">
            Upload a PDF and check its reference list in seconds.
          </p>
        </div>

        <div className="border border-slate-200 rounded-2xl shadow-sm px-4 sm:px-6 py-6 sm:py-8">
          <UploadForm />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          No signup required to start. You can sign up after reviewing results.
        </p>
      </div>
    </main>
  );
}
