# Database Utilities

Comprehensive TypeScript utilities for interacting with the Supabase database.

## Quick Start

```typescript
import {
  createAnonSession,
  createDocument,
  createDocumentReferences,
  updateDocumentReferenceIntegrity,
  getDocumentWithReferences,
  createAuditFeedback,
} from '@/utils/database';
```

## Type Definitions

All database types are available from `@/types/database.ts`:

```typescript
import type {
  Document,
  DocumentReference,
  AnonSession,
  AuditFeedback,
  // ... and more
} from '@/types/database';
```

## Core Operations

### 1. Anonymous Sessions

Create and manage anonymous user sessions for users without accounts:

```typescript
// Create a new anonymous session
const session = await createAnonSession();
// Returns: { id, client_token, documents_uploaded, ... }

// Or provide your own token
const session = await createAnonSession('my-unique-token');

// Get or create session (idempotent)
const session = await getOrCreateAnonSession('client-token');

// Get existing session by token
const session = await getAnonSessionByToken('client-token');
```

### 2. Document Upload

Upload a document linked to either a user or anonymous session:

```typescript
// For authenticated users
const document = await createDocument({
  filename: 'research-paper.pdf',
  fileSize: 1024000,
  mimeType: 'application/pdf',
  storagePath: 'uploads/abc123.pdf',
  userId: 'user-uuid',
});

// For anonymous users
const document = await createDocument({
  filename: 'paper.pdf',
  fileSize: 512000,
  mimeType: 'application/pdf',
  anonSessionId: 'anon-session-uuid',
});

// Update document status as processing progresses
await updateDocumentStatus(documentId, 'processing');
await updateDocumentStatus(documentId, 'completed', 85.5); // with integrity score
```

### 3. Save Parsed References

After parsing a document, save the extracted references:

```typescript
const references = await createDocumentReferences(documentId, [
  {
    rawCitationText: 'Smith, J. (2020). Example paper. Nature, 123(4), 567-890.',
    parsedTitle: 'Example paper',
    parsedAuthors: ['Smith, J.'],
    parsedYear: 2020,
    contextBefore: 'Previous studies have shown...',
    contextAfter: '...which confirms our hypothesis.',
    claimText: 'Studies confirm the hypothesis',
    positionInDoc: 0,
  },
  {
    rawCitationText: 'Doe, A. et al. (2019). Another study. Science.',
    parsedTitle: 'Another study',
    parsedAuthors: ['Doe, A.'],
    parsedYear: 2019,
    positionInDoc: 1,
  },
]);
```

### 4. Update Integrity Scores

After AI verification, update integrity scores and explanations:

```typescript
// Single reference update
await updateDocumentReferenceIntegrity(
  referenceId,
  85, // integrity score (0-100)
  'The reference accurately supports the claim made in the text.',
  'matched' // optional: match_status
);

// Batch update multiple references
await batchUpdateReferenceIntegrity([
  {
    referenceId: 'ref-1-uuid',
    integrityScore: 92,
    integrityExplanation: 'Perfect match',
    matchStatus: 'matched',
  },
  {
    referenceId: 'ref-2-uuid',
    integrityScore: 45,
    integrityExplanation: 'Weak support for claim',
    matchStatus: 'matched',
  },
]);

// Calculate overall document integrity score
const avgScore = await calculateDocumentIntegrityScore(documentId);
```

### 5. Fetch References with Feedback

Retrieve all references for a document with associated feedback:

```typescript
// Get references only
const references = await getDocumentReferences(documentId);
// Returns: DocumentReferenceWithFeedback[]

// Get complete document with references
const document = await getDocumentWithReferences(documentId);
// Returns: { ...document, document_references: [...] }
```

### 6. User Feedback

Allow users to provide feedback on reference integrity:

```typescript
// For authenticated users
await createAuditFeedback({
  documentReferenceId: 'ref-uuid',
  feedbackType: 'inaccurate',
  comment: 'The claim does not match the reference content',
  userId: 'user-uuid',
});

// For anonymous users
await createAuditFeedback({
  documentReferenceId: 'ref-uuid',
  feedbackType: 'accurate',
  comment: 'Spot on!',
  anonSessionId: 'anon-session-uuid',
});
```

