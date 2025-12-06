# Copilot Instructions for refint

## Project Overview

**refint** is a Next.js 16 application that extracts and verifies reference lists from academic PDFs. Users upload a PDF, the app parses its references section using `pdf-parse`, stores them in Supabase, and displays them on a results page.

### Architecture

**Data Flow:**
1. User uploads PDF via `UploadForm` (client component) → 2. API route `/api/extract-references` processes file (server) → 3. References stored in Supabase table `references_list` → 4. Results displayed at `/references/[documentId]`

**Key Components:**
- `src/components/UploadForm.tsx` – Client component handling file selection and API calls
- `src/app/api/extract-references/route.ts` – Server-side PDF parsing and reference extraction
- `src/app/references/[documentId]/page.tsx` – Async server component displaying stored references
- `src/utils/supabase/server.ts` – Supabase client initialization (requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## Critical Patterns & Conventions

### PDF Parsing Strategy
The reference extraction uses **heuristic line grouping** in `extractReferencesFromPdf()`:
- Detects "References" section heading (case-insensitive, with fallback to last occurrence)
- Splits into lines and groups multi-line references using three patterns: `"Author, X."` style, `[1]` numbered citations, or `1.` numbered style
- Returns array of concatenated reference strings
- **Keep parsing logic conservative** – add safety checks before modifying detection regexes

### Async Params in Dynamic Routes
`src/app/references/[documentId]/page.tsx` receives `props.params` as a **Promise** (Next.js 16 convention):
```tsx
const resolvedParams = await props.params;
const documentId = resolvedParams?.documentId;
```
Always `await` before accessing dynamic route parameters.

### Supabase Integration
- Schema: `references_list` table with columns `id`, `document_id`, `raw_reference`, `created_at`
- Uses server-side client via `getSupabaseClient()` (environment vars required)
- Batch insert in `route.ts`: references mapped to rows with `document_id` (UUID) and `raw_reference`
- Query fetched in `ReferencesPage` using `.select()` and `.eq()` filters

### React Compiler Enabled
`next.config.ts` sets `reactCompiler: true`. This optimizes re-renders automatically—write components normally but understand memoization happens at build time.

## Development Workflows

**Run Dev Server:**
```bash
npm run dev
```
Starts Next.js on `http://localhost:3000`. Hot reload enabled.

**Build & Start:**
```bash
npm run build
npm start
```

**Lint:**
```bash
npm run lint
```
Uses ESLint with Next.js config.

## Important Notes

- **PDF Library Handling:** `pdf-parse` exports inconsistently; `route.ts` uses defensive imports with fallbacks (`default`, `PDFParse`, or direct export)
- **Error Messaging:** UI surfaces both `error` and `message` fields from API responses—keep error messages user-friendly
- **Dynamic Document IDs:** Generated via `crypto.randomUUID()` in the API; no database auto-increment
- **Tailwind 4 + PostCSS:** Styling uses Tailwind v4 with React Compiler; check `postcss.config.mjs` for custom configuration
