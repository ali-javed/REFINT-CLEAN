-- ReferenceAudit Database Schema - SIMPLIFIED VERSION
-- Run this SQL in your Supabase SQL Editor
-- This is the minimal working schema that avoids PostgREST cache issues

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_edu_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Plans table
CREATE TABLE IF NOT EXISTS user_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'academic', 'pro')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  monthly_limit INTEGER NOT NULL DEFAULT 3,
  monthly_used INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add missing columns to user_plans if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='user_plans' AND column_name='user_id') THEN
    ALTER TABLE user_plans ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='user_plans' AND column_name='stripe_customer_id') THEN
    ALTER TABLE user_plans ADD COLUMN stripe_customer_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='user_plans' AND column_name='stripe_subscription_id') THEN
    ALTER TABLE user_plans ADD COLUMN stripe_subscription_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='user_plans' AND column_name='monthly_limit') THEN
    ALTER TABLE user_plans ADD COLUMN monthly_limit INTEGER NOT NULL DEFAULT 3;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='user_plans' AND column_name='monthly_used') THEN
    ALTER TABLE user_plans ADD COLUMN monthly_used INTEGER DEFAULT 0;
  END IF;
END $$;

-- 3. Anonymous Sessions table
CREATE TABLE IF NOT EXISTS anon_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_token TEXT NOT NULL UNIQUE,
  documents_uploaded INTEGER DEFAULT 0,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Documents table (SIMPLIFIED - only essential columns)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anon_session_id UUID REFERENCES anon_sessions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR anon_session_id IS NOT NULL)
);

-- No additional column migrations needed for simplified schema

-- 5. Canonical References table (reference database)
CREATE TABLE IF NOT EXISTS canonical_references (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  authors TEXT[],
  publication_year INTEGER,
  doi TEXT,
  external_id TEXT,
  pdf_url TEXT,
  abstract TEXT,
  source TEXT CHECK (source IN ('crossref', 'semantic_scholar', 'arxiv', 'manual')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to canonical_references if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='canonical_references' AND column_name='external_id') THEN
    ALTER TABLE canonical_references ADD COLUMN external_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='canonical_references' AND column_name='pdf_url') THEN
    ALTER TABLE canonical_references ADD COLUMN pdf_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='canonical_references' AND column_name='abstract') THEN
    ALTER TABLE canonical_references ADD COLUMN abstract TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='canonical_references' AND column_name='source') THEN
    ALTER TABLE canonical_references ADD COLUMN source TEXT;
  END IF;
END $$;

-- 6. Document References table (SIMPLIFIED - only essential columns)
CREATE TABLE IF NOT EXISTS document_references (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  raw_citation_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- No additional column migrations needed for simplified schema

-- 7. Processing Jobs table (for background tasks)
CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('parse_references', 'match_references', 'verify_integrity')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. User Usage table (for analytics and limits)
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  anon_session_id UUID REFERENCES anon_sessions(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('upload', 'verify', 'export', 'api_call')),
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR anon_session_id IS NOT NULL)
);

-- 9. Audit Feedback table (user feedback on AI results)
CREATE TABLE IF NOT EXISTS audit_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_reference_id UUID NOT NULL REFERENCES document_references(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anon_session_id UUID REFERENCES anon_sessions(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('accurate', 'inaccurate', 'misleading', 'missing_context')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR anon_session_id IS NOT NULL)
);

-- Create indexes for better query performance (wrapped to handle missing columns)
DO $$ 
BEGIN
  -- Documents indexes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='anon_session_id') THEN
    CREATE INDEX IF NOT EXISTS idx_documents_anon_session_id ON documents(anon_session_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='status') THEN
    CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
  END IF;
  
  -- Document references indexes
  CREATE INDEX IF NOT EXISTS idx_document_references_document_id ON document_references(document_id);
  CREATE INDEX IF NOT EXISTS idx_document_references_canonical_id ON document_references(canonical_reference_id);
  
  -- Canonical references indexes
  CREATE INDEX IF NOT EXISTS idx_canonical_references_doi ON canonical_references(doi);
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='canonical_references' AND column_name='external_id') THEN
    CREATE INDEX IF NOT EXISTS idx_canonical_references_external_id ON canonical_references(external_id);
  END IF;
  
  -- User plans index
  CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON user_plans(user_id);
  
  -- User usage indexes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_usage' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);
  END IF;
  
  -- Audit feedback index
  CREATE INDEX IF NOT EXISTS idx_audit_feedback_reference_id ON audit_feedback(document_reference_id);
