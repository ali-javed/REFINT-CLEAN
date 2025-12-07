-- Drop and recreate documents table with correct schema
DROP TABLE IF EXISTS documents CASCADE;

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anon_session_id UUID REFERENCES anon_sessions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR anon_session_id IS NOT NULL)
);

-- Create indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_anon_session_id ON documents(anon_session_id);
CREATE INDEX idx_documents_status ON documents(status);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anon users can view session documents" ON documents
  FOR SELECT USING (anon_session_id IS NOT NULL);

CREATE POLICY "Anon users can create session documents" ON documents
  FOR INSERT WITH CHECK (anon_session_id IS NOT NULL);

-- Create trigger
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Force schema reload
NOTIFY pgrst, 'reload schema';

SELECT 'Documents table recreated with minimal required columns!' as message;
