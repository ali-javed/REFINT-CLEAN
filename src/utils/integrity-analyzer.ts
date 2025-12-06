import OpenAI from 'openai';

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  return openai;
}

interface IntegrityReview {
  score: number; // 1-10
  justification: string;
  error?: string;
}

export async function analyzeReferenceIntegrity(
  reference: string,
  uploadedPaperContext: string,
  fullPaperAbstract: string
): Promise<IntegrityReview> {
  const client = getOpenAIClient();
  
  if (!client) {
    return {
      score: 10,
      justification: 'Paper found in repository',
    };
  }

  try {
    const prompt = `You are a paper reviewer. Your job is to assess if a reference used in a paper is accurate and holds the spirit of the referred paper.

REFERENCE FROM UPLOADED PAPER:
"${reference}"

CONTEXT WHERE REFERENCE WAS CITED (100 words before and after):
"${uploadedPaperContext}"

ABSTRACT OF THE REFERENCED PAPER:
"${fullPaperAbstract}"

Please evaluate:
1. Is the reference accurately cited?
2. Does the citation context match the spirit and findings of the referenced paper?
3. Is the reference being used appropriately in the uploaded paper?

Provide:
- An integrity score between 1 and 10 (1 = completely inaccurate/misused, 10 = perfectly accurate)
- A brief justification (2-3 sentences) explaining your score

Respond in this exact JSON format:
{
  "score": <number 1-10>,
  "justification": "<your explanation>"
}`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text from response
    const responseText =
      response.choices[0]?.message?.content || '';

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        score: 10,
        justification: 'Paper found in repository',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate score is between 1-10
    const score = Math.max(1, Math.min(10, parseInt(parsed.score) || 10));

    return {
      score,
      justification: parsed.justification || 'Paper found in repository',
    };
  } catch (err) {
    console.error('Error analyzing reference integrity:', err);
    return {
      score: 10,
      justification: 'Paper found in repository',
    };
  }
}