END $$;

-- Row Level Security (RLS) Policies
-- Note: Policies are created after all columns are added to avoid reference errors

-- Enable RLS on all tables (only if not already enabled)
DO $$ 
BEGIN
  -- Enable RLS only if table exists and RLS is not already enabled
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles') THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_plans') THEN
    ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'anon_sessions') THEN
    ALTER TABLE anon_sessions ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'documents') THEN
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'canonical_references') THEN
    ALTER TABLE canonical_references ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'document_references') THEN
    ALTER TABLE document_references ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'processing_jobs') THEN
    ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_usage') THEN
    ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'audit_feedback') THEN
    ALTER TABLE audit_feedback ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist to avoid conflicts (must happen before columns are checked)
DO $$ 
BEGIN
  -- Drop all policies first
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can view own plan" ON user_plans;
  DROP POLICY IF EXISTS "Users can view own documents" ON documents;
  DROP POLICY IF EXISTS "Users can create own documents" ON documents;
  DROP POLICY IF EXISTS "Users can update own documents" ON documents;
  DROP POLICY IF EXISTS "Anon users can view session documents" ON documents;
  DROP POLICY IF EXISTS "Anon users can create session documents" ON documents;
  DROP POLICY IF EXISTS "Users can view own document references" ON document_references;
  DROP POLICY IF EXISTS "Users can create document references" ON document_references;
  DROP POLICY IF EXISTS "Users can update own document references" ON document_references;
  DROP POLICY IF EXISTS "Anon users can view session document references" ON document_references;
  DROP POLICY IF EXISTS "Anon users can create session document references" ON document_references;
  DROP POLICY IF EXISTS "Anyone can read canonical references" ON canonical_references;
  DROP POLICY IF EXISTS "Users can view own feedback" ON audit_feedback;
  DROP POLICY IF EXISTS "Users can create feedback" ON audit_feedback;
EXCEPTION
  WHEN OTHERS THEN NULL; -- Ignore errors if policies don't exist
END $$;

-- Create all policies (wrapped to ensure columns exist)
DO $$ 
BEGIN
  -- Profiles: Users can read and update their own profile
  CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

  CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

  -- User Plans: Users can view their own plan
  CREATE POLICY "Users can view own plan" ON user_plans
    FOR SELECT USING (auth.uid() = user_id);

  -- Documents: Only create if user_id column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='user_id') THEN
    CREATE POLICY "Users can view own documents" ON documents
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can create own documents" ON documents
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own documents" ON documents
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- Anonymous users can view and create documents with their session
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='anon_session_id') THEN
    CREATE POLICY "Anon users can view session documents" ON documents
      FOR SELECT USING (anon_session_id IS NOT NULL);

    CREATE POLICY "Anon users can create session documents" ON documents
      FOR INSERT WITH CHECK (anon_session_id IS NOT NULL);
  END IF;

  -- Document References: Users can view references from their documents
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='user_id') THEN
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
  END IF;

  -- Anon users can view references from their session documents
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='anon_session_id') THEN
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
  END IF;

  -- Canonical References: Public read access
  CREATE POLICY "Anyone can read canonical references" ON canonical_references
    FOR SELECT USING (true);

  -- Audit Feedback: Users can create and view their own feedback
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_feedback' AND column_name='user_id') THEN
    CREATE POLICY "Users can view own feedback" ON audit_feedback
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can create feedback" ON audit_feedback
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN 
    RAISE NOTICE 'Policy creation error: %', SQLERRM;
END $$;

-- Functions to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_plans_updated_at BEFORE UPDATE ON user_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canonical_references_updated_at BEFORE UPDATE ON canonical_references
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_references_updated_at BEFORE UPDATE ON document_references
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  INSERT INTO public.user_plans (user_id, plan_type, monthly_limit)
  VALUES (NEW.id, 'free', 3);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile and plan on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to reset monthly usage counts
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE user_plans
  SET 
    monthly_used = 0,
    period_start = NOW(),
    period_end = NOW() + INTERVAL '30 days'
  WHERE period_end < NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
