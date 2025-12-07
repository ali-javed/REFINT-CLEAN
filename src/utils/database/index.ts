/**
 * Database utilities barrel export
 * Provides centralized access to all database operations and types
 */

// Type exports
export type * from '@/types/database';

// Supabase client exports
export { getSupabaseClient, getSupabaseServiceClient } from '@/utils/supabase/client';
export { getBrowserSupabaseClient } from '@/utils/supabase/browser';

// Database operation exports
export {
  // Anonymous session operations
  createAnonSession,
  getAnonSessionByToken,
  getOrCreateAnonSession,
  incrementAnonSessionUploads,

  // Document operations
  createDocument,
  updateDocumentStatus,
  getDocumentWithReferences,
  calculateDocumentIntegrityScore,

  // Document reference operations
  createDocumentReferences,
  updateDocumentReferenceIntegrity,
  batchUpdateReferenceIntegrity,
  getDocumentReferences,

  // Feedback operations
  createAuditFeedback,

  // Processing job operations
  createProcessingJob,
  updateProcessingJobStatus,

  // Analytics operations
  logUserAction,
} from '@/utils/database/operations';
