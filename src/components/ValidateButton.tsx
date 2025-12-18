'use client';

import { useState } from 'react';

interface ValidateButtonProps {
  documentId: string;
  hasValidation: boolean; // whether references are already validated
}

export default function ValidateButton({ documentId, hasValidation }: ValidateButtonProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch('/api/validate-references', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Validation failed');
      }

      // Refresh the page to show validation results
      window.location.reload();
    } catch (err) {
      console.error('Validation error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsValidating(false);
    }
  };

  if (hasValidation) {
    return (
      <div className="rounded-lg border border-emerald-800 bg-emerald-900/20 px-4 py-3 mb-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <span className="text-lg">✓</span>
          <p className="text-sm font-medium">References have been validated</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <button
        onClick={handleValidate}
        disabled={isValidating}
        className={`
          w-full rounded-lg px-6 py-3 font-semibold text-sm transition-all
          ${isValidating 
            ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed' 
            : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]'
          }
        `}
      >
        {isValidating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Validating References...
          </span>
        ) : (
          '🔍 Validate References Online'
        )}
      </button>
      
      {error && (
        <div className="mt-2 rounded-lg border border-red-800 bg-red-900/20 px-4 py-2">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      
      <p className="mt-2 text-xs text-zinc-500 text-center">
        This will check references against arXiv and use AI to validate integrity
      </p>
    </div>
  );
}
