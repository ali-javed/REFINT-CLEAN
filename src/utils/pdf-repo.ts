import fs from 'fs';
import path from 'path';
import { extractText } from 'unpdf';

/**
 * Get list of available PDFs in the papers folder
 */
export function getAvailablePdfs(): string[] {
  const papersPath = path.join(process.cwd(), 'public', 'papers');
  
  try {
    const files = fs.readdirSync(papersPath);
    return files.filter((f) => f.toLowerCase().endsWith('.pdf'));
  } catch (err) {
    console.error('Error reading papers folder:', err);
    return [];
  }
}

/**
 * Extract abstract/summary from a PDF file in the repo
 */
export async function extractPdfSummary(fileName: string): Promise<string | null> {
  try {
    const papersPath = path.join(process.cwd(), 'public', 'papers');
    const filePath = path.join(papersPath, fileName);
    
    // Security check: ensure file is within papers folder
    if (!path.resolve(filePath).startsWith(path.resolve(papersPath))) {
      return null;
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return null;
    }

    // Extract PDF text
    const buffer = fs.readFileSync(filePath);
    const uint8Array = new Uint8Array(buffer);
    const result = await extractText(uint8Array);
    // unpdf returns {totalPages: number, text: string[]} - join pages into single string
    const rawText = Array.isArray(result?.text) ? result.text.join('\n') : (typeof result === 'string' ? result : '');

    if (!rawText.trim()) {
      return null;
    }

    // Extract abstract - look for "Abstract" section
    const text = rawText.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, ' ');
    const lower = text.toLowerCase();
    
    const abstractIndex = lower.indexOf('abstract');
    if (abstractIndex === -1) {
      // If no abstract, return first 500 characters
      return text.substring(0, 500).trim();
    }

    // Extract text after "Abstract" heading (usually 200-400 words)
    let abstractStart = abstractIndex + 'abstract'.length;
    
    // Skip the heading and find the actual abstract content
    const headingEnd = text.indexOf('\n', abstractStart);
    if (headingEnd !== -1) {
      abstractStart = headingEnd + 1;
    }

    // Find the end of abstract (usually marked by "Introduction" or "1." or similar)
    const introIndex = lower.indexOf('introduction', abstractStart);
    const methodsIndex = lower.indexOf('methods', abstractStart);
    const keywordsIndex = lower.indexOf('keywords', abstractStart);
    
    let abstractEnd = text.length;
    
    if (introIndex !== -1) {
      abstractEnd = Math.min(abstractEnd, introIndex);
    }
    if (methodsIndex !== -1) {
      abstractEnd = Math.min(abstractEnd, methodsIndex);
    }
    if (keywordsIndex !== -1) {
      abstractEnd = Math.min(abstractEnd, keywordsIndex);
    }

    const abstractText = text
      .substring(abstractStart, abstractEnd)
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 800); // Limit to 800 characters

    return abstractText || null;
  } catch (err) {
    console.error('Error extracting PDF summary:', err);
    return null;
  }
}

/**
 * Find matching PDF in repo for a reference
 * Only returns a match if reference keywords actually match the paper
 */
export function findMatchingPdf(reference: string): string | null {
  const pdfs = getAvailablePdfs();
  
  if (pdfs.length === 0) return null;

  const refLower = reference.toLowerCase();
  
  // Define keyword groups for different papers
  const paperKeywords = {
    'mad-river': {
      keywords: [
        'hydrological',
        'suspended sediment',
        'mad river',
        'watershed',
        'time series clustering',
      ],
      requiredMatches: 2, // Must match at least 2 keywords
      filePattern: /mad river|hydrological/i,
    },
  };

  // Check all paper keyword groups
  for (const [, config] of Object.entries(paperKeywords)) {
    let matchCount = 0;
    for (const keyword of config.keywords) {
      if (refLower.includes(keyword)) {
        matchCount++;
      }
    }

    // If enough keywords match, look for the corresponding PDF
    if (matchCount >= config.requiredMatches) {
      for (const pdf of pdfs) {
        if (config.filePattern.test(pdf)) {
          console.log(
            `[pdf-repo] Reference matched to PDF "${pdf}" (${matchCount} keywords matched)`
          );
          return pdf;
        }
      }
    }
  }

  // No match found - return null so "Full paper not found" is shown
  console.log(
    `[pdf-repo] No keyword match found for reference. Showing "not found".`
  );
  return null;
}
