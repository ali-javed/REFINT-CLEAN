import { NextRequest, NextResponse } from 'next/server';
import {
  getDocumentWithReferences,
  createAuditFeedback,
  logUserAction,
} from '@/utils/database';

/**
 * Example API route for fetching document results with references
 * GET /api/examples/document-results?documentId=xxx&clientToken=yyy
 * 
 * This shows how to retrieve a complete document with all references and feedback
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const clientToken = searchParams.get('clientToken');

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    // Fetch document with all references and feedback
    const document = await getDocumentWithReferences(documentId);

    // Log view action (if we have session info)
    if (clientToken) {
      try {
        await logUserAction({
          documentId: document.id,
          actionType: 'view_report',
          anonSessionId: document.anon_session_id || undefined,
          userId: document.user_id || undefined,
        });
      } catch (err) {
        // Don't fail the request if logging fails
        console.warn('[document-results] Failed to log view action:', err);
      }
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        status: document.status,
        overallIntegrityScore: document.overall_integrity_score,
        totalReferences: document.total_references,
        createdAt: document.created_at,
        references: document.document_references.map((ref) => ({
          id: ref.id,
          rawCitation: ref.raw_citation_text,
          parsedTitle: ref.parsed_title,
          parsedAuthors: ref.parsed_authors,
          parsedYear: ref.parsed_year,
          claimText: ref.claim_text,
          integrityScore: ref.integrity_score,
          integrityExplanation: ref.integrity_explanation,
          matchStatus: ref.match_status,
          feedback: ref.feedback || [],
          canonicalReference: ref.canonical_reference || null,
        })),
      },
    });

  } catch (error) {
    console.error('[document-results] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Submit feedback for a reference
 * POST /api/examples/document-results
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      documentReferenceId,
      feedbackType,
      comment,
      userId,
      anonSessionId,
    } = body;

    if (!documentReferenceId || !feedbackType) {
      return NextResponse.json(
        { error: 'documentReferenceId and feedbackType are required' },
        { status: 400 }
      );
    }

    // Create feedback
    const feedback = await createAuditFeedback({
      documentReferenceId,
      feedbackType,
      comment,
      userId,
      anonSessionId,
    });

    return NextResponse.json({
      success: true,
      feedback,
      message: 'Thank you for your feedback!',
    });

  } catch (error) {
    console.error('[document-results] Feedback error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
