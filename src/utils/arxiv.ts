export interface ArxivResult {
  id: string;
  title: string;
  summary: string;
  link?: string;
  pdfUrl?: string;
  published?: string;
}

/**
 * Search arXiv for a given query string and return the first result (if any).
 * We use the lightweight Atom feed API: https://export.arxiv.org/api/query
 */
export async function searchArxiv(query: string): Promise<ArxivResult | null> {
  const trimmed = query.trim().slice(0, 200);
  if (!trimmed) return null;

  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
    trimmed
  )}&max_results=1`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'refint/1.0 (+https://github.com/ali-javed/refint-clean)',
    },
  });

  if (!res.ok) return null;
  const xml = await res.text();

  // Extract first <entry>...</entry>
  const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/i);
  if (!entryMatch) return null;
  const entry = entryMatch[1];

  const extractTag = (tag: string) => {
    const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return m ? decodeHtml(stripTags(m[1]).trim()) : '';
  };

  const title = extractTag('title');
  const summary = extractTag('summary');
  const published = extractTag('published');
  const id = extractTag('id');

  // Prefer explicit pdf link
  const pdfMatch = entry.match(/<link[^>]+title="pdf"[^>]+href="([^"]+)"/i);
  const pdfUrl = pdfMatch ? pdfMatch[1] : undefined;

  // Also capture the html link
  const htmlMatch = entry.match(/<link[^>]+rel="alternate"[^>]+href="([^"]+)"/i);
  const link = htmlMatch ? htmlMatch[1] : undefined;

  if (!title && !summary) return null;

  return {
    id,
    title,
    summary,
    link,
    pdfUrl,
    published,
  };
}

/**
 * Attempt to extract a likely paper title from a raw reference string.
 * This improves arXiv search quality compared to sending the whole citation.
 */
function extractLikelyTitle(reference: string): string {
  const ref = reference.trim();

  // 1) Try quoted title: "Some Paper Title"
  const quoted = ref.match(/"([^"]{10,})"/);
  if (quoted) return quoted[1];

  // 2) Try string after year pattern "(2020)" or "2020."
  const yearMatch = ref.match(/\((\d{4})\)|\b(19|20)\d{2}[.,]/);
  if (yearMatch && yearMatch.index !== undefined) {
    const after = ref.slice(yearMatch.index + yearMatch[0].length).trim();

    // Heuristic: cut at first period that looks like end of title
    const firstDot = after.indexOf('.');
    if (firstDot > 20) {
      return after.slice(0, firstDot).trim();
    }

    if (after.length > 20) {
      return after;
    }
  }

  // 3) Fallback: truncate full reference
  return ref.slice(0, 200);
}

/**
 * Convenience helper: search arXiv using a full citation string by extracting
 * a likely title and delegating to the generic searchArxiv function.
 */
export async function searchArxivFromReference(
  reference: string
): Promise<ArxivResult | null> {
  const titleQuery = extractLikelyTitle(reference);
  return searchArxiv(titleQuery);
}

function stripTags(str: string): string {
  return str.replace(/<[^>]+>/g, '');
}

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
