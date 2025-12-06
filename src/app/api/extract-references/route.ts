// src/app/api/extract-references/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { getSupabaseClient } from '@/utils/supabase/server';
import path from 'path';

// Configure PDF worker - required for pdf-parse to work in Node.js
const workerPath = path.join(
  process.cwd(),
  'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
);
pdfjs.GlobalWorkerOptions.workerSrc = workerPath;

interface ReferenceWithContext {
  raw_reference: string;
  context_before: string | null;
  context_after: string | null;
}

async function extractReferencesFromPdf(
  buffer: Buffer,
  fileName: string
): Promise<ReferenceWithContext[]> {
  // PDFParse is a class - instantiate it with options
  const pdfParser = new PDFParse({ data: buffer });
  const textData = await pdfParser.getText();
  const rawText = textData.text || '';

  if (!rawText.trim()) {
    throw new Error('PDF text is empty or could not be parsed');
  }

  // Normalise line endings and clean up binary/corrupted data
  let text = rawText.replace(/\r\n/g, '\n');
  // Remove excessive binary/corrupted sequences (common in poorly-formed PDFs)
  text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, ' ');
  
  const lower = text.toLowerCase();

  let startIndex = -1;

  // 1) Best case: "References" on its own line
  const headingRegex = /(^|\n)\s*references\s*$/im;
  const match = headingRegex.exec(text);
  if (match && match.index !== undefined) {
    const afterHeadingNewline = text.indexOf('\n', match.index + match[0].length);
    startIndex =
      afterHeadingNewline === -1
        ? match.index + match[0].length
        : afterHeadingNewline + 1;
  }

  // 2) Fallback: look for "REFERENCES" or "Bibliography" sections
  if (startIndex === -1) {
    const altMatch = /\n\s*(REFERENCES|BIBLIOGRAPHY|References|Bibliography)\s*\n/i.exec(text);
    if (altMatch && altMatch.index !== undefined) {
      startIndex = altMatch.index + altMatch[0].length;
    }
  }

  // 3) Final fallback: last occurrence of the word "references" anywhere
  if (startIndex === -1) {
    const idx = lower.lastIndexOf('references');
    if (idx !== -1) {
      const after = text.indexOf('\n', idx);
      startIndex = after === -1 ? idx + 'references'.length : after + 1;
    }
  }

  if (startIndex === -1) {
    throw new Error(
      'Could not detect any references section in this PDF. Try another file or adjust the parser.'
    );
  }

  const refsBlock = text.slice(startIndex).trim();
  if (!refsBlock) {
    throw new Error(
      'Found a "References" heading but no content after it – parser may need tuning.'
    );
  }

  // Split into lines and then group lines that belong to the same reference.
  // This is deliberately simple but works well for typical journal PDFs
  const lines = refsBlock.split(/\n+/);
  const references: ReferenceWithContext[] = [];
  let current = '';
  let currentLineIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Heuristics for "this looks like the start of a new reference":
    //  - Starts with "Surname, X." style
    //  - OR starts with [1], [2] etc
    //  - OR starts with "1." / "2." style
    //  - OR starts with capital letter followed by space/lowercase (common author pattern)
    const looksLikeStart =
      /^[A-Z][^,]{1,80},/.test(trimmed) || // Author, ...
      /^\[\d+\]/.test(trimmed) || // [1] Author...
      /^\d+\./.test(trimmed) || // 1. Author...
      /^[A-Z][a-z]+\s+[A-Z][a-z]+[\s,.]/.test(trimmed); // FirstName LastName pattern

    if (looksLikeStart && current) {
      references.push({
        raw_reference: current.trim(),
        context_before: null,
        context_after: null,
      });
      current = trimmed;
      currentLineIndex = i;
    } else {
      current = current ? `${current} ${trimmed}` : trimmed;
    }
  }
  if (current) {
    references.push({
      raw_reference: current.trim(),
      context_before: null,
      context_after: null,
    });
  }

  if (!references.length) {
    throw new Error(
      'Found the references section but could not split individual references – parser is too naive for this PDF.'
    );
  }

  // Now extract context (100 words before and 50 words after) from full document
  const fullText = rawText.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, ' ');
  const words = fullText.match(/\S+/g) || [];
  
  for (const ref of references) {
    // Find words that cite this reference
    const refShortForm = extractRefKey(ref.raw_reference);
    if (refShortForm) {
      const contextWords = extractContextWords(
        words,
        refShortForm,
        100,
        50
      );
      ref.context_before = contextWords.before;
      ref.context_after = contextWords.after;
    }
  }

  console.log(
    `Parsed ${references.length} references from ${fileName}`
  );

  return references;
}

/**
 * Extract a short key from the reference (e.g., first author surname or [1] pattern)
 */
function extractRefKey(reference: string): string | null {
  // Try to extract [n] pattern
  const bracketMatch = reference.match(/^\[(\d+)\]/);
  if (bracketMatch) {
    return `[${bracketMatch[1]}]`;
  }

  // Try to extract numbered pattern (1. Author...)
  const numberMatch = reference.match(/^(\d+)\./);
  if (numberMatch) {
    return `.${numberMatch[1]}.`;
  }

  // Try to extract first author surname
  const authorMatch = reference.match(/^([A-Z][a-z]+)/);
  if (authorMatch) {
    return authorMatch[1];
  }

  return null;
}

/**
 * Extract previous and next N words containing the reference key
 */
function extractContextWords(
  words: string[],
  refKey: string,
  beforeCount: number,
  afterCount: number
): { before: string | null; after: string | null } {
  let foundIndex = -1;

  // Find the word containing the reference key (case-insensitive)
  const refKeyLower = refKey.toLowerCase();
  for (let i = 0; i < words.length; i++) {
    if (words[i].toLowerCase().includes(refKeyLower)) {
      foundIndex = i;
      break;
    }
  }

  if (foundIndex === -1) {
    return { before: null, after: null };
  }

  // Get previous N words
  const beforeStart = Math.max(0, foundIndex - beforeCount);
  const beforeWords = words.slice(beforeStart, foundIndex);

  // Get next N words
  const afterEnd = Math.min(words.length, foundIndex + afterCount + 1);
  const afterWords = words.slice(foundIndex + 1, afterEnd);

  return {
    before: beforeWords.length > 0 ? beforeWords.join(' ') : null,
    after: afterWords.length > 0 ? afterWords.join(' ') : null,
  };
}

export async function POST(req: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Supabase configuration missing. Contact administrator.' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1) Extract references with context from the PDF
    const referencesWithContext = await extractReferencesFromPdf(buffer, file.name);

    // 2) Save them to Supabase
    const supabase = getSupabaseClient();
    const documentId = crypto.randomUUID();

    const rows = referencesWithContext.map((ref) => ({
      document_id: documentId,
      raw_reference: ref.raw_reference,
      context_before: ref.context_before,
      context_after: ref.context_after,
    }));

    const { error: insertError } = await supabase
      .from('references_list')
      .insert(rows);

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return NextResponse.json(
        { error: `Database error: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      documentId,
      referencesCount: referencesWithContext.length,
    });
  } catch (err) {
    console.error('Error in /api/extract-references:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
