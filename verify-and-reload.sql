-- Check if documents table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'documents'
) as table_exists;

-- Check all columns in documents table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'documents'
ORDER BY ordinal_position;

-- Force complete PostgREST restart
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE usename = 'authenticator';

-- Reload schema
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