### 7. Processing Jobs

Track long-running operations:

```typescript
// Create a processing job
const job = await createProcessingJob(documentId, 'verify_integrity');

// Update job status as it progresses
await updateProcessingJobStatus(job.id, 'running');
await updateProcessingJobStatus(job.id, 'completed');

// Or mark as failed with error message
await updateProcessingJobStatus(
  job.id,
  'failed',
  'API rate limit exceeded'
);
```

### 8. Analytics

Log user actions for analytics:

```typescript
await logUserAction({
  documentId: 'doc-uuid',
  actionType: 'upload',
  userId: 'user-uuid', // or anonSessionId
});

await logUserAction({
  documentId: 'doc-uuid',
  actionType: 'view_report',
  anonSessionId: 'anon-session-uuid',
});

await logUserAction({
  documentId: 'doc-uuid',
  actionType: 'export_pdf',
  userId: 'user-uuid',
});
```

## Complete Workflow Example

```typescript
import {
  getOrCreateAnonSession,
  createDocument,
  createDocumentReferences,
  updateDocumentStatus,
  updateDocumentReferenceIntegrity,
  calculateDocumentIntegrityScore,
  logUserAction,
} from '@/utils/database';

// 1. Get or create anonymous session
const session = await getOrCreateAnonSession(clientToken);

// 2. Create document record
const document = await createDocument({
  filename: 'paper.pdf',
  fileSize: 1024000,
  mimeType: 'application/pdf',
  anonSessionId: session.id,
});

// Log upload action
await logUserAction({
  documentId: document.id,
  actionType: 'upload',
  anonSessionId: session.id,
});

// 3. Update to processing status
await updateDocumentStatus(document.id, 'processing');

// 4. Parse and save references
const references = await createDocumentReferences(document.id, [
  {
    rawCitationText: 'Smith (2020). Example. Nature.',
    parsedTitle: 'Example',
    parsedAuthors: ['Smith'],
    parsedYear: 2020,
    claimText: 'The example demonstrates...',
  },
]);

// 5. Update integrity scores after AI verification
await updateDocumentReferenceIntegrity(
  references[0].id,
  87,
  'Strong support for the claim'
);

// 6. Calculate overall document score
await calculateDocumentIntegrityScore(document.id);

// 7. Update to completed status
await updateDocumentStatus(document.id, 'completed');
```

## Enums and Constants

Available enum values:

```typescript
// Plan types
'free' | 'academic' | 'pro'

// Document status
'uploaded' | 'processing' | 'completed' | 'failed'

// Match status
'pending' | 'matched' | 'not_found' | 'ambiguous' | 'error'

// Job types
'parse_references' | 'match_canonical' | 'verify_integrity'

// Job status
'queued' | 'running' | 'completed' | 'failed'

// Action types
'upload' | 'view_report' | 'export_pdf'

// Feedback types
'accurate' | 'inaccurate' | 'misleading' | 'missing_context'
```

## Error Handling

All functions throw descriptive errors that you should catch:

```typescript
try {
  const document = await createDocument({
    filename: 'paper.pdf',
    fileSize: 1024000,
    mimeType: 'application/pdf',
    anonSessionId: session.id,
  });
} catch (error) {
  console.error('Failed to create document:', error.message);
  // Handle error appropriately
}
```

## Environment Variables

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: for service role operations (bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Client vs Server

```typescript
// Server-side (API routes, server components)
import { getSupabaseClient } from '@/utils/supabase/client';

// Browser-side (client components)
import { getBrowserSupabaseClient } from '@/utils/supabase/browser';

// Service role (admin operations, bypasses RLS)
import { getSupabaseServiceClient } from '@/utils/supabase/client';
```

## Type Safety

All operations are fully typed with TypeScript:

```typescript
import type {
  Document,
  DocumentInsert,
  DocumentUpdate,
  DocumentReference,
  DocumentReferenceWithFeedback,
} from '@/types/database';

const doc: Document = await createDocument({...});
const refs: DocumentReferenceWithFeedback[] = await getDocumentReferences(docId);
```
