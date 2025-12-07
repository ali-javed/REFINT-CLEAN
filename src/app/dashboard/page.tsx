'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/utils/supabase/browser';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile, UserPlan, Document } from '@/types/database';

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [duplicateDocId, setDuplicateDocId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);

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

        // Fetch profile - create if doesn't exist
        let { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create it
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: currentSession.user.id,
              email: currentSession.user.email || '',
              full_name: currentSession.user.user_metadata?.full_name || ''
            })
            .select()
            .single();
          
          if (!createError) {
            profileData = newProfile;
          }
        }
        
        if (profileData) {
          setProfile(profileData as Profile);
        }

        // Fetch user plan - create if doesn't exist
        let { data: planData, error: planError } = await supabase
          .from('user_plans')
          .select('*')
          .eq('user_id', currentSession.user.id)
          .single();

        if (planError && planError.code === 'PGRST116') {
          // Plan doesn't exist, create default free plan
          const { data: newPlan, error: createError } = await supabase
            .from('user_plans')
            .insert({
              user_id: currentSession.user.id,
              plan_type: 'free',
              monthly_limit: 3,
              monthly_used: 0
            })
            .select()
            .single();
          
          if (!createError) {
            planData = newPlan;
          }
        }
        
        if (planData) {
          setUserPlan(planData as UserPlan);
        }

        // Fetch user documents
        const { data: docsData, error: docsError } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', currentSession.user.id)
          .order('created_at', { ascending: false });

        if (docsError) {
          console.error('Documents error:', docsError);
        } else {
          setDocuments(docsData as Document[]);
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

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/delete-document?documentId=${documentId}&userId=${session?.user?.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Failed to delete document');
        return;
      }

      // Remove from local state
      setDocuments(documents.filter(doc => doc.id !== documentId));
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const handleUpload = async (file: File, overwrite = false) => {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    
    // Add userId if authenticated
    if (session?.user?.id) {
      formData.append('userId', session.user.id);
    }
    
    // Add overwrite flag if this is a retry
    if (overwrite) {
      formData.append('overwrite', 'true');
    }

    try {
      const res = await fetch('/api/extract-references', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      // Handle duplicate detection (409 status)
      if (res.status === 409 && json.isDuplicate) {
        setDuplicateDocId(json.documentId);
        setPendingFile(file);
        setDuplicateMessage(json.message);
        setUploading(false);
        return;
      }

      if (!res.ok) {
        console.error('Upload error:', json);
        setError(json.error || json.message || 'Upload failed');
        return;
      }

      // Clear duplicate state on success
      setDuplicateDocId(null);
      setPendingFile(null);
      setDuplicateMessage(null);

      if (json.documentId) {
        // Refetch documents to show the new one
        const { data: docsData } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', session?.user?.id || '')
          .order('created_at', { ascending: false });
        
        if (docsData) {
          setDocuments(docsData as Document[]);
        }
        
        // Navigate to the document page
        router.push(`/references/${json.documentId}`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleOverwriteYes = () => {
    if (pendingFile) {
      handleUpload(pendingFile, true);
    }
  };

  const handleOverwriteNo = () => {
    setDuplicateDocId(null);
    setPendingFile(null);
    setDuplicateMessage(null);
    setError(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'processing':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
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
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-400">Welcome back, {profile?.full_name || session.user.email?.split('@')[0]}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
          >
            ← Back to Home
          </button>
        </div>

        {/* Quick Actions & Plan Overview */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {/* Upload Card */}
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 p-6">
            <h2 className="mb-2 text-xl font-semibold">Get Started</h2>
            <p className="mb-4 text-sm text-zinc-400">
              Upload a document to verify your references
            </p>
            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            
            {duplicateDocId ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="mb-3">
                  <p className="text-sm font-medium text-amber-300 mb-1">⚠️ Duplicate File Detected</p>
                  <p className="text-xs text-zinc-400">{duplicateMessage}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleOverwriteNo}
                    className="flex-1 inline-flex items-center justify-center rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-200 text-sm font-medium px-4 py-2.5 hover:bg-zinc-700 transition"
                  >
                    No, Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleOverwriteYes}
                    disabled={uploading}
                    className="flex-1 inline-flex items-center justify-center rounded-lg border border-amber-600 bg-amber-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-amber-700 disabled:opacity-50 transition"
                  >
                    {uploading ? '⏳ Processing...' : 'Yes, Overwrite'}
                  </button>
                </div>
              </div>
            ) : (
              <label htmlFor="dashboard-upload" className="cursor-pointer">
                <input
                  id="dashboard-upload"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                />
                <span className="inline-block rounded-full bg-violet-600 px-6 py-3 text-sm font-medium text-white shadow-lg transition hover:bg-violet-500 disabled:opacity-50">
                  {uploading ? '⏳ Processing...' : '📄 Upload Document'}
                </span>
              </label>
            )}
          </div>

          {/* Plan Card */}
          {userPlan && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h2 className="mb-3 text-xl font-semibold">Your Plan</h2>
              <div className="mb-4 flex items-center gap-3">
                <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-base font-medium ${getPlanBadgeColor(userPlan.plan_type)}`}>
                  {userPlan.plan_type === 'pro' && '⭐'}
                  {userPlan.plan_type === 'academic' && '🎓'}
                  {userPlan.plan_type === 'free' && '📄'}
                  {userPlan.plan_type.charAt(0).toUpperCase() + userPlan.plan_type.slice(1)}
                </span>
              </div>
              <div className="mb-3">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-zinc-300">Documents this month</span>
                  <span className="font-medium text-zinc-100">
                    {userPlan.monthly_used} / {userPlan.monthly_limit === 999999 ? '∞' : userPlan.monthly_limit}
                  </span>
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
              {userPlan.plan_type === 'free' && (
                <button className="mt-2 w-full rounded-full bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400">
                  Upgrade to Pro
                </button>
              )}
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="mb-4 text-xl font-semibold">Your Documents</h2>
          
          {documents.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mb-4 text-5xl opacity-50">📄</div>
              <p className="mb-2 text-zinc-400">No documents yet</p>
              <p className="text-sm text-zinc-500">Upload your first document to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-5 transition hover:border-zinc-700"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="font-semibold text-zinc-100">{doc.filename}</h3>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusBadge(doc.status)}`}>
                          {doc.status === 'completed' && '✓'}
                          {doc.status === 'processing' && '⏳'}
                          {doc.status === 'failed' && '✗'}
                          {doc.status}
                        </span>
                      </div>
                      {doc.title && (
                        <p className="text-sm text-zinc-400 mb-2">📄 {doc.title}</p>
                      )}
                      
                      {/* Integrity Score */}
                      {doc.overall_integrity_score !== null && (
                        <div className="mb-2 flex items-center gap-3">
                          <span className="text-sm text-zinc-400">Integrity Score:</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-800">
                              <div
                                className={`h-full transition-all ${
                                  doc.overall_integrity_score >= 80 
                                    ? 'bg-emerald-500' 
                                    : doc.overall_integrity_score >= 60 
                                    ? 'bg-amber-500' 
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${doc.overall_integrity_score}%` }}
                              />
                            </div>
                            <span className={`text-sm font-semibold ${
                              doc.overall_integrity_score >= 80 
                                ? 'text-emerald-400' 
                                : doc.overall_integrity_score >= 60 
                                ? 'text-amber-400' 
                                : 'text-red-400'
                            }`}>
                              {Math.round(doc.overall_integrity_score)}/100
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* AI Review Summary */}
                      {doc.status === 'completed' && (
                        <div className="mb-2 rounded-md bg-zinc-900/60 border border-zinc-800 p-3">
                          <p className="text-xs font-medium text-zinc-400 mb-1">AI Review Summary:</p>
                          <p className="text-sm text-zinc-300">
                            {doc.overall_integrity_score !== null ? (
                              doc.overall_integrity_score >= 80 
                                ? `✓ Excellent quality. All ${doc.total_references} references appear well-formatted and complete with proper citations.`
                                : doc.overall_integrity_score >= 60 
                                ? `⚠ Good quality. Most of the ${doc.total_references} references are valid, but some may need review for completeness.`
                                : `⚠ Needs attention. Several of the ${doc.total_references} references may be incomplete or improperly formatted.`
                            ) : (
                              `Analyzed ${doc.total_references} references from your document.`
                            )}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span>📅 {new Date(doc.created_at).toLocaleDateString()}</span>
                        <span>📝 {doc.total_references} references</span>
                      </div>
                    </div>
                    
                    <div className="ml-4 flex flex-col gap-2">
                      <button
                        onClick={() => router.push(`/references/${doc.id}`)}
                        disabled={doc.status !== 'completed'}
                        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-violet-500 hover:text-violet-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-zinc-700 disabled:hover:text-zinc-300 whitespace-nowrap"
                      >
                        View Report
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="rounded-lg border border-red-700/50 px-4 py-2 text-sm text-red-400 transition hover:border-red-500 hover:bg-red-500/10 whitespace-nowrap"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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

        {/* Plan Details Section */}
        {userPlan && (
          <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="mb-4 text-xl font-semibold">Subscription Details</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${getPlanBadgeColor(userPlan.plan_type)}`}>
                  {userPlan.plan_type === 'pro' && '⭐'}
                  {userPlan.plan_type === 'academic' && '🎓'}
                  {userPlan.plan_type === 'free' && '📄'}
                  {userPlan.plan_type.charAt(0).toUpperCase() + userPlan.plan_type.slice(1)}
                </span>
                <span className="text-xs text-emerald-400">Active</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400">Account Created</label>
                <p className="mt-1 text-sm text-zinc-100">
                  {new Date(userPlan.created_at).toLocaleDateString()}
                </p>
              </div>
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
      </div>
    </div>
  );
}
