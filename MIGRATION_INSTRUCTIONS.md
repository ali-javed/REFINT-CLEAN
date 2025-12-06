# Database Migration Instructions

## Adding Context Columns to references_list Table

To add the `context_before` and `context_after` columns to your Supabase `references_list` table:

### Option 1: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **SQL Editor**
3. Create a new query and copy-paste the SQL from `migrations/001_add_context_columns.sql`
4. Run the query

### Option 2: Using Supabase CLI

```bash
# If you haven't installed Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Run the migration
supabase db push
```

### Option 3: Manual SQL

Execute the following SQL in your Supabase SQL Editor:

```sql
-- Add context columns to references_list table
ALTER TABLE public.references_list
ADD COLUMN IF NOT EXISTS context_before TEXT,
ADD COLUMN IF NOT EXISTS context_after TEXT;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_references_list_context_before 
  ON public.references_list USING GIN (to_tsvector('english', context_before));
CREATE INDEX IF NOT EXISTS idx_references_list_context_after 
  ON public.references_list USING GIN (to_tsvector('english', context_after));
```

## Schema Update

The `references_list` table will now have:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| document_id | UUID | Reference to document |
| raw_reference | TEXT | The full reference text |
| context_before | TEXT (NEW) | Previous 4 sentences from PDF body where reference is cited |
| context_after | TEXT (NEW) | Next 4 sentences from PDF body where reference is cited |
| created_at | TIMESTAMP | Creation timestamp |

## What's New

The API now extracts:
- **Previous 4 sentences**: Context before the citation appears in the document
- **Next 4 sentences**: Context after the citation appears in the document

This helps understand how each reference is used in the paper.
