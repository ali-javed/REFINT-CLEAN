import { NextRequest, NextResponse } from 'next/server';
import { findMatchingPdf, extractPdfSummary } from '@/utils/pdf-repo';

export async function POST(req: NextRequest) {
  try {
    const { reference } = await req.json();

    if (!reference) {
      return NextResponse.json(
        { error: 'No reference provided' },
        { status: 400 }
      );
    }

    // Find matching PDF in repo
    const matchingPdfFileName = findMatchingPdf(reference);

    if (!matchingPdfFileName) {
      return NextResponse.json({
        found: false,
        message: 'PDF not found in repository',
      });
    }

    // Extract summary from the PDF
    const summary = await extractPdfSummary(matchingPdfFileName);

    return NextResponse.json({
      found: true,
      fileName: matchingPdfFileName,
      summary: summary || 'Summary could not be extracted',
    });
  } catch (err) {
    console.error('Error in /api/pdf-lookup:', err);
    const message =
      err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json(
      { error: `Server error – ${message}` },
      { status: 500 }
    );
  }
}
