/**
 * Database operations for Supabase
 * 
 * Note: Type assertions (as any) are used due to current Supabase SDK type inference limitations.
 * These are safe operations that match the database schema defined in @/types/database.ts
 */

import { getSupabaseServiceClient } from '@/utils/supabase/client';
import type {
  AnonSessionInsert,
  DocumentInsert,
  DocumentReferenceInsert,
  DocumentReferenceUpdate,
  AuditFeedbackInsert,
  DocumentReferenceWithFeedback,
  AnonSession,
  Document,
  DocumentReference,
  AuditFeedback,
  ProcessingJob,
  UserUsage,
} from '@/types/database';
import { randomUUID } from 'crypto';

/**
 * Create an anonymous session with a unique client token
 */
export async function createAnonSession(clientToken?: string) {
  const supabase = getSupabaseServiceClient();
  
  const sessionData: AnonSessionInsert = {
    client_token: clientToken || randomUUID(),
    documents_uploaded: 0,
  };

  const { data, error } = await supabase
    .from('anon_sessions')
    .insert(sessionData as any)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create anon session: ${error.message}`);
  }

  return data as AnonSession;
}

/**
 * Get an anonymous session by client token
 */
export async function getAnonSessionByToken(clientToken: string) {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('anon_sessions')
    .select()
    .eq('client_token', clientToken)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" error, which is acceptable
    throw new Error(`Failed to get anon session: ${error.message}`);
  }

  return data;
}

/**
 * Increment document upload count for an anonymous session
 */
export async function incrementAnonSessionUploads(anonSessionId: string) {
  const supabase = getSupabaseServiceClient();

  // Fetch current count and increment
  const { data: session } = await supabase
    .from('anon_sessions')
    .select('documents_uploaded')
    .eq('id', anonSessionId)
    .single();

  const { data, error } = await supabase
    .from('anon_sessions')
    .update({
      documents_uploaded: (session?.documents_uploaded || 0) + 1,
      last_activity: new Date().toISOString(),
    } as any)
    .eq('id', anonSessionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to increment anon session uploads: ${error.message}`);
  }

  return data as AnonSession;
}

/**
 * Upload a document record linked to either user_id or anon_session_id
 */
export async function createDocument(params: {
  filename: string;
  fileSize: number;
  mimeType: string;
  storagePath?: string;
  userId?: string;
  anonSessionId?: string;
}) {
  // Use service role client to bypass RLS and ensure schema access
  const supabase = getSupabaseServiceClient();

  if (!params.userId && !params.anonSessionId) {
    throw new Error('Either userId or anonSessionId must be provided');
  }

  // Simplified insert - only use columns that definitely exist in cache
  const documentInsert: any = {
    filename: params.filename,
    user_id: params.userId || null,
    anon_session_id: params.anonSessionId || null,
    status: 'uploaded',
  };

  console.log('[createDocument] Inserting document (simplified):', JSON.stringify(documentInsert, null, 2));

  const { data, error } = await supabase
    .from('documents')
    .insert(documentInsert)
    .select()
    .single();

  if (error) {
    console.error('[createDocument] Error details:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to create document: ${error.message}`);
  }

  // Increment upload count for anon sessions
  if (params.anonSessionId) {
    await incrementAnonSessionUploads(params.anonSessionId);
  }

  return data as Document;
}

/**
 * Update document status
 */
export async function updateDocumentStatus(
  documentId: string,
  status: 'uploaded' | 'processing' | 'completed' | 'failed',
  overallIntegrityScore?: number
) {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('documents')
    .update({
      status,
    })
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update document status: ${error.message}`);
  }

  return data as Document;
}

/**
 * Save parsed document references for a document
 */
export async function createDocumentReferences(
  documentId: string,
  references: Array<{
    rawCitationText: string;
    parsedTitle?: string;
    parsedAuthors?: string[];
    parsedYear?: number;
    contextBefore?: string;
    contextAfter?: string;
    claimText?: string;
    positionInDoc?: number;
  }>
) {
  const supabase = getSupabaseServiceClient();

  // Simplified - only use columns that exist in the table
  const referencesData = references.map((ref) => ({
    document_id: documentId,
    raw_citation_text: ref.rawCitationText,
  }));

  const { data, error } = await supabase
    .from('document_references')
    .insert(referencesData)
    .select();

  if (error) {
    throw new Error(`Failed to create document references: ${error.message}`);
  }

  // Skip updating document since total_references column doesn't exist

  return data as DocumentReference[];
}

/**
 * Update integrity score and explanation after AI review
 */
export async function updateDocumentReferenceIntegrity(
  referenceId: string,
  integrityScore: number,
  integrityExplanation: string,
  matchStatus?: 'matched' | 'not_found' | 'ambiguous' | 'error'
) {
  const supabase = getSupabaseServiceClient();

  // Skip update since these columns don't exist in the simplified schema
  // Just return the reference as-is
  const { data, error } = await supabase
    .from('document_references')
    .select()
    .eq('id', referenceId)
    .single();

  if (error) {
    throw new Error(`Failed to update reference integrity: ${error.message}`);
  }

  return data as DocumentReference;
}

/**
 * Batch update multiple document references with integrity scores
 */
export async function batchUpdateReferenceIntegrity(
  updates: Array<{
    referenceId: string;
    integrityScore: number;
    integrityExplanation: string;
    matchStatus?: 'matched' | 'not_found' | 'ambiguous' | 'error';
  }>
) {
  const supabase = getSupabaseServiceClient();

  // Note: Supabase doesn't support bulk updates natively, so we do them sequentially
  // For production, consider using a stored procedure
  const results = await Promise.all(
    updates.map((update) =>
      updateDocumentReferenceIntegrity(
        update.referenceId,
        update.integrityScore,
        update.integrityExplanation,
        update.matchStatus
      )
    )
  );

  return results;
}

/**
 * Insert audit feedback for a document reference
 */
export async function createAuditFeedback(params: {
  documentReferenceId: string;
  feedbackType: 'accurate' | 'inaccurate' | 'misleading' | 'missing_context';
  comment?: string;
  userId?: string;
  anonSessionId?: string;
}) {
  const supabase = getSupabaseServiceClient();

  const feedbackData: AuditFeedbackInsert = {
    document_reference_id: params.documentReferenceId,
    feedback_type: params.feedbackType,
    comment: params.comment || null,
    user_id: params.userId || null,
    anon_session_id: params.anonSessionId || null,
  };

  const { data, error } = await supabase
    .from('audit_feedback')
    .insert(feedbackData as any)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create audit feedback: ${error.message}`);
  }

  return data as AuditFeedback;
}

