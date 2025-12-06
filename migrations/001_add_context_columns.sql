-- Add context columns to references_list table for storing surrounding sentences
ALTER TABLE public.references_list
ADD COLUMN IF NOT EXISTS context_before TEXT,
ADD COLUMN IF NOT EXISTS context_after TEXT;

-- Create indexes for faster queries if needed
CREATE INDEX IF NOT EXISTS idx_references_list_context_before ON public.references_list USING GIN (to_tsvector('english', context_before));
CREATE INDEX IF NOT EXISTS idx_references_list_context_after ON public.references_list USING GIN (to_tsvector('english', context_after));
