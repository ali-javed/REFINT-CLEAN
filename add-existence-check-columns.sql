-- Add existence check and context integrity columns to document_references
-- Run this in Supabase SQL Editor after running fresh-schema.sql

ALTER TABLE public.document_references
ADD COLUMN IF NOT EXISTS existence_score INTEGER,
ADD COLUMN IF NOT EXISTS existence_check TEXT,
ADD COLUMN IF NOT EXISTS context_integrity_score INTEGER,
ADD COLUMN IF NOT EXISTS context_integrity_review TEXT;

COMMENT ON COLUMN public.document_references.existence_score IS 'AI score 0-100 for reference formatting and completeness';
COMMENT ON COLUMN public.document_references.existence_check IS 'AI explanation of existence/formatting check';
COMMENT ON COLUMN public.document_references.context_integrity_score IS 'AI score 0-100 for how well the reference aligns with its usage context';
COMMENT ON COLUMN public.document_references.context_integrity_review IS 'AI review of context alignment with referenced paper';