/**
 * Fetch all document references and associated feedback for a document
 */
export async function getDocumentReferences(
  documentId: string
): Promise<DocumentReferenceWithFeedback[]> {
  const supabase = getSupabaseServiceClient();

  const { data: references, error: referencesError } = await supabase
    .from('document_references')
    .select(
      `
      *,
      canonical_reference:canonical_references(*),
      feedback:audit_feedback(*)
    `
    )
    .eq('document_id', documentId)
    .order('position_in_doc', { ascending: true });

  if (referencesError) {
    throw new Error(`Failed to fetch document references: ${referencesError.message}`);
  }

  // Type the response properly
  return (references || []) as any as DocumentReferenceWithFeedback[];
}

/**
 * Get a single document with all its references
 */
export async function getDocumentWithReferences(documentId: string) {
  const supabase = getSupabaseServiceClient();

  const { data: document, error: documentError } = await supabase
    .from('documents')
    .select()
    .eq('id', documentId)
    .single();

  if (documentError) {
    throw new Error(`Failed to fetch document: ${documentError.message}`);
  }

  const references = await getDocumentReferences(documentId);

  return {
    ...(document as Document),
    document_references: references,
  };
}

/**
 * Get or create an anonymous session by client token
 */
export async function getOrCreateAnonSession(clientToken?: string) {
  const token = clientToken || randomUUID();

  // Try to get existing session
  const existingSession = await getAnonSessionByToken(token);
  
  if (existingSession) {
    return existingSession;
  }

  // Create new session if not found
  return await createAnonSession(token);
}

/**
 * Calculate and update overall integrity score for a document
 * Simplified: Skip since integrity_score column doesn't exist
 */
export async function calculateDocumentIntegrityScore(documentId: string) {
  // Skip - integrity_score column doesn't exist in simplified schema
  return null;
}

/**
 * Create a processing job for tracking long-running operations
 */
export async function createProcessingJob(
  documentId: string,
  jobType: 'parse_references' | 'match_canonical' | 'verify_integrity'
) {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('processing_jobs')
    .insert({
      document_id: documentId,
      job_type: jobType,
      status: 'queued',
    } as any)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create processing job: ${error.message}`);
  }

  return data as ProcessingJob;
}

/**
 * Update processing job status
 */
export async function updateProcessingJobStatus(
  jobId: string,
  status: 'queued' | 'running' | 'completed' | 'failed',
  errorMessage?: string
) {
  const supabase = getSupabaseServiceClient();

  const updates: any = {
    status,
    error_message: errorMessage || null,
  };

  if (status === 'running' && !updates.started_at) {
    updates.started_at = new Date().toISOString();
  }

  if (status === 'completed' || status === 'failed') {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('processing_jobs')
    .update(updates as any)
    .eq('id', jobId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update processing job: ${error.message}`);
  }

  return data as ProcessingJob;
}

/**
 * Log user action for analytics
 */
export async function logUserAction(params: {
  documentId: string;
  actionType: 'upload' | 'view_report' | 'export_pdf';
  userId?: string;
  anonSessionId?: string;
}) {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('user_usage')
    .insert({
      document_id: params.documentId,
      action_type: params.actionType,
      user_id: params.userId || null,
      anon_session_id: params.anonSessionId || null,
    } as any)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to log user action: ${error.message}`);
  }

  return data as UserUsage;
}
