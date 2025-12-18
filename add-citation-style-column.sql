-- Add citation_style column to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS citation_style TEXT;

-- Add comment
COMMENT ON COLUMN documents.citation_style IS 'Detected citation style: IEEE, Vancouver, APA, Harvard, Chicago-AuthorDate, Chicago-Notes, MLA, BibTeX, etc.';
