import { getSupabaseClient } from '@/utils/supabase/server';

// We keep typing loose here because Next is giving params as a Promise
export default async function ReferencesPage(props: any) {
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

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('references_list')
    .select('id, raw_reference, created_at')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true });

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

  const refs = data ?? [];

  return (
    <main className="min-h-screen bg-white text-slate-900 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold mb-2">References</h1>
        <p className="text-xs text-slate-500 mb-4 break-all">
          documentId: {documentId}
        </p>

        {refs.length === 0 ? (
          <p className="text-sm text-slate-500">
            No references found for this document.
          </p>
        ) : (
          <ul className="space-y-3">
            {refs.map((r: any) => (
              <li
                key={r.id}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                {r.raw_reference}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
