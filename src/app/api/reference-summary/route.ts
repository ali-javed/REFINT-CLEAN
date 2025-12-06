import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

interface Review {
  score: number;
  justification: string;
  analyzed?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ summary: null, message: 'OpenAI key missing' });
    }

    const { reviews } = await req.json();
    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return NextResponse.json({ summary: null, message: 'No reviews provided' });
    }

    const limited = reviews.slice(0, 10) as Review[]; // cap for prompt size

    const prompt = `You are summarizing reference integrity checks.
Each item has a score (1-10) and a short justification.
Provide a concise overall verdict (2-3 sentences) noting strengths and risks, and a one-line recommendation.

Reviews:\n${limited
      .map((r: Review, i: number) => `${i + 1}. Score ${r.score}/10 - ${r.justification}`)
      .join('\n')}`;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.responses.create({
      model: 'gpt-4o-mini',
      input: prompt,
      max_output_tokens: 180,
    });

    const text = completion.output_text || null;
    return NextResponse.json({ summary: text });
  } catch (err) {
    console.error('Error in /api/reference-summary:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ summary: null, error: message }, { status: 500 });
  }
}
