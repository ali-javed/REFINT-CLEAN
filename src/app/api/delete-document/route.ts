import { NextRequest, NextResponse } from 'next/server';
import { deleteDocument } from '@/utils/database/operations';
import { getSupabaseServiceClient } from '@/utils/supabase/client';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const userId = searchParams.get('userId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 401 }
      );
    }

    // Verify ownership before deleting
    const supabase = getSupabaseServiceClient();
    const { data: docs, error: fetchError } = await supabase
      .from('documents')
      .select('user_id')
      .eq('id', documentId);

    if (fetchError || !docs || docs.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const doc = docs[0] as any;

    // Check ownership
    if (doc.user_id !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to delete this document' },
        { status: 403 }
      );
    }

    // Delete the document
    await deleteDocument(documentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[delete-document] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete document' },
      { status: 500 }
    );
  }
}
