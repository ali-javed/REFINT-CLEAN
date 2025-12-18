-- Add arXiv metadata and integrity fields to document_references
alter table public.document_references
  add column if not exists arxiv_id text,
  add column if not exists arxiv_title text,
  add column if not exists arxiv_link text,
  add column if not exists arxiv_pdf_url text,
  add column if not exists arxiv_published_at text,
  add column if not exists arxiv_integrity_score integer,
  add column if not exists arxiv_integrity_review text;


