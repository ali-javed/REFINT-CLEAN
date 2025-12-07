-- Add context columns to document_references table

ALTER TABLE document_references 
ADD COLUMN IF NOT EXISTS context_before TEXT,
ADD COLUMN IF NOT EXISTS context_after TEXT;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
