import { NextRequest, NextResponse } from 'next/server';
import { findMatchingPdf, extractPdfSummary } from '@/utils/pdf-repo';
import { analyzeReferenceIntegrity } from '@/utils/integrity-analyzer';
import { searchArxivFromReference } from '@/utils/arxiv';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { reference, context_before, context_after } = await req.json();

    if (!reference) {
      return NextResponse.json(
        { error: 'No reference provided' },
        { status: 400 }
      );
    }

    // Find matching PDF in repo first
    const matchingPdfFileName = findMatchingPdf(reference);

    let source: 'repo' | 'arxiv' | null = null;
    let summary: string | null = null;
    let fileName: string | null = null;
    let fileExists: boolean | null = null;
    let arxiv = null as
      | null
      | {
          title?: string;
          link?: string;
          pdfUrl?: string;
          id?: string;
          published?: string;
        };

    if (matchingPdfFileName) {
      source = 'repo';
      fileName = matchingPdfFileName;
      summary = await extractPdfSummary(matchingPdfFileName);
      const papersPath = path.join(process.cwd(), 'public', 'papers', matchingPdfFileName);
      fileExists = fs.existsSync(papersPath);
    } else {
      // Fallback to arXiv search using a smarter query derived from the reference
      const arxivResult = await searchArxivFromReference(reference);
      if (arxivResult) {
        source = 'arxiv';
        summary = arxivResult.summary || null;
        arxiv = {
          title: arxivResult.title,
          link: arxivResult.link,
          pdfUrl: arxivResult.pdfUrl,
          id: arxivResult.id,
          published: arxivResult.published,
        };
      }
    }

    if (!source || !summary) {
      return NextResponse.json({
        found: false,
        message: 'PDF not found in repository or arXiv',
      });
    }

    // Build context from before and after
    const fullContext = [context_before, context_after]
      .filter(Boolean)
      .join(' [...citation...] ');

    // Analyze reference integrity using OpenAI (only when summary available)
    let integrityReview = {
      score: 10,
      justification: source === 'repo' ? 'Paper found in repository' : 'Paper found on arXiv',
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
      source,
      fileName,
      summary,
      integrity: integrityReview,
      arxiv,
      fileExists,
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
