import { NextResponse } from 'next/server';

export async function GET() {
  const checks = {
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    openai_key: !!process.env.OPENAI_API_KEY,
    environment: process.env.NODE_ENV,
    worker_path_exists: !!process.env.NODE_MODULES_DIR,
  };

  return NextResponse.json({
    status: 'ok',
    checks,
    node_env: process.env.NODE_ENV,
  });
}
