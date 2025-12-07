-- Make file_size nullable to bypass schema cache issues
ALTER TABLE documents ALTER COLUMN file_size DROP NOT NULL;

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'documents'
AND column_name = 'file_size';

-- Force schema reload
NOTIFY pgrst, 'reload schema';
