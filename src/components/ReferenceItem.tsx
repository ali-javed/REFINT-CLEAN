'use client';

import { useState, useEffect } from 'react';

interface ReferenceItemProps {
  reference: {
    id: string;
    raw_reference: string;
    context_before?: string | null;
    context_after?: string | null;
  };
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

export default function ReferenceItem({ reference }: ReferenceItemProps) {
  const [pdfMetadata, setPdfMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    async function fetchPdfMetadata() {
      try {
        const res = await fetch('/api/pdf-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: reference.raw_reference,
            context_before: reference.context_before,
            context_after: reference.context_after,
          }),
        });

        const data = await res.json();
        setPdfMetadata(data);
      } catch (err) {
        console.error('Error fetching PDF metadata:', err);
        setPdfMetadata({ found: false, error: true });
      } finally {
        setLoading(false);
      }
    }

    fetchPdfMetadata();
  }, [reference.raw_reference, reference.context_before, reference.context_after]);

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
            <div className="flex items-center gap-2">
              <div className="text-right">
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
                }}
              >
                {getScoreIcon(pdfMetadata.integrity.score)}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-xs text-slate-600 italic">Loading...</p>
        ) : pdfMetadata?.found ? (
          <div className="text-xs text-slate-700">
            <p className="font-medium mb-1">✓ Available in Repository</p>
            <p className="italic text-slate-600 mb-2">{pdfMetadata.fileName}</p>

            {pdfMetadata.integrity?.justification && (
              <div className="bg-blue-50 rounded p-2 border border-blue-200 mb-2">
                <p className="font-medium text-blue-800 mb-1">AI Review:</p>
                <p className="text-slate-700 leading-relaxed">
                  {pdfMetadata.integrity.justification}
                </p>
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
