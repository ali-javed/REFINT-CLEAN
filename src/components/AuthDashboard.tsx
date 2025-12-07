'use client';

import { useEffect, useMemo, useState } from 'react';
import UploadForm from '@/components/UploadForm';
import { getBrowserSupabaseClient } from '@/utils/supabase/browser';
import type { Session } from '@supabase/supabase-js';

export default function AuthDashboard() {
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
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

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);

    if (!email || !password) {
      setStatus('Enter email and password to continue.');
      return;
    }

    // Redirect to signup disabled page
    window.location.href = '/signup-disabled';
  }

  function handleSignOut() {
    supabase.auth.signOut();
  }

  return (
    <div className="w-full max-w-xl px-4">
      <div className="text-center mb-6">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-3">
          Verify references
        </h1>
        <p className="text-sm sm:text-base text-slate-500">
          Upload a PDF and check its reference list in seconds.
        </p>
      </div>

      {session ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-700 truncate">Signed in as {session.user.email}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs font-semibold text-violet-700 hover:text-violet-900"
            >
              Sign out
            </button>
          </div>

          <div className="border border-slate-200 rounded-2xl shadow-sm px-4 sm:px-6 py-6 sm:py-8">
            <UploadForm />
          </div>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-2xl shadow-sm px-4 sm:px-6 py-6 sm:py-8 bg-white">
          <form className="space-y-4" onSubmit={handleSignUp}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full inline-flex items-center justify-center rounded-full border border-slate-900 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {authLoading ? 'Signing up…' : 'Sign up to view dashboard'}
            </button>
            {status && <p className="text-xs text-slate-500 text-center">{status}</p>}
          </form>
          <p className="mt-4 text-xs text-slate-400 text-center">
            Already signed up? Use the same email/password and you will enter the dashboard.
          </p>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-slate-400">
        Secure sign-up powered by Supabase. After signing in, you will see your dashboard here.
      </p>
    </div>
  );
}
