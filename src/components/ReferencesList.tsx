'use client';

import { useState, useEffect } from 'react';
import ReferenceItem from '@/components/ReferenceItem';

interface Reference {
  id: string;
  raw_reference: string;
  context_before?: string | null;
  context_after?: string | null;
}

interface ReferenceWithMetadata extends Reference {
  pdfFound: boolean;
}

export default function ReferencesList({
  references,
}: {
  references: Reference[];
}) {
  const [sortedReferences, setSortedReferences] = useState<ReferenceWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAndSort() {
      const refsWithMetadata: ReferenceWithMetadata[] = await Promise.all(
        references.map(async (ref) => {
          try {
            const res = await fetch('/api/pdf-lookup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reference: ref.raw_reference }),
            });
            const data = await res.json();
            return {
              ...ref,
              pdfFound: data.found === true,
            };
          } catch (err) {
            console.error('Error fetching PDF metadata:', err);
            return {
              ...ref,
              pdfFound: false,
            };
          }
        })
      );

      // Sort: papers found first, not found last
      const sorted = refsWithMetadata.sort((a, b) => {
        if (a.pdfFound !== b.pdfFound) {
          return a.pdfFound ? -1 : 1; // Found papers first
        }
        return 0; // Keep original order if both have same status
      });

      setSortedReferences(sorted);
      setLoading(false);
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
        <ReferenceItem key={r.id} reference={r} />
      ))}
    </ul>
  );
}
