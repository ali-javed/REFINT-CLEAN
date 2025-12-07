'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/utils/supabase/browser';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile, UserPlan } from '@/types/database';

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!currentSession) {
          router.push('/signin');
          return;
        }

        setSession(currentSession);

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
        } else {
          setProfile(profileData as Profile);
        }

        // Fetch user plan
        const { data: planData, error: planError } = await supabase
          .from('user_plans')
          .select('*')
          .eq('user_id', currentSession.user.id)
          .single();

        if (planError) {
          console.error('Plan error:', planError);
        } else {
          setUserPlan(planData as UserPlan);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [supabase, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleResetPassword = async () => {
    if (!session?.user?.email) return;

    setResettingPassword(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        session.user.email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        throw error;
      }

      setPasswordResetSent(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send password reset email');
    } finally {
      setResettingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect in useEffect
  }

  const getPlanBadgeColor = (planType: string) => {
    switch (planType) {
      case 'pro':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'academic':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-400">Manage your account and view your activity</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
          >
            ← Back to Home
          </button>
        </div>

        {/* Profile Section */}
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="mb-4 text-xl font-semibold">Profile Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400">Email</label>
              <p className="mt-1 text-zinc-100">{session.user.email}</p>
            </div>

            {profile?.full_name && (
              <div>
                <label className="block text-sm font-medium text-zinc-400">Full Name</label>
                <p className="mt-1 text-zinc-100">{profile.full_name}</p>
              </div>
            )}

            {profile?.is_edu_verified && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  .edu Verified
                </span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-400">Account Created</label>
              <p className="mt-1 text-zinc-100">
                {new Date(session.user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Plan Section */}
        {userPlan && (
          <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="mb-4 text-xl font-semibold">Subscription Plan</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${getPlanBadgeColor(userPlan.plan_type)}`}>
                  {userPlan.plan_type === 'pro' && '⭐'}
                  {userPlan.plan_type === 'academic' && '🎓'}
                  {userPlan.plan_type === 'free' && '📄'}
                  {userPlan.plan_type.charAt(0).toUpperCase() + userPlan.plan_type.slice(1)}
                </span>
                {userPlan.is_active ? (
                  <span className="text-xs text-emerald-400">Active</span>
                ) : (
                  <span className="text-xs text-red-400">Inactive</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400">Usage This Period</label>
                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-zinc-100">{userPlan.monthly_used} of {userPlan.monthly_limit === 999999 ? 'Unlimited' : userPlan.monthly_limit} documents</span>
                    {userPlan.monthly_limit !== 999999 && (
                      <span className="text-zinc-400">
                        {Math.round((userPlan.monthly_used / userPlan.monthly_limit) * 100)}%
                      </span>
                    )}
                  </div>
                  {userPlan.monthly_limit !== 999999 && (
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-violet-600 transition-all"
                        style={{
                          width: `${Math.min((userPlan.monthly_used / userPlan.monthly_limit) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-400">Period Start</label>
                  <p className="mt-1 text-sm text-zinc-100">
                    {new Date(userPlan.period_start).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400">Period End</label>
                  <p className="mt-1 text-sm text-zinc-100">
                    {new Date(userPlan.period_end).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {userPlan.plan_type === 'free' && (
                <button className="mt-4 w-full rounded-full bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400">
                  Upgrade to Pro
                </button>
              )}
            </div>
          </div>
        )}

        {/* Security Section */}
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="mb-4 text-xl font-semibold">Security</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400">Password</label>
              <p className="mt-1 text-sm text-zinc-500">••••••••</p>
            </div>

            {passwordResetSent ? (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                <p className="text-sm text-emerald-400">
                  ✓ Password reset email sent! Check your inbox.
                </p>
              </div>
            ) : (
              <button
                onClick={handleResetPassword}
                disabled={resettingPassword}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-50"
              >
                {resettingPassword ? 'Sending...' : 'Reset Password'}
              </button>
            )}

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <button
            onClick={handleSignOut}
            className="rounded-lg border border-red-700 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
