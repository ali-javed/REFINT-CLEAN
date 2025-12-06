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
    <li className="border border-slate-200 rounded-lg px-4 py-3 text-sm bg-slate-50">
      <div className="mb-3">
        <p className="font-semibold text-slate-900 mb-1">Reference:</p>
        <p className="text-slate-800">{reference.raw_reference}</p>
      </div>

      {(reference.context_before || reference.context_after) && (
        <div className="mb-3 pl-3 border-l-2 border-amber-300 bg-amber-50 py-2">
          <p className="text-xs font-medium text-amber-700 mb-2">Context:</p>
          <p className="text-xs text-slate-700 leading-relaxed">
            {reference.context_before && <span>{reference.context_before}</span>}
            {reference.context_before && reference.context_after && (
              <span className="mx-1 font-semibold text-amber-600">
                {' '}
                [...citation...]{' '}
              </span>
            )}
            {reference.context_after && <span>{reference.context_after}</span>}
          </p>
        </div>
      )}

      {/* PDF Metadata Section */}
      <div className="pl-3 border-l-2 border-violet-300 bg-violet-50 py-2">
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-xs font-medium text-violet-700">Full Paper:</p>
          {pdfMetadata?.found && pdfMetadata?.integrity && (
            <div className="flex items-center gap-2 group">
              <div className="text-right" style={{ filter: isSignedIn ? 'none' : 'blur(2px)', transition: 'filter 0.2s' }} onMouseEnter={(e) => !isSignedIn && (e.currentTarget.style.filter = 'blur(0.6px)')} onMouseLeave={(e) => !isSignedIn && (e.currentTarget.style.filter = 'blur(2px)')}>
                <p className="text-xs font-semibold text-emerald-600">
                  {pdfMetadata.integrity.score}/10
                </p>
                <p className="text-xs text-emerald-600 font-medium">Integrity</p>
                {pdfMetadata.integrity.analyzed && (
                  <p className="text-xs text-amber-600 font-medium">AI Review</p>
                )}
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{
                  background: `linear-gradient(to br, ${getScoreColor(
                    pdfMetadata.integrity.score
                  ).from}, ${getScoreColor(pdfMetadata.integrity.score).to})`,
                  filter: isSignedIn ? 'none' : 'blur(1.5px)',
                  transition: 'filter 0.2s',
                }}
                onMouseEnter={(e) => !isSignedIn && (e.currentTarget.style.filter = 'blur(0)')}
                onMouseLeave={(e) => !isSignedIn && (e.currentTarget.style.filter = 'blur(1.5px)')}
              >
                {getScoreIcon(pdfMetadata.integrity.score)}
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <p className="text-xs text-slate-600 italic">Loading...</p>
        ) : pdfMetadata?.found ? (
          <div className="text-xs text-slate-700 space-y-2">
            {pdfMetadata.source === 'repo' ? (
              <>
                <p className="font-medium">✓ Available in Repository</p>
                {pdfMetadata.fileName && pdfMetadata.fileExists !== false ? (
                  <div className="flex items-center gap-2 text-slate-600">
                    <p className="italic">{pdfMetadata.fileName}</p>
                    <a
                      href={`/papers/${pdfMetadata.fileName}`}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="px-2 py-1 text-xs font-semibold text-white bg-violet-600 rounded hover:bg-violet-700"
                    >
                      View PDF
                    </a>
                  </div>
                ) : (
                  <p className="text-slate-500">PDF missing from repo.</p>
                )}
              </>
            ) : (
              <>
                <p className="font-medium">✓ Available on arXiv</p>
                {pdfMetadata.arxiv?.title && (
                  <p className="text-slate-800 font-semibold">
                    {pdfMetadata.arxiv.title}
                  </p>
                )}
                {(pdfMetadata.arxiv?.pdfUrl || pdfMetadata.arxiv?.link) && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <a
                      href={pdfMetadata.arxiv?.pdfUrl || pdfMetadata.arxiv?.link}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 text-xs font-semibold text-white bg-violet-600 rounded hover:bg-violet-700"
                    >
                      View PDF
                    </a>
                    {pdfMetadata.arxiv?.link && (
                      <a
                        href={pdfMetadata.arxiv.link}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-violet-700"
                      >
                        View on arXiv
                      </a>
                    )}
                  </div>
                )}
              </>
            )}

            {pdfMetadata.integrity?.justification && (
              <div className="bg-blue-50 rounded p-2 border border-blue-200 relative">
                <p className="font-medium text-blue-800 mb-1">AI Review:</p>
                {isSignedIn ? (
                  <p className="text-slate-700 leading-relaxed">
                    {pdfMetadata.integrity.justification}
                  </p>
                ) : (
                  <>
                    <p className="text-slate-700 leading-relaxed filter blur-[2px] hover:blur-[0.6px] transition">
                      {pdfMetadata.integrity.justification}
                    </p>
                    <p className="absolute bottom-1 right-2 text-[10px] text-blue-500 font-semibold">
                      Sign up to reveal fully
                    </p>
                  </>
                )}
              </div>
            )}

            {pdfMetadata.summary && (
              <div className="bg-white rounded p-2 border border-violet-200">
                <p className="font-medium text-slate-800 mb-1">Abstract:</p>
                <p className="text-slate-700 leading-relaxed">
                  {pdfMetadata.summary}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500">✗ Full paper not found</p>
        )}
      </div>
    </li>
  );
}
