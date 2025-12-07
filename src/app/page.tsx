'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import UploadForm from '@/components/UploadForm';
import { getBrowserSupabaseClient } from '@/utils/supabase/browser';

const integrityRanges = [
  { label: '90–100', title: 'Perfectly matched & verified', desc: 'The reference clearly supports the claim and matches the original context.' },
  { label: '70–89', title: 'Minor interpretation drift', desc: 'Mostly accurate but with small stretches or interpretation differences.' },
  { label: '40–69', title: 'Weak or partial support', desc: 'The reference is related but does not strongly support the specific claim.' },
  { label: '0–39', title: 'Misleading or incorrect', desc: 'The reference is misused, misquoted, or may not exist at all.' },
];

const audiences = [
  { title: 'Students', desc: 'Avoid accidental mis-citations and protect your grades.' },
  { title: 'Researchers', desc: 'Safeguard your academic reputation and peer review outcomes.' },
  { title: 'Journals & Reviewers', desc: 'Screen submissions for citation misuse before publication.' },
  { title: 'Legal & Policy Teams', desc: 'Verify that cited evidence truly supports policy recommendations.' },
  { title: 'Medical Authors', desc: 'Confirm that clinical claims match the underlying studies.' },
];

const faqs = [
  {
    q: 'Is this the same as plagiarism detection?',
    a: 'No. Plagiarism tools look for copy-paste similarity. ReferenceAudit verifies whether your citations truly support what you are claiming.',
  },
  {
    q: 'Which document types are supported?',
    a: 'We support PDFs, Word documents, and exported LaTeX files. Support for more formats is coming soon.',
  },
  {
    q: 'Do you store my documents?',
    a: 'Documents are processed securely. You can choose to have your files deleted after analysis. We never resell your data.',
  },
  {
    q: 'Can this be used for medical or legal writing?',
    a: 'Yes. We work with peer-reviewed and reputable sources and can help you verify that citations are used accurately and responsibly.',
  },
];

