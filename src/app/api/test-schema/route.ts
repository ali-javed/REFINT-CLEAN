import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    // Try to query the documents table to see what columns exist
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .limit(1);
    
    if (error) {
      return NextResponse.json({
        error: error.message,
        details: error,
        hint: 'This tells us what columns Supabase thinks exist'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      sampleData: data,
      message: 'If this works, check the structure of the returned data'
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined
    }, { status: 500 });
  }
}
