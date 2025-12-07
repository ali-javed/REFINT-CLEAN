'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UploadFormProps {
  userId?: string;
}

export default function UploadForm({ userId }: UploadFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [duplicateDocId, setDuplicateDocId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, overwrite = false) {
    e.preventDefault();
    setStatus(null);

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem('file') as HTMLInputElement;

    const file = overwrite && pendingFile ? pendingFile : fileInput.files?.[0];
    
    if (!file) {
      setStatus('Please choose a PDF first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    // Add user ID (required)
    if (userId) {
      formData.append('userId', userId);
    }
    
    // Add overwrite flag if this is a retry
    if (overwrite) {
      formData.append('overwrite', 'true');
    }

    try {
      setIsLoading(true);
      setStatus('Verifying references…');

      const res = await fetch('/api/extract-references', {
        method: 'POST',
        body: formData,
      });

      let json;
      try {
        json = await res.json();
      } catch (parseErr) {
        console.error('Failed to parse response:', parseErr);
        setStatus('Server error: Invalid response format');
        return;
      }

      // Handle duplicate detection (409 status)
      if (res.status === 409 && json.isDuplicate) {
        setDuplicateDocId(json.documentId);
        setPendingFile(file);
        setStatus(json.message);
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        const msgParts = [];
        if (json.error) msgParts.push(json.error);
        if (json.message) msgParts.push(json.message);
        const errorMsg = msgParts.join(' – ') || `HTTP ${res.status}`;
        setStatus('Error: ' + errorMsg);
        console.error('API Error:', json);
        return;
      }

      // Clear duplicate state on success
      setDuplicateDocId(null);
      setPendingFile(null);

      // Redirect directly to references page
      if (json.documentId) {
        router.push(`/references/${json.documentId}`);
      } else {
        setStatus('Error: No document ID returned');
      }



    } catch (err) {
      console.error('Upload error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setStatus(`Network error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : null);
    setStatus(null);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Upload area */}
      <label
        htmlFor="file"
        className="flex flex-col items-center justify-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-6 cursor-pointer hover:border-slate-400 transition"
      >
        <span className="text-sm font-medium text-slate-700">
          {fileName ? 'Selected file' : 'Upload PDF'}
        </span>
        <span className="text-xs text-slate-500">
          {fileName || 'Drag & drop or click to browse'}
        </span>

        <input
          id="file"
          name="file"
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>

      {/* Verify button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full inline-flex items-center justify-center rounded-full border border-slate-900 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        {isLoading ? 'Verifying…' : 'Verify references'}
      </button>

      {/* Duplicate file confirmation */}
      {duplicateDocId && !isLoading && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-amber-600 mb-1">⚠️ Duplicate File Detected</p>
            <p className="text-xs text-slate-600">A document with this filename already exists. What would you like to do?</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push(`/references/${duplicateDocId}`)}
              className="flex-1 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium px-4 py-2 hover:bg-slate-50 transition"
            >
              📄 View Existing
            </button>
            <button
              type="button"
              onClick={(e) => {
                const form = e.currentTarget.closest('form');
                if (form) {
                  handleSubmit({ currentTarget: form, preventDefault: () => {} } as any, true);
                }
              }}
              className="flex-1 inline-flex items-center justify-center rounded-lg border border-amber-600 bg-amber-600 text-white text-sm font-medium px-4 py-2 hover:bg-amber-700 transition"
            >
              ✓ Overwrite
            </button>
          </div>
        </div>
      )}

      {/* Status */}
      {status && (
        <p className="text-xs text-slate-500 text-center mt-1 min-h-[1.25rem]">
          {status}
        </p>
      )}
    </form>
  );
}
