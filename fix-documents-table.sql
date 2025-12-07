-- Fix documents table by recreating it to force schema cache refresh
-- Run this in Supabase SQL Editor

-- 1. Backup existing data (if any)
CREATE TEMP TABLE documents_backup AS SELECT * FROM documents;

-- 2. Drop the problematic table
DROP TABLE IF EXISTS documents CASCADE;

-- 3. Recreate table with all columns
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anon_session_id UUID REFERENCES anon_sessions(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT,
  status TEXT NOT NULL CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
  overall_integrity_score NUMERIC(5,2),
  total_references INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR anon_session_id IS NOT NULL)
);

-- 4. Restore data (if there was any)
INSERT INTO documents SELECT * FROM documents_backup;

-- 5. Recreate indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_anon_session_id ON documents(anon_session_id);
CREATE INDEX idx_documents_status ON documents(status);

-- 6. Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 7. Recreate policies
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

-- 8. Recreate trigger
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Force schema reload
NOTIFY pgrst, 'reload schema';

SELECT 'Documents table recreated successfully!' as message;
