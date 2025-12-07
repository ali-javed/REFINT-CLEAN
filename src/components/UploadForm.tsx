'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UploadFormProps {
  userId?: string;
  anonSessionId?: string;
}

export default function UploadForm({ userId, anonSessionId }: UploadFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem('file') as HTMLInputElement;

    if (!fileInput.files?.[0]) {
      setStatus('Please choose a PDF first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    // Add user ID or anon session ID
    if (userId) {
      formData.append('userId', userId);
    } else if (anonSessionId) {
      formData.append('anonSessionId', anonSessionId);
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

      if (!res.ok) {
        const msgParts = [];
        if (json.error) msgParts.push(json.error);
        if (json.message) msgParts.push(json.message);
        const errorMsg = msgParts.join(' – ') || `HTTP ${res.status}`;
        setStatus('Error: ' + errorMsg);
        console.error('API Error:', json);
        return;
      }

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

      {/* Status */}
      {status && (
        <p className="text-xs text-slate-500 text-center mt-1 min-h-[1.25rem]">
          {status}
        </p>
      )}
    </form>
  );
}
