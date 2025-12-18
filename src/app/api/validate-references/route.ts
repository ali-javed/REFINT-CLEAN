// src/app/api/validate-references/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/utils/supabase/client';
import { updateDocumentStatus, calculateDocumentIntegrityScore } from '@/utils/database/operations';

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json();
    
    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }
    
    console.log(`[validate-references] Starting validation for document ${documentId}`);
    
    // Update status to processing
    await updateDocumentStatus(documentId, 'processing');
    
    const supabase = getSupabaseServiceClient();
    
    // Fetch all references for this document
    const { data: references, error } = await supabase
      .from('document_references')
      .select('*')
      .eq('document_id', documentId)
      .order('position_in_doc', { ascending: true });
    
    if (error) {
      throw new Error(`Failed to fetch references: ${error.message}`);
    }
    
    if (!references || references.length === 0) {
      throw new Error('No references found for this document');
    }
    
    console.log(`[validate-references] Found ${references.length} references to validate`);
    
    // Process each reference with AI
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    for (const docRef of references) {
      try {
        // STEP 1: Existence Check
        const existencePrompt = `Analyze this academic reference and rate its existence/completeness on a scale of 0-100. Consider factors like:
- Does it have proper author names?
- Is there a clear title?
- Does it include year of publication?
- Is it properly formatted?

Reference: ${docRef.raw_citation_text}

Respond in JSON format: {"score": <0-100>, "explanation": "<brief 1-2 sentence explanation>"}`;

        const existenceResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'You are an academic reference validation assistant.' },
              { role: 'user', content: existencePrompt },
            ],
            temperature: 0.3,
          }),
        });
        
        let existenceScore = null;
        let existenceCheck = null;
        
        if (existenceResponse.ok) {
          const data = await existenceResponse.json();
          let content = data.choices?.[0]?.message?.content;
          
          if (content) {
            try {
              content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
              const result = JSON.parse(content);
              existenceScore = Math.max(0, Math.min(100, result.score || 50));
              existenceCheck = result.explanation || 'Existence check completed';
              console.log(`[validate-references] Existence check for ${docRef.id}: ${existenceScore}/100`);
            } catch (parseError) {
              console.error('[validate-references] Failed to parse existence response:', parseError);
            }
          }
        }
        
        // STEP 2: Context Integrity Check (only if context exists)
        let contextIntegrityScore = null;
        let contextIntegrityReview = null;
        
        if (docRef.context_before || docRef.context_after) {
          const context = `${docRef.context_before || ''} [CITATION: ${docRef.raw_citation_text}] ${docRef.context_after || ''}`;
          
          console.log(`[validate-references] Performing context integrity check for ${docRef.id}`);
          
          const contextPrompt = `You are an academic paper reviewer. Analyze how this paper is being referenced in context.

Context: ${context}

Reference Citation: ${docRef.raw_citation_text}

Based on the citation and context:
1. Give 2-3 brief comments on whether the authors appear to be referencing the paper appropriately
2. Assess if the citation seems relevant to the context in which it's used
3. Rate the alignment between the context and what this type of reference would typically support

Respond in JSON format: {"score": <0-100>, "comments": "<2-3 sentences>"}`;

          const contextResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'You are an academic paper reviewer providing concise assessments.' },
                { role: 'user', content: contextPrompt },
              ],
              temperature: 0.4,
            }),
          });
          
          if (contextResponse.ok) {
            const data = await contextResponse.json();
            let content = data.choices?.[0]?.message?.content;
            
            if (content) {
              try {
                content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
                const result = JSON.parse(content);
                contextIntegrityScore = Math.max(0, Math.min(100, result.score || 50));
                contextIntegrityReview = result.comments || 'Context integrity check completed';
                console.log(`[validate-references] Context integrity for ${docRef.id}: ${contextIntegrityScore}/100`);
              } catch (parseError) {
                console.error('[validate-references] Failed to parse context integrity response:', parseError);
              }
            }
          }
        } else {
          console.log(`[validate-references] Skipping context integrity check for ${docRef.id} (no context)`);
        }
        
        // Update reference with scores
        await (supabase as any)
          .from('document_references')
          .update({
            existence_score: existenceScore,
            existence_check: existenceCheck,
            context_integrity_score: contextIntegrityScore,
            context_integrity_review: contextIntegrityReview,
            integrity_score: contextIntegrityScore || existenceScore,
            ai_review: contextIntegrityReview || existenceCheck,
          })
          .eq('id', docRef.id);
        
      } catch (aiError) {
        console.error(`[validate-references] AI validation failed for reference ${docRef.id}:`, aiError);
      }
    }
    
    // Generate overall AI review summary
    console.log('[validate-references] Generating overall AI review summary...');
    let overallAiReview = null;
    
    try {
      const { data: allReviews, error: fetchError } = await supabase
        .from('document_references')
        .select('raw_citation_text, existence_score, existence_check, context_integrity_score, context_integrity_review')
        .eq('document_id', documentId);
      
      if (!fetchError && allReviews && allReviews.length > 0) {
        const reviewsSummary = allReviews
          .map((ref: any, idx: number) => {
            let summary = `\n${idx + 1}. ${ref.raw_citation_text}\n`;
            
            if (ref.existence_score !== null) {
              summary += `   Existence Score: ${ref.existence_score}/100\n`;
              if (ref.existence_check) {
                summary += `   Existence Check: ${ref.existence_check}\n`;
              }
            }
            
            if (ref.context_integrity_score !== null) {
              summary += `   Context Integrity Score: ${ref.context_integrity_score}/100\n`;
              if (ref.context_integrity_review) {
                summary += `   Context Integrity Review: ${ref.context_integrity_review}\n`;
              }
            }
            
            return summary;
          })
          .join('\n');
        
        const summaryPrompt = `You are an academic journal reviewer. Below are the individual reference integrity reviews for a research document. Each reference has been analyzed for existence/formatting and context integrity.

${reviewsSummary}

Based on these individual reviews, provide a concise overall summary (2-3 paragraphs) of the reference integrity for this document. Address:
1. Overall quality of references (formatting, completeness)
2. How well references support their usage context
3. Any patterns or concerns across the reference list
4. Final recommendation

Response format: Plain text summary (no JSON, no special formatting).`;

        const summaryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an academic journal reviewer providing concise, professional assessments of reference integrity.' },
              { role: 'user', content: summaryPrompt },
            ],
            temperature: 0.5,
          }),
        });
        
        if (summaryResponse.ok) {
          const data = await summaryResponse.json();
          overallAiReview = data.choices?.[0]?.message?.content?.trim() || null;
          console.log(`[validate-references] Generated overall AI review (${overallAiReview?.length || 0} chars)`);
        }
      }
    } catch (summaryError) {
      console.error('[validate-references] Error generating overall AI review:', summaryError);
    }
    
    // Calculate overall score
    const overallScore = await calculateDocumentIntegrityScore(documentId);
    console.log(`[validate-references] Overall document integrity score: ${overallScore}`);
    
    // Update document status
    await updateDocumentStatus(documentId, 'completed', overallScore || undefined, overallAiReview);
    
    console.log(`[validate-references] Successfully validated document ${documentId}`);
    
    return NextResponse.json({
      documentId,
      referencesValidated: references.length,
      overallScore,
      status: 'completed',
    }, { status: 200 });
    
  } catch (err) {
    console.error('[validate-references] Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
