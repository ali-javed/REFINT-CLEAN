'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import ReferenceItem from '@/components/ReferenceItem';
import InlineSignUp from '@/components/InlineSignUp';
import { getBrowserSupabaseClient } from '@/utils/supabase/browser';

interface Reference {
  id: string;
  raw_reference: string;
  context_before?: string | null;
  context_after?: string | null;
  integrity_score?: number | null;
  integrity_explanation?: string | null;
  existence_score?: number | null;
  existence_check?: string | null;
  context_integrity_score?: number | null;
  context_integrity_review?: string | null;
  match_status?: string | null;
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
      // Use integrity scores from database instead of fetching from API
      const refsWithMetadata: ReferenceWithMetadata[] = references.map((ref) => {
        const hasScore = ref.integrity_score !== null && ref.integrity_score !== undefined;
        const score = ref.integrity_score || 0;
        return {
          ...ref,
          pdfFound: hasScore && score > 50, // Consider "found" if scored above 50
          metadata: hasScore ? {
            found: true,
            integrity: {
              score: score / 10, // Convert 0-100 to 0-10 scale for display
              justification: ref.integrity_explanation || 'No explanation provided',
              analyzed: true,
            }
          } : null,
        };
      });

      // Sort: higher scores first
      const sorted = refsWithMetadata.sort((a, b) => {
        const scoreA = a.metadata?.integrity?.score ?? 0;
        const scoreB = b.metadata?.integrity?.score ?? 0;
        return scoreB - scoreA;
      });

      setSortedReferences(sorted);
      
      // Compute average integrity score
      const scores: number[] = [];
      let found = 0;
      sorted.forEach((item) => {
        if (item.metadata?.integrity?.score !== null && item.metadata?.integrity?.score !== undefined) {
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

      // Generate AI summary from integrity explanations
      setSummaryLoading(true);
      try {
        const explanations = sorted
          .map((item) => item.metadata?.integrity?.justification)
          .filter(Boolean);
        
        if (explanations.length > 0) {
          // Create a summary from all explanations
          const avgScoreVal = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
          const qualityLevel = avgScoreVal >= 8 ? 'excellent' : avgScoreVal >= 6 ? 'good' : 'needs improvement';
          
          const summary = `Overall document quality is ${qualityLevel}. Average integrity score: ${avgScoreVal.toFixed(1)}/10. ` +
            `${found} out of ${sorted.length} references were analyzed. ` +
            (avgScoreVal >= 8 
              ? 'Most references are well-formatted with complete citation information.'
              : avgScoreVal >= 6
              ? 'Most references are adequate but some may benefit from additional review.'
              : 'Several references may need review for completeness and proper formatting.');
          
          setAiSummary(summary);
        }
      } catch (err) {
        console.error('Error generating summary:', err);
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
    <ul className="space-y-4">
      {sortedReferences.map((r) => (
        <ReferenceItem key={r.id} reference={r} metadata={r.metadata} isSignedIn={!!session} />
      ))}
    </ul>
  );
}
