-- Add all missing columns to document_references table
-- This includes context columns and other metadata fields

ALTER TABLE document_references 
ADD COLUMN IF NOT EXISTS context_before TEXT,
ADD COLUMN IF NOT EXISTS context_after TEXT,
ADD COLUMN IF NOT EXISTS position_in_doc INTEGER,
ADD COLUMN IF NOT EXISTS parsed_title TEXT,
ADD COLUMN IF NOT EXISTS parsed_authors TEXT[],
ADD COLUMN IF NOT EXISTS parsed_year INTEGER,
ADD COLUMN IF NOT EXISTS claim_text TEXT,
ADD COLUMN IF NOT EXISTS integrity_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS integrity_explanation TEXT,
ADD COLUMN IF NOT EXISTS match_status TEXT,
ADD COLUMN IF NOT EXISTS canonical_reference_id UUID REFERENCES canonical_references(id) ON DELETE SET NULL;

-- Add missing columns to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS mime_type TEXT,
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS overall_integrity_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS total_references INTEGER DEFAULT 0;

-- Create index on position_in_doc for better query performance
CREATE INDEX IF NOT EXISTS idx_document_references_position 
ON document_references(document_id, position_in_doc);

-- Create index on integrity_score for filtering
CREATE INDEX IF NOT EXISTS idx_document_references_integrity_score 
ON document_references(integrity_score);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