export default function HomePage() {
  const supabase = useMemo(() => {
    try {
      return getBrowserSupabaseClient();
    } catch {
      return null;
    }
  }, []);
  const [session, setSession] = useState<Session | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/extract-references', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        console.error('Upload error:', json);
        alert(`Error: ${json.error || json.message || 'Upload failed'}`);
        return;
      }

      if (json.documentId) {
        window.location.href = `/references/${json.documentId}`;
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      console.log('[HomePage] Session loaded:', { exists: !!data.session, email: data.session?.user.email });
      setSession(data.session ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      console.log('[HomePage] Auth state changed:', { event: _event, exists: !!nextSession });
      setSession(nextSession);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabase]);



  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_#4f46e5_0,_transparent_55%)] opacity-30" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 py-20 text-center sm:px-6 lg:px-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
            referenceaudit.org
          </p>
          <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Audit your references
            <span className="block text-indigo-300">with confidence.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-sm text-zinc-300 sm:text-base">
            Upload any document and instantly verify whether every reference exists, matches the claim,
            and preserves the original meaning.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <label htmlFor="hero-upload" className="w-full sm:w-auto cursor-pointer">
              <span className="inline-block w-full rounded-full bg-indigo-500 px-8 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 text-center">
                {uploading ? 'Uploading...' : 'Upload document'}
              </span>
              <input
                id="hero-upload"
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
              />
            </label>
            <button className="w-full rounded-full border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 sm:w-auto">
              View sample report
            </button>
          </div>

          <p className="mt-6 text-xs text-zinc-400">
            Built for students · researchers · journals · professionals
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Three layers of reference verification
          </h2>
          <p className="mt-3 text-sm text-zinc-400 sm:text-base">
            We don&apos;t just check if a citation exists. We test whether it actually says what you claim it says.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="mb-3 text-2xl">🔍</div>
            <h3 className="text-lg font-medium">Existence Check</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Confirms whether the referenced article, book, or source actually exists in indexed databases.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="mb-3 text-2xl">🧠</div>
            <h3 className="text-lg font-medium">Meaning Match</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Compares the claim in your text with the original source to detect exaggeration or misinterpretation.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="mb-3 text-2xl">⚖️</div>
            <h3 className="text-lg font-medium">Integrity Score</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Assigns a 0–100 score to each reference based on alignment, reliability, and contextual accuracy.
            </p>
          </div>
        </div>
      </section>

      {/* Integrity score explanation */}
      <section className="border-y border-zinc-800 bg-zinc-900/30">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Reference Integrity Score™ (0–100)
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-zinc-400 sm:text-base">
            A single number that summarizes how honestly and accurately a reference is being used in your document.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {integrityRanges.map((row) => (
              <div
                key={row.label}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5"
              >
                <div className="text-xs font-mono uppercase tracking-[0.2em] text-indigo-300">
                  {row.label}
                </div>
                <h3 className="mt-1 text-sm font-semibold text-zinc-50">{row.title}</h3>
                <p className="mt-2 text-xs text-zinc-400 sm:text-sm">{row.desc}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 max-w-2xl text-xs text-zinc-400 sm:text-sm">
            The score combines semantic similarity between your claim and the source text, citation reliability,
            contextual drift detection, and publication credibility into one interpretable metric.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            How ReferenceAudit works
          </h2>
          <p className="mt-3 text-sm text-zinc-400 sm:text-base">
            Three simple steps from upload to insight.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="mb-3 text-sm font-medium text-indigo-300">Step 1</div>
            <h3 className="text-lg font-medium">Upload your document</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Drag and drop a PDF, Word file, or exported LaTeX document. No formatting gymnastics required.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="mb-3 text-sm font-medium text-indigo-300">Step 2</div>
            <h3 className="text-lg font-medium">We audit every reference</h3>
            <p className="mt-2 text-sm text-zinc-400">
              We match each citation against millions of open and closed-source publications and analyze the context.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="mb-3 text-sm font-medium text-indigo-300">Step 3</div>
            <h3 className="text-lg font-medium">Get your integrity report</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Receive a detailed, reference-by-reference report with scores, explanations, and flagged risks.
            </p>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="border-y border-zinc-800 bg-zinc-900/40">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Built for people who can&apos;t afford bad citations
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {audiences.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5"
              >
                <h3 className="text-sm font-semibold text-zinc-50 sm:text-base">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs text-zinc-400 sm:text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample report preview */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              See what a reference audit looks like
            </h2>
            <p className="mt-3 text-sm text-zinc-400 sm:text-base">
              Every reference gets a score, a verdict, and a plain-language explanation of what&apos;s going on.
            </p>
            <button className="mt-6 rounded-full border border-zinc-700 px-6 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500">
              View sample report
            </button>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 text-sm text-zinc-100 shadow-lg shadow-black/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-[0.18em] text-zinc-400">
                Reference #12
              </span>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
                Verified ✅
              </span>
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              Claim in your document:
            </p>
            <p className="mt-1 text-xs italic text-zinc-100">
              &quot;Prior work has already shown a strong causal link between sleep deprivation and reduced
              diagnostic accuracy.&quot;
            </p>
            <p className="mt-3 text-xs text-zinc-400">
              Matched source excerpt:
            </p>
            <p className="mt-1 line-clamp-3 rounded-md bg-zinc-900/80 p-3 text-xs text-zinc-200">
              &quot;… clinicians who slept fewer than 4 hours before shift showed a statistically significant
              decrease in diagnostic accuracy across multiple case types…&quot;
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-400">Integrity score</p>
                <p className="text-sm font-semibold text-emerald-300">94 / 100</p>
              </div>
              <div className="text-xs text-zinc-400">
                Minor wording differences detected, but the source clearly supports the claim.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-y border-zinc-800 bg-zinc-900/40">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Start free. Upgrade when your work demands it.
            </h2>
            <p className="mt-3 text-sm text-zinc-400 sm:text-base">
              Perfect for one-off assignments, full dissertations, or journal workflows.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6">
              <h3 className="text-lg font-semibold">Free</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Ideal for trying out ReferenceAudit on a single document.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                <li>• 1 document per month</li>
                <li>• Integrity score overview</li>
                <li>• Blurred detailed report</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-indigo-500 bg-zinc-950 p-6 shadow-lg shadow-indigo-500/20">
              <h3 className="text-lg font-semibold">Pro</h3>
              <p className="mt-2 text-sm text-zinc-300">
                For serious research, supervision, and editorial workflows.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                <li>• Unlimited document audits</li>
                <li>• Full unblurred reports</li>
                <li>• Exportable integrity PDFs</li>
                <li>• Priority model & updates</li>
              </ul>
              <button className="mt-6 w-full rounded-full bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400">
                Start free
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Frequently asked questions</h2>
        <div className="mt-6 space-y-5">
          {faqs.map((item) => (
            <div key={item.q} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
              <h3 className="text-sm font-semibold text-zinc-50 sm:text-base">{item.q}</h3>
              <p className="mt-2 text-xs text-zinc-400 sm:text-sm">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="text-sm font-medium text-zinc-50 sm:text-base">
                If your work deserves trust, prove it.
              </p>
              <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                Run a reference audit before your supervisor, reviewers, or readers do.
              </p>
            </div>
            <label htmlFor="footer-upload" className="cursor-pointer">
              <span className="inline-block rounded-full bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400">
                {uploading ? 'Uploading...' : 'Upload document'}
              </span>
              <input
                id="footer-upload"
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
              />
            </label>
          </div>
        </div>
      </section>
    </main>
  );
}
