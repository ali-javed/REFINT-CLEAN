// src/app/api/extract-references/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import { getSupabaseClient } from '@/utils/supabase/server';

async function extractReferencesFromPdf(
  buffer: Buffer,
  fileName: string
): Promise<string[]> {
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
  const references: string[] = [];
  let current = '';

  for (const line of lines) {
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
      references.push(current.trim());
      current = trimmed;
    } else {
      current = current ? `${current} ${trimmed}` : trimmed;
    }
  }
  if (current) references.push(current.trim());

  if (!references.length) {
    throw new Error(
      'Found the references section but could not split individual references – parser is too naive for this PDF.'
    );
  }

  console.log(
    `Parsed ${references.length} references from ${fileName}`
  );

  return references;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1) Extract references from the PDF
    const references = await extractReferencesFromPdf(buffer, file.name);

    // 2) Save them to Supabase
    const supabase = getSupabaseClient();
    const documentId = crypto.randomUUID();

    const rows = references.map((ref) => ({
      document_id: documentId,
      raw_reference: ref,
    }));

    const { error: insertError } = await supabase
      .from('references_list')
      .insert(rows);

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      throw new Error(
        `Failed to save references – ${insertError.message}`
      );
    }

    return NextResponse.json({
      documentId,
      referencesCount: references.length,
    });
  } catch (err) {
    console.error('Error in /api/extract-references:', err);
    const message =
      err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json(
      { error: `Server error – ${message}` },
      { status: 500 }
    );
  }
}
