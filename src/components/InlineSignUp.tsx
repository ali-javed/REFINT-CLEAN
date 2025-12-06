'use client';

import { useEffect, useState } from 'react';
import { getBrowserSupabaseClient } from '@/utils/supabase/browser';
import type { SupabaseClient, Session } from '@supabase/supabase-js';

interface InlineSignUpProps {
  onAuthSuccess?: (session: Session) => void;
}

export default function InlineSignUp({ onAuthSuccess }: InlineSignUpProps) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignIn, setIsSignIn] = useState(false);

  useEffect(() => {
    try {
      const client = getBrowserSupabaseClient();
      setSupabase(client);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Supabase not configured';
      setStatus(message);
    }
  }, []);

  async function handleAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    if (!supabase) {
      setStatus('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL/ANON_KEY.');
      return;
    }
    if (!email || !password) {
      setStatus('Enter email and password to continue.');
      return;
    }
    setLoading(true);
    try {
      if (isSignIn) {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) {
          setStatus('Signed in successfully!');
          onAuthSuccess?.(data.session);
        }
      } else {
        // Sign up (no email confirmation)
        console.log('[InlineSignUp] Attempting signup with:', email);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: {} },
        });
        console.log('[InlineSignUp] Signup response:', { data, error });
        if (error) throw error;
        if (data.session) {
          // Immediate signin if session created
          setStatus('Account created and signed in!');
          onAuthSuccess?.(data.session);
        } else {
          // No session returned - try to sign in immediately
          console.log('[InlineSignUp] No session from signup, attempting automatic signin...');
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          console.log('[InlineSignUp] Auto signin response:', { signInData, signInError });
          if (signInError) throw signInError;
          if (signInData.session) {
            setStatus('Account created and signed in!');
            onAuthSuccess?.(signInData.session);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : (isSignIn ? 'Sign in failed' : 'Signup failed');
      console.error('[InlineSignUp] Auth error:', err);
      setStatus(message.includes('Failed to fetch') ? 'Network error: could not reach Supabase' : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 shadow-sm">
      <p className="text-sm font-semibold text-violet-800 mb-2">Sign up to reveal full details</p>
      <form className="space-y-3" onSubmit={handleAuth}>
        <div className="flex flex-col gap-1">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSignIn ? 'Enter password' : 'Create a password'}
            className="w-full rounded-md border border-violet-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center rounded-full bg-violet-600 text-white text-sm font-semibold px-4 py-2 hover:bg-violet-700 disabled:opacity-60"
        >
          {loading ? (isSignIn ? 'Signing in…' : 'Signing up…') : isSignIn ? 'Sign in' : 'Sign up'}
        </button>
        {status && <p className="text-xs text-violet-700 text-center">{status}</p>}
      </form>
      <p className="mt-3 text-center text-xs text-violet-700">
        {isSignIn ? (
          <>
            New user?{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignIn(false);
                setStatus(null);
              }}
              className="font-semibold underline hover:text-violet-900"
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already a user?{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignIn(true);
                setStatus(null);
              }}
              className="font-semibold underline hover:text-violet-900"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
