-- Drop and recreate document_references table with correct schema
DROP TABLE IF EXISTS document_references CASCADE;

CREATE TABLE document_references (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  raw_citation_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_document_references_document_id ON document_references(document_id);

-- Enable RLS
ALTER TABLE document_references ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view own document references" ON document_references
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_references.document_id 
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create document references" ON document_references
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_references.document_id 
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own document references" ON document_references
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_references.document_id 
      AND documents.user_id = auth.uid()
    )
  );

-- Create policies for anonymous users
CREATE POLICY "Anon users can view session document references" ON document_references
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_references.document_id 
      AND documents.anon_session_id IS NOT NULL
    )
  );

CREATE POLICY "Anon users can create session document references" ON document_references
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_references.document_id 
      AND documents.anon_session_id IS NOT NULL
    )
  );

-- Create trigger
CREATE TRIGGER update_document_references_updated_at BEFORE UPDATE ON document_references
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Force schema reload
NOTIFY pgrst, 'reload schema';

SELECT 'Document references table recreated with minimal required columns!' as message;
