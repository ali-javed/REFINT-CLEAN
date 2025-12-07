'use client';

import { useEffect, useMemo } from 'react';

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

interface ReferenceItemProps {
  reference: {
    id: string;
    raw_reference: string;
    context_before?: string | null;
    context_after?: string | null;
    existence_score?: number | null;
    existence_check?: string | null;
    context_integrity_score?: number | null;
    context_integrity_review?: string | null;
  };
  metadata?: PdfMetadata | null;
  loading?: boolean;
  isSignedIn?: boolean;
}

/**
 * Get color gradient based on integrity score
 */
function getScoreColor(score: number): { from: string; to: string } {
  if (score >= 9) return { from: '#10b981', to: '#059669' }; // Green
  if (score >= 7) return { from: '#3b82f6', to: '#1d4ed8' }; // Blue
  if (score >= 5) return { from: '#f59e0b', to: '#d97706' }; // Amber
  if (score >= 3) return { from: '#ef4444', to: '#dc2626' }; // Red
  return { from: '#6b7280', to: '#4b5563' }; // Gray
}

/**
 * Get icon based on integrity score
 */
function getScoreIcon(score: number): string {
  if (score >= 9) return '✓';
  if (score >= 7) return '→';
  if (score >= 5) return '↗';
  if (score >= 3) return '!';
  return '✗';
}

export default function ReferenceItem({ reference, metadata, loading, isSignedIn }: ReferenceItemProps) {
  const pdfMetadata: PdfMetadata | null = useMemo(() => metadata ?? null, [metadata]);
  const isLoading = loading ?? !metadata;

  // Debug: Log what context we have
  useEffect(() => {
    if (reference.context_before || reference.context_after) {
      console.log('[ReferenceItem] Has context:', {
        before: reference.context_before?.substring(0, 50),
        after: reference.context_after?.substring(0, 50),
      });
    } else {
      console.log('[ReferenceItem] NO CONTEXT for:', reference.raw_reference.substring(0, 50));
    }
  }, [reference]);

  return (
    <li className="border border-slate-200 rounded-lg px-4 py-3 text-sm bg-white shadow-sm">
      {/* Context Section - Show first */}
      {(reference.context_before || reference.context_after) && (
        <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-xs font-semibold text-blue-700 mb-2">📝 Context in Document:</p>
          <p className="text-sm text-slate-800 leading-relaxed">
            {reference.context_before && (
              <span className="text-slate-600">{reference.context_before}</span>
            )}
            <span className="mx-2 px-2 py-0.5 bg-yellow-200 font-semibold text-slate-900 rounded">
              {reference.raw_reference}
            </span>
            {reference.context_after && (
              <span className="text-slate-600">{reference.context_after}</span>
            )}
          </p>
        </div>
      )}

      {/* Reference Citation */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-slate-600 mb-1">Reference Citation:</p>
        <p className="text-sm text-slate-900 font-medium">{reference.raw_reference}</p>
      </div>

      {/* Existence Check Section */}
      {reference.existence_score !== null && reference.existence_score !== undefined && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-blue-700">✓ Existence Check</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-blue-900">
                {reference.existence_score}/100
              </span>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                style={{
                  background: `linear-gradient(to br, ${getScoreColor(
                    reference.existence_score / 10
                  ).from}, ${getScoreColor(reference.existence_score / 10).to})`,
                }}
              >
                {getScoreIcon(reference.existence_score / 10)}
              </div>
            </div>
          </div>
          {reference.existence_check && (
            <p className="text-sm text-slate-700 leading-relaxed">
              {reference.existence_check}
            </p>
          )}
        </div>
      )}

      {/* Context Integrity Section */}
      {reference.context_integrity_score !== null && reference.context_integrity_score !== undefined ? (
        <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-purple-700">🤖 Context Integrity Review</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-purple-900">
                {reference.context_integrity_score}/100
              </span>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                style={{
                  background: `linear-gradient(to br, ${getScoreColor(
                    reference.context_integrity_score / 10
                  ).from}, ${getScoreColor(reference.context_integrity_score / 10).to})`,
                }}
              >
                {getScoreIcon(reference.context_integrity_score / 10)}
              </div>
            </div>
          </div>
          {reference.context_integrity_review && (
            <p className="text-sm text-slate-700 leading-relaxed">
              {reference.context_integrity_review}
            </p>
          )}
        </div>
      ) : (reference.context_before || reference.context_after) ? (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">⏳</span>
            <p className="text-sm font-semibold text-amber-700">Context Integrity Review Pending</p>
          </div>
          <p className="text-xs text-amber-600">
            Context was found in the document. AI review is processing or may have failed. Try re-uploading the document.
          </p>
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">⚠️</span>
            <p className="text-sm font-semibold text-gray-700">Reference Not Found in Document</p>
          </div>
          <p className="text-xs text-gray-600">
            This reference appears in the bibliography but was not found cited in the document body. Context integrity review requires in-text citations.
          </p>
        </div>
      )}
    </li>
  );
}
