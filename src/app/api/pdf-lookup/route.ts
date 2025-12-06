import { NextRequest, NextResponse } from 'next/server';
import { findMatchingPdf, extractPdfSummary } from '@/utils/pdf-repo';
import { analyzeReferenceIntegrity } from '@/utils/integrity-analyzer';

export async function POST(req: NextRequest) {
  try {
    const { reference, context_before, context_after } = await req.json();

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

    if (!summary) {
      return NextResponse.json({
        found: false,
        message: 'Could not extract summary from PDF',
      });
    }

    // Build context from before and after
    const fullContext = [context_before, context_after]
      .filter(Boolean)
      .join(' [...citation...] ');

    // Analyze reference integrity using OpenAI (only for found papers)
    let integrityReview = {
      score: 10,
      justification: 'Paper found in repository',
      analyzed: false,
    };

    if (process.env.OPENAI_API_KEY) {
      try {
        const review = await analyzeReferenceIntegrity(
          reference,
          fullContext || reference,
          summary
        );
        if (review.score > 0) {
          integrityReview = {
            score: review.score,
            justification: review.justification,
            analyzed: true,
          };
        }
      } catch (err) {
        console.error('OpenAI analysis failed:', err);
        // Fall back to default score
      }
    }

    return NextResponse.json({
      found: true,
      fileName: matchingPdfFileName,
      summary,
      integrity: integrityReview,
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
