'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import ReferenceItem from '@/components/ReferenceItem';
import InlineSignUp from '@/components/InlineSignUp';
import PremiumButton from '@/components/PremiumButton';
import { getBrowserSupabaseClient } from '@/utils/supabase/browser';

interface Reference {
  id: string;
  raw_reference: string;
  context_before?: string | null;
  context_after?: string | null;
}

interface PdfMetadata {
  found?: boolean;
  source?: 'repo' | 'arxiv';
  fileName?: string | null;
  fileExists?: boolean | null;
  summary?: string | null;
  integrity?: {
    score: number;
    justification: string;
    analyzed?: boolean;
  };
  arxiv?: {
    title?: string;
    link?: string;
    pdfUrl?: string;
    id?: string;
    published?: string;
  } | null;
}

interface ReferenceWithMetadata extends Reference {
  pdfFound: boolean;
  metadata: PdfMetadata | null;
}

export default function ReferencesList({
  references,
}: {
  references: Reference[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => {
    try {
      return getBrowserSupabaseClient();
    } catch {
      return null;
    }
  }, []);
  const [sortedReferences, setSortedReferences] = useState<ReferenceWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [foundCount, setFoundCount] = useState(0);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
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

  useEffect(() => {
    async function fetchAndSort() {
      const refsWithMetadata: ReferenceWithMetadata[] = await Promise.all(
        references.map(async (ref) => {
          try {
            const res = await fetch('/api/pdf-lookup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                reference: ref.raw_reference,
                context_before: ref.context_before,
                context_after: ref.context_after,
              }),
            });
            const data = await res.json();
            return {
              ...ref,
              pdfFound: data.found === true,
              metadata: data,
            };
          } catch (err) {
            console.error('Error fetching PDF metadata:', err);
            return {
              ...ref,
              pdfFound: false,
              metadata: null,
            };
          }
        })
      );

      // Sort: papers found first, not found last
      const sorted = refsWithMetadata.sort((a, b) => {
        if (a.pdfFound !== b.pdfFound) {
          return a.pdfFound ? -1 : 1; // Found papers first
        }
        return 0; // Keep original order if both have same status
      });

      setSortedReferences(sorted);
      // Compute average integrity score for found items
      const scores: number[] = [];
      let found = 0;
      sorted.forEach((item) => {
        if (item.metadata?.found && item.metadata?.integrity?.score) {
          scores.push(item.metadata.integrity.score);
          found += 1;
        }
      });
      setFoundCount(found);
      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        setAvgScore(Number(avg.toFixed(2)));
      } else {
        setAvgScore(null);
      }

      // Request AI summary of integrity justifications
      setSummaryLoading(true);
      try {
        const res = await fetch('/api/reference-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviews: sorted
              .map((item) => item.metadata?.integrity)
              .filter(Boolean),
          }),
        });
        const data = await res.json();
        if (data?.summary) setAiSummary(data.summary);
      } catch (err) {
        console.error('Error fetching AI summary:', err);
      } finally {
        setSummaryLoading(false);
        setLoading(false);
      }
    }

    fetchAndSort();
  }, [references]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slate-500 animate-pulse">Loading references...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {session && (
        <>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 flex items-center justify-between">
            <p className="text-xs text-slate-600">Signed in as <span className="font-semibold">{session.user.email}</span></p>
            <button
              onClick={async () => {
                await supabase?.auth.signOut();
                router.push('/');
              }}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline"
            >
              Sign out
            </button>
          </div>
          <PremiumButton session={session} />
        </>
      )}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <p className="text-sm font-semibold text-slate-800">Summary Report</p>
          {avgScore !== null && (
            <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold">
              Avg Integrity: {avgScore}/10
            </span>
          )}
          <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
            Papers found: {foundCount}/{sortedReferences.length}
          </span>
        </div>
        {summaryLoading ? (
          <p className="text-xs text-slate-500 italic">Generating AI summary...</p>
        ) : aiSummary ? (
          <div className="relative">
            {session ? (
              <p className="text-sm text-slate-700 leading-relaxed">
                {aiSummary}
              </p>
            ) : (
              <>
                {(() => {
                  const words = aiSummary.split(/\s+/);
                  const first50 = words.slice(0, 50).join(' ');
                  const remaining = words.slice(50).join(' ');
                  return (
                    <div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {first50}
                        {remaining && (
                          <>
                            {' '}
                            <span className="filter blur-[2px] hover:blur-[0.6px] transition">
                              {remaining}
                            </span>
                          </>
                        )}
                      </p>
                      {remaining && (
                        <p className="mt-1 text-[10px] text-violet-600 font-semibold">
                          Sign up to view the full AI summary
                        </p>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No AI summary available.</p>
        )}
        {!session && (
          <div className="mt-4">
            <InlineSignUp onAuthSuccess={(newSession) => setSession(newSession)} />
          </div>
        )}
      </div>

      <ul className="space-y-4">
        {sortedReferences.map((r) => (
          <ReferenceItem key={r.id} reference={r} metadata={r.metadata} isSignedIn={!!session} />
        ))}
      </ul>
    </div>
  );
}
