import { NextRequest, NextResponse } from 'next/server';
import {
  getOrCreateAnonSession,
  createDocument,
  createDocumentReferences,
  updateDocumentStatus,
  logUserAction,
} from '@/utils/database';

/**
 * Example API route demonstrating database operations
 * POST /api/examples/upload-workflow
 * 
 * This shows a complete document upload and reference parsing workflow
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientToken,
      filename,
      fileSize,
      mimeType,
      references, // Array of parsed references
      userId, // Optional: if user is authenticated
    } = body;

    // 1. Get or create anonymous session (if not authenticated)
    let anonSessionId: string | undefined;
    if (!userId) {
      const session = await getOrCreateAnonSession(clientToken);
      anonSessionId = session.id;
    }

    // 2. Create document record
    const document = await createDocument({
      filename,
      fileSize,
      mimeType,
      userId,
      anonSessionId,
    });

    // 3. Log upload action
    await logUserAction({
      documentId: document.id,
      actionType: 'upload',
      userId,
      anonSessionId,
    });

    // 4. Update status to processing
    await updateDocumentStatus(document.id, 'processing');

    // 5. Save parsed references
    if (references && references.length > 0) {
      await createDocumentReferences(document.id, references);
    }

    // 6. Return success response
    return NextResponse.json({
      success: true,
      documentId: document.id,
      message: 'Document uploaded and queued for processing',
    });

  } catch (error) {
    console.error('[upload-workflow] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
