import { getSupabaseServiceClient } from '@/utils/supabase/client';
import ReferencesList from '@/components/ReferencesList';

type ReferencesPageProps = {
  params: Promise<{ documentId?: string }>;
};

export default async function ReferencesPage(props: ReferencesPageProps) {
  // In this Next.js version, props.params is a Promise
  const resolvedParams = await props.params;
  const documentId: string | undefined = resolvedParams?.documentId;

  console.log('DEBUG resolvedParams:', resolvedParams);
  console.log('DEBUG documentId:', documentId);

  if (!documentId) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center text-sm text-red-600 space-y-2">
          <p>Error: documentId is undefined.</p>
          <p>
            Make sure the URL looks like:
            <span className="font-mono text-xs block mt-1">
              /references/&lt;uuid&gt;
            </span>
          </p>
        </div>
      </main>
    );
  }

  const supabase = getSupabaseServiceClient();

  // First, get the document info
  const { data: documents, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId);

  if (docError) {
    console.error('Error loading document:', docError);
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-red-500">
          Failed to load document: {docError.message}
        </p>
      </main>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-red-500">
          Document not found
        </p>
      </main>
    );
  }

  const document = documents[0];

  // Then get the document references
  const { data, error } = await supabase
    .from('document_references')
    .select('id, raw_citation_text, first_author, second_author, last_author, year, publication, context_before, context_after, integrity_score, ai_review, position_in_doc, created_at')
    .eq('document_id', documentId)
    .order('position_in_doc', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error loading references:', error);
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-red-500">
          Failed to load references: {error.message}
        </p>
      </main>
    );
  }

  // Map to expected format for ReferencesList component
  const refs = (data ?? []).map((ref: any) => ({
    id: ref.id,
    raw_reference: ref.raw_citation_text,
    first_author: ref.first_author,
    second_author: ref.second_author,
    last_author: ref.last_author,
    year: ref.year,
    publication: ref.publication,
    context_before: ref.context_before,
    context_after: ref.context_after,
    integrity_score: ref.integrity_score,
    integrity_explanation: ref.ai_review,
    match_status: null,
    created_at: ref.created_at,
  }));

  const doc = document as any;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-4xl">
        {/* Document Header */}
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{doc.filename}</h1>
              {doc.title && (
                <p className="text-base text-zinc-300 mb-2">📄 {doc.title}</p>
              )}
              <p className="text-sm text-zinc-400">
                Uploaded on {new Date(doc.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <a
              href="/dashboard"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
            >
              ← Back to Dashboard
            </a>
          </div>
          
          {/* Document Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Status</p>
              <p className={`text-sm font-medium ${
                doc.status === 'completed' ? 'text-emerald-400' :
                doc.status === 'processing' ? 'text-amber-400' :
                doc.status === 'failed' ? 'text-red-400' : 'text-zinc-400'
              }`}>
                {doc.status === 'completed' && '✓ '}
                {doc.status === 'processing' && '⏳ '}
                {doc.status === 'failed' && '✗ '}
                {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Total References</p>
              <p className="text-sm font-medium text-zinc-100">{doc.total_references}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Overall Integrity</p>
              {doc.overall_integrity_score !== null ? (
                <p className={`text-sm font-semibold ${
                  doc.overall_integrity_score >= 80 ? 'text-emerald-400' :
                  doc.overall_integrity_score >= 60 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {Math.round(doc.overall_integrity_score)}/100
                </p>
              ) : (
                <p className="text-sm text-zinc-500">Not calculated</p>
              )}
            </div>
          </div>
        </div>

        {/* AI Review Report */}
        {doc.ai_review_report && (
          <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-xl font-semibold mb-3">AI Review Report</h2>
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-zinc-300 whitespace-pre-wrap">{doc.ai_review_report}</p>
            </div>
          </div>
        )}

        {/* References List */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-xl font-semibold mb-4">References Analysis</h2>
          {refs.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No references found for this document.
            </p>
          ) : (
            <ReferencesList references={refs} />
          )}
        </div>
      </div>
    </main>
  );
}
