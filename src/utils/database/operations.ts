/**
 * Database operations for Supabase
 * 
 * Note: Type assertions (as any) are used due to current Supabase SDK type inference limitations.
 * These are safe operations that match the database schema defined in @/types/database.ts
 */

import { getSupabaseClient } from '@/utils/supabase/client';
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
  const supabase = getSupabaseClient();
  
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
  const supabase = getSupabaseClient();

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
  const supabase = getSupabaseClient();

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
  const supabase = getSupabaseClient();

  if (!params.userId && !params.anonSessionId) {
    throw new Error('Either userId or anonSessionId must be provided');
  }

  const documentData: DocumentInsert = {
    filename: params.filename,
    file_size: params.fileSize,
    mime_type: params.mimeType,
    storage_path: params.storagePath || null,
    user_id: params.userId || null,
    anon_session_id: params.anonSessionId || null,
    status: 'uploaded',
    total_references: 0,
  };

  const { data, error } = await supabase
    .from('documents')
    .insert(documentData as any)
    .select()
    .single();

  if (error) {
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
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('documents')
    .update({
      status,
      overall_integrity_score: overallIntegrityScore ?? undefined,
      updated_at: new Date().toISOString(),
    } as any)
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
  const supabase = getSupabaseClient();

  const referencesData: DocumentReferenceInsert[] = references.map((ref, index) => ({
    document_id: documentId,
    raw_citation_text: ref.rawCitationText,
    parsed_title: ref.parsedTitle || null,
    parsed_authors: ref.parsedAuthors || null,
    parsed_year: ref.parsedYear || null,
    context_before: ref.contextBefore || null,
    context_after: ref.contextAfter || null,
    claim_text: ref.claimText || null,
    position_in_doc: ref.positionInDoc ?? index,
    match_status: 'pending',
  }));

  const { data, error } = await supabase
    .from('document_references')
    .insert(referencesData as any)
    .select();

  if (error) {
    throw new Error(`Failed to create document references: ${error.message}`);
  }

  // Update document with total reference count
  await supabase
    .from('documents')
    .update({
      total_references: references.length,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', documentId);

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
  const supabase = getSupabaseClient();

  const updateData: DocumentReferenceUpdate = {
    integrity_score: integrityScore,
    integrity_explanation: integrityExplanation,
    match_status: matchStatus || 'matched',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('document_references')
    .update(updateData as any)
    .eq('id', referenceId)
    .select()
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
  const supabase = getSupabaseClient();

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
  const supabase = getSupabaseClient();

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
  const supabase = getSupabaseClient();

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
  const supabase = getSupabaseClient();

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
 */
export async function calculateDocumentIntegrityScore(documentId: string) {
  const supabase = getSupabaseClient();

  // Get all references with integrity scores
  const { data: references, error } = await supabase
    .from('document_references')
    .select('integrity_score')
    .eq('document_id', documentId)
    .not('integrity_score', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch references for score calculation: ${error.message}`);
  }

  if (!references || references.length === 0) {
    return null;
  }

  // Calculate average integrity score
  const scores = (references as any[])
    .map((ref: any) => ref.integrity_score)
    .filter((score): score is number => score !== null);

  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

  // Update document with calculated score
  await supabase
    .from('documents')
    .update({
      overall_integrity_score: Math.round(averageScore * 100) / 100, // Round to 2 decimal places
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', documentId);

  return averageScore;
}

/**
 * Create a processing job for tracking long-running operations
 */
export async function createProcessingJob(
  documentId: string,
  jobType: 'parse_references' | 'match_canonical' | 'verify_integrity'
) {
  const supabase = getSupabaseClient();

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
  const supabase = getSupabaseClient();

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
  const supabase = getSupabaseClient();

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
